import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';
import { seededShuffle } from '@/lib/shuffle';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const attemptId = searchParams.get('attempt_id');
    const deviceToken = searchParams.get('device_token');

    if (!attemptId || !deviceToken) {
      return NextResponse.json({ error: 'Urinish ma\'lumotlari to\'liq emas' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Fetch attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('*, tests(*)')
      .eq('id', attemptId)
      .eq('device_token', deviceToken)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: 'Urinish topilmadi yoki token noto\'g\'ri' }, { status: 404 });
    }

    const test = attempt.tests;
    const now = new Date();
    const deadline = new Date(attempt.deadline_at);

    // If attempt is already submitted
    if (attempt.status === 'submitted' || attempt.status === 'auto_submitted') {
      return NextResponse.json({
        isFinished: true,
        status: attempt.status,
        score: test.show_results_immediately ? attempt.score : null,
        max_score: attempt.max_score,
      });
    }

    // Check authoritative deadline
    if (now >= deadline) {
      await supabase
        .from('attempts')
        .update({
          status: 'submitted',
          submitted_at: now.toISOString(),
        })
        .eq('id', attempt.id);

      return NextResponse.json({
        timeUp: true,
        isFinished: true,
        status: 'submitted',
        score: test.show_results_immediately ? attempt.score : null,
        max_score: attempt.max_score,
      });
    }

    const remainingSeconds = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 1000));

    // 2. Fetch raw questions and options
    const { data: questions, error: qError } = await supabase
      .from('questions')
      .select(`
        id,
        type,
        prompt,
        image_url,
        points,
        order_index,
        question_options (
          id,
          text,
          order_index
        )
      `)
      .eq('test_id', test.id)
      .order('order_index', { ascending: true });

    if (qError) {
      return NextResponse.json({ error: qError.message }, { status: 500 });
    }

    // 3. Shuffle questions & options based on attempt.seed
    let formattedQuestions = questions.map((q) => {
      let options = (q.question_options || []).map((opt: { id: string; text: string; order_index: number }) => ({
        id: opt.id,
        text: opt.text,
        order_index: opt.order_index,
      }));

      if (test.shuffle_options && options.length > 0) {
        // Deterministic option shuffle using seed + question order
        options = seededShuffle(options, attempt.seed + q.order_index * 17);
      }

      return {
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        image_url: q.image_url,
        points: q.points,
        order_index: q.order_index,
        options,
      };
    });

    if (test.shuffle_questions) {
      formattedQuestions = seededShuffle(formattedQuestions, attempt.seed);
    }

    // 4. Fetch saved answers for this attempt
    const { data: savedAnswers } = await supabase
      .from('answers')
      .select('question_id, value, photo_url')
      .eq('attempt_id', attempt.id);

    const answersMap: Record<string, { value: string; photo_url?: string | null }> = {};
    if (savedAnswers) {
      for (const a of savedAnswers) {
        answersMap[a.question_id] = { value: a.value, photo_url: a.photo_url };
      }
    }

    // 5. Fetch violation count
    const { count: violationCount } = await supabase
      .from('violations')
      .select('*', { count: 'exact', head: true })
      .eq('attempt_id', attempt.id);

    return NextResponse.json({
      attempt_id: attempt.id,
      student_name: attempt.student_name,
      test_title: test.title,
      remaining_seconds: remainingSeconds,
      max_violations: test.max_violations,
      require_fullscreen: test.require_fullscreen,
      violations_count: violationCount || 0,
      questions: formattedQuestions,
      saved_answers: answersMap,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serverda xatolik yuz berdi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
