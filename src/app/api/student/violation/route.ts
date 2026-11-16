import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';
import { checkAnswer } from '@/lib/answerChecker';
import { liveHeartbeats } from '@/lib/liveProctoringState';

export async function POST(request: Request) {
  try {
    const { attempt_id, device_token, type, duration_ms, meta } = await request.json();

    if (!attempt_id || !device_token || !type) {
      return NextResponse.json({ error: 'Urinish yoki qoidabuzarlik turi yetarli emas' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Verify attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('*, tests(*)')
      .eq('id', attempt_id)
      .eq('device_token', device_token)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: 'Urinish topilmadi' }, { status: 403 });
    }

    if (attempt.status !== 'in_progress') {
      return NextResponse.json({
        auto_submitted: true,
        status: attempt.status,
      });
    }

    const test = attempt.tests;
    const maxViolations = test.max_violations || 3;

    // 2. Insert violation record
    await supabase.from('violations').insert({
      attempt_id: attempt.id,
      type,
      duration_ms: Number(duration_ms) || 0,
      meta: meta || {},
    });

    const currentHb = liveHeartbeats.get(attempt.id);
    liveHeartbeats.set(attempt.id, {
      lastPing: Date.now(),
      currentQuestionIndex: currentHb?.currentQuestionIndex,
      isAway: type === 'tab_switch' || type === 'window_blur' || type === 'fullscreen_exit',
    });

    // 3. Count total violations for this attempt
    const { count: violationCount } = await supabase
      .from('violations')
      .select('*', { count: 'exact', head: true })
      .eq('attempt_id', attempt.id);

    const totalViolations = violationCount || 1;

    // 4. Check if limit reached -> AUTO-SUBMIT
    if (totalViolations >= maxViolations) {
      // Perform server-side grading and finalize
      const { data: questions } = await supabase
        .from('questions')
        .select(`
          id,
          type,
          points,
          accepted_answers,
          numeric_tolerance,
          question_options (id, is_correct)
        `)
        .eq('test_id', test.id);

      const { data: studentAnswers } = await supabase
        .from('answers')
        .select('*')
        .eq('attempt_id', attempt.id);

      const answersMap = new Map((studentAnswers || []).map((a) => [a.question_id, a]));
      let totalScore = 0;
      let totalMaxScore = 0;

      if (questions) {
        for (const q of questions) {
          const qPoints = Number(q.points) || 1;
          totalMaxScore += qPoints;
          const ans = answersMap.get(q.id);
          const val = ans?.value || '';
          let earned = 0;

          if (q.type === 'multiple_choice') {
            const correctOpt = q.question_options?.find((o: { is_correct: boolean }) => o.is_correct);
            if (correctOpt && val && val === correctOpt.id) {
              earned = qPoints;
            }
          } else if (q.type === 'open_auto') {
            if (checkAnswer(val, q.accepted_answers || [], q.numeric_tolerance || 0)) {
              earned = qPoints;
            }
          }

          totalScore += earned;

          await supabase.from('answers').upsert({
            attempt_id: attempt.id,
            question_id: q.id,
            value: val,
            auto_score: earned,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'attempt_id, question_id' });
        }
      }

      await supabase
        .from('attempts')
        .update({
          status: 'auto_submitted',
          submitted_at: new Date().toISOString(),
          score: totalScore,
          max_score: totalMaxScore,
        })
        .eq('id', attempt.id);

      return NextResponse.json({
        auto_submitted: true,
        violation_count: totalViolations,
        max_violations: maxViolations,
        score: test.show_results_immediately ? totalScore : null,
        max_score: totalMaxScore,
        status: 'auto_submitted',
      });
    }

    return NextResponse.json({
      auto_submitted: false,
      violation_count: totalViolations,
      max_violations: maxViolations,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serverda xatolik yuz berdi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
