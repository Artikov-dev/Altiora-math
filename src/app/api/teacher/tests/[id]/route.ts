import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createTestSchema } from '@/lib/validations';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 401 });
    }

    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('*')
      .eq('id', params.id)
      .eq('teacher_id', user.id)
      .single();

    if (testError || !test) {
      return NextResponse.json({ error: 'Test topilmadi' }, { status: 404 });
    }

    const { data: questions, error: qError } = await supabase
      .from('questions')
      .select(`
        *,
        question_options (*)
      `)
      .eq('test_id', params.id)
      .order('order_index', { ascending: true });

    if (qError) {
      return NextResponse.json({ error: qError.message }, { status: 500 });
    }

    const formattedQuestions = questions.map((q) => ({
      ...q,
      options: (q.question_options || []).sort(
        (a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index
      ),
    }));

    return NextResponse.json({ test: { ...test, questions: formattedQuestions } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serverda xatolik yuz berdi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createTestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ma\'lumotlar noto\'g\'ri', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { questions, ...testData } = parsed.data;

    // 1. Update test
    const { data: updatedTest, error: testError } = await supabase
      .from('tests')
      .update({
        ...testData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('teacher_id', user.id)
      .select()
      .single();

    if (testError || !updatedTest) {
      return NextResponse.json({ error: testError?.message || 'Testni yangilashda xatolik' }, { status: 500 });
    }

    // 2. Remove existing questions (cascade will remove question_options)
    await supabase.from('questions').delete().eq('test_id', params.id);

    // 3. Re-insert updated questions & options
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const { options, ...qData } = q;

      const { data: insertedQuestion, error: qError } = await supabase
        .from('questions')
        .insert({
          test_id: params.id,
          type: qData.type,
          prompt: qData.prompt,
          image_url: qData.image_url || null,
          points: qData.points,
          order_index: i,
          accepted_answers: qData.accepted_answers || [],
          numeric_tolerance: qData.numeric_tolerance || 0,
          template_formula: qData.template_formula || null,
        })
        .select()
        .single();

      if (qError || !insertedQuestion) {
        throw new Error(qError?.message || 'Savolni saqlashda xatolik');
      }

      if (qData.type === 'multiple_choice' && options && options.length > 0) {
        const optionsToInsert = options.map((opt, optIdx) => ({
          question_id: insertedQuestion.id,
          text: opt.text,
          is_correct: opt.is_correct,
          order_index: optIdx,
        }));

        await supabase.from('question_options').insert(optionsToInsert);
      }
    }

    return NextResponse.json({ success: true, test: updatedTest });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serverda xatolik yuz berdi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 401 });
    }

    const { error: deleteError } = await supabase
      .from('tests')
      .delete()
      .eq('id', params.id)
      .eq('teacher_id', user.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serverda xatolik yuz berdi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 401 });
    }

    const body = await request.json();
    const { is_published } = body;

    const { data: updatedTest, error: testError } = await supabase
      .from('tests')
      .update({
        is_published: !!is_published,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('teacher_id', user.id)
      .select()
      .single();

    if (testError || !updatedTest) {
      return NextResponse.json(
        { error: testError?.message || 'Holatni yangilashda xatolik' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, test: updatedTest });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serverda xatolik yuz berdi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
