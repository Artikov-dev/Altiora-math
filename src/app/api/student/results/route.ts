import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const attemptId = searchParams.get('attempt_id');
    const deviceToken = searchParams.get('device_token');

    if (!attemptId || !deviceToken) {
      return NextResponse.json({ error: 'Urinish yoki token yetarli emas' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Fetch attempt and associated test
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('*, tests(*)')
      .eq('id', attemptId)
      .eq('device_token', deviceToken)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: 'Urinish topilmadi' }, { status: 404 });
    }

    const test = attempt.tests;
    if (!test.show_results_immediately) {
      return NextResponse.json({
        allowed: false,
        message: 'To\'g\'ri javoblar o\'qituvchi tomonidan yashirilgan',
      });
    }

    // 2. Fetch questions with options
    const { data: questions, error: qError } = await supabase
      .from('questions')
      .select('*, question_options(*)')
      .eq('test_id', test.id)
      .order('order_index', { ascending: true });

    if (qError) {
      return NextResponse.json({ error: qError.message }, { status: 500 });
    }

    // 3. Fetch student's submitted answers
    const { data: answers } = await supabase
      .from('answers')
      .select('*')
      .eq('attempt_id', attemptId);

    const answersMap = new Map((answers || []).map((a) => [a.question_id, a]));

    const reviewQuestions = (questions || []).map((q) => {
      const studentAns = answersMap.get(q.id);
      return {
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        image_url: q.image_url,
        points: q.points,
        options: (q.question_options || []).sort(
          (a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index
        ),
        student_answer: studentAns?.value || '',
        student_photo_url: studentAns?.photo_url || null,
        auto_score: studentAns?.auto_score || 0,
        manual_score: studentAns?.manual_score ?? null,
        accepted_answers: q.accepted_answers,
      };
    });

    return NextResponse.json({
      allowed: true,
      test_title: test.title,
      questions: reviewQuestions,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serverda xatolik yuz berdi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
