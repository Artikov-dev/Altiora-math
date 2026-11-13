import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';
import { checkAnswer } from '@/lib/answerChecker';

export async function POST(request: Request) {
  try {
    const { attempt_id, device_token, reason } = await request.json();

    if (!attempt_id || !device_token) {
      return NextResponse.json({ error: 'Urinish ma\'lumotlari to\'liq emas' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Fetch attempt and associated test
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('*, tests(*)')
      .eq('id', attempt_id)
      .eq('device_token', device_token)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: 'Urinish topilmadi yoki ruxsat yo\'q' }, { status: 404 });
    }

    // If already submitted, return current state
    if (attempt.status === 'submitted' || attempt.status === 'auto_submitted') {
      return NextResponse.json({
        success: true,
        already_submitted: true,
        status: attempt.status,
        score: attempt.tests.show_results_immediately ? attempt.score : null,
        max_score: attempt.max_score,
      });
    }

    const test = attempt.tests;

    // 2. Fetch all test questions with correct answers
    const { data: questions, error: qError } = await supabase
      .from('questions')
      .select(`
        id,
        type,
        points,
        accepted_answers,
        numeric_tolerance,
        question_options (
          id,
          is_correct
        )
      `)
      .eq('test_id', test.id);

    if (qError || !questions) {
      return NextResponse.json({ error: 'Savollarni yuklab bo\'lmadi' }, { status: 500 });
    }

    // 3. Fetch student saved answers
    const { data: studentAnswers } = await supabase
      .from('answers')
      .select('*')
      .eq('attempt_id', attempt.id);

    const answersMap = new Map((studentAnswers || []).map((a) => [a.question_id, a]));

    let totalScore = 0;
    let totalMaxScore = 0;

    // 4. Grade each question
    for (const q of questions) {
      const qPoints = Number(q.points) || 1;
      totalMaxScore += qPoints;

      const ans = answersMap.get(q.id);
      const studentValue = ans?.value || '';
      let earned = 0;

      if (q.type === 'multiple_choice') {
        const correctOpt = q.question_options?.find((o: { is_correct: boolean }) => o.is_correct);
        if (correctOpt && studentValue && studentValue === correctOpt.id) {
          earned = qPoints;
        }
      } else if (q.type === 'open_auto') {
        const isCorrect = checkAnswer(studentValue, q.accepted_answers || [], q.numeric_tolerance || 0);
        if (isCorrect) {
          earned = qPoints;
        }
      } else if (q.type === 'open_manual') {
        // Manual questions are graded later by the teacher
        earned = 0;
      }

      totalScore += earned;

      // Update or insert auto_score into answers table
      await supabase
        .from('answers')
        .upsert({
          attempt_id: attempt.id,
          question_id: q.id,
          value: studentValue,
          auto_score: earned,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'attempt_id, question_id' });
    }

    // 5. Finalize attempt status
    const finalStatus = reason === 'violations' ? 'auto_submitted' : 'submitted';
    const submittedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('attempts')
      .update({
        status: finalStatus,
        submitted_at: submittedAt,
        score: totalScore,
        max_score: totalMaxScore,
      })
      .eq('id', attempt.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      status: finalStatus,
      score: test.show_results_immediately ? totalScore : null,
      max_score: totalMaxScore,
      show_results: test.show_results_immediately,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serverda xatolik yuz berdi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
