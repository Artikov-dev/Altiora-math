import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export async function GET(
  request: Request,
  { params }: { params: { id: string; attemptId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 401 });
    }

    // 1. Verify test ownership
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('id, title, code, duration_minutes, max_violations')
      .eq('id', params.id)
      .eq('teacher_id', user.id)
      .single();

    if (testError || !test) {
      return NextResponse.json({ error: 'Test topilmadi' }, { status: 404 });
    }

    // 2. Fetch attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('*')
      .eq('id', params.attemptId)
      .eq('test_id', params.id)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: 'Urinish topilmadi' }, { status: 404 });
    }

    // 3. Fetch questions with options and answers
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select(`
        id,
        type,
        prompt,
        image_url,
        points,
        order_index,
        accepted_answers,
        numeric_tolerance,
        question_options (
          id,
          text,
          is_correct,
          order_index
        )
      `)
      .eq('test_id', params.id)
      .order('order_index', { ascending: true });

    if (questionsError) {
      return NextResponse.json({ error: questionsError.message }, { status: 500 });
    }

    // 4. Fetch student answers
    const { data: answers, error: answersError } = await supabase
      .from('answers')
      .select('*')
      .eq('attempt_id', params.attemptId);

    if (answersError) {
      return NextResponse.json({ error: answersError.message }, { status: 500 });
    }

    const answersMap = new Map((answers || []).map((a) => [a.question_id, a]));

    // Format questions with student answer info
    const formattedQuestions = (questions || []).map((q) => {
      const studentAns = answersMap.get(q.id);
      return {
        ...q,
        options: (q.question_options || []).sort(
          (a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index
        ),
        student_answer: studentAns || null,
      };
    });

    // 5. Fetch all violations for this attempt
    const { data: violations, error: violationsError } = await supabase
      .from('violations')
      .select('*')
      .eq('attempt_id', params.attemptId)
      .order('occurred_at', { ascending: true });

    if (violationsError) {
      return NextResponse.json({ error: violationsError.message }, { status: 500 });
    }

    return NextResponse.json({
      test,
      attempt,
      questions: formattedQuestions,
      violations: violations || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serverda xatolik yuz berdi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: Teacher grades manual questions
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; attemptId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 401 });
    }

    const body = await request.json();
    const { grades } = body; // Array of { question_id, manual_score, comment }

    if (!Array.isArray(grades)) {
      return NextResponse.json({ error: 'Baholar massiv ko\'rinishida bo\'lishi kerak' }, { status: 400 });
    }

    // Update each answer
    for (const item of grades) {
      await supabase
        .from('answers')
        .upsert(
          {
            attempt_id: params.attemptId,
            question_id: item.question_id,
            manual_score: item.manual_score !== null ? Number(item.manual_score) : null,
            comment: item.comment || '',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'attempt_id, question_id' }
        );
    }

    // Recalculate total score for attempt
    const { data: allAnswers } = await supabase
      .from('answers')
      .select('auto_score, manual_score')
      .eq('attempt_id', params.attemptId);

    const totalScore = (allAnswers || []).reduce((acc, ans) => {
      const effectiveScore = ans.manual_score !== null && ans.manual_score !== undefined
        ? Number(ans.manual_score)
        : Number(ans.auto_score || 0);
      return acc + effectiveScore;
    }, 0);

    await supabase
      .from('attempts')
      .update({ score: totalScore })
      .eq('id', params.attemptId);

    return NextResponse.json({ success: true, score: totalScore });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serverda xatolik yuz berdi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Reset attempt to allow retake
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; attemptId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 401 });
    }

    // Verify test belongs to teacher
    const { data: test } = await supabase
      .from('tests')
      .select('id')
      .eq('id', params.id)
      .eq('teacher_id', user.id)
      .single();

    if (!test) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 403 });
    }

    // Delete attempt (cascade deletes answers & violations)
    const { error: deleteError } = await supabase
      .from('attempts')
      .delete()
      .eq('id', params.attemptId)
      .eq('test_id', params.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Urinish muvaffaqiyatli o\'chirildi' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serverda xatolik yuz berdi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
