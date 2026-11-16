import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { generateTestCode } from '@/lib/codeGenerator';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 401 });
    }

    // 1. Fetch original test
    const { data: sourceTest, error: testError } = await supabase
      .from('tests')
      .select('*')
      .eq('id', params.id)
      .eq('teacher_id', user.id)
      .single();

    if (testError || !sourceTest) {
      return NextResponse.json({ error: 'Asosiy test topilmadi' }, { status: 404 });
    }

    // 2. Fetch original questions with options
    const { data: questions, error: qError } = await supabase
      .from('questions')
      .select('*, question_options(*)')
      .eq('test_id', params.id)
      .order('order_index', { ascending: true });

    if (qError) {
      return NextResponse.json({ error: qError.message }, { status: 500 });
    }

    // 3. Generate a new unique test code
    let newCode = generateTestCode();
    let isCodeUnique = false;
    let attempts = 0;

    while (!isCodeUnique && attempts < 10) {
      attempts++;
      const { data: existing } = await supabase
        .from('tests')
        .select('id')
        .eq('code', newCode)
        .maybeSingle();

      if (!existing) {
        isCodeUnique = true;
      } else {
        newCode = generateTestCode();
      }
    }

    // 4. Create cloned test
    const { data: newTest, error: createError } = await supabase
      .from('tests')
      .insert({
        teacher_id: user.id,
        code: newCode,
        title: `${sourceTest.title} (Nusxa)`,
        description: sourceTest.description || '',
        duration_minutes: sourceTest.duration_minutes,
        max_violations: sourceTest.max_violations,
        shuffle_questions: sourceTest.shuffle_questions,
        shuffle_options: sourceTest.shuffle_options,
        require_fullscreen: sourceTest.require_fullscreen,
        show_results_immediately: sourceTest.show_results_immediately,
        is_published: false,
      })
      .select()
      .single();

    if (createError || !newTest) {
      return NextResponse.json(
        { error: createError?.message || 'Nusxa yaratishda xatolik' },
        { status: 500 }
      );
    }

    // 5. Clone questions and options
    if (questions && questions.length > 0) {
      for (const q of questions) {
        const { data: newQ, error: insertQError } = await supabase
          .from('questions')
          .insert({
            test_id: newTest.id,
            type: q.type,
            prompt: q.prompt,
            image_url: q.image_url,
            points: q.points,
            order_index: q.order_index,
            accepted_answers: q.accepted_answers,
            numeric_tolerance: q.numeric_tolerance,
            template_formula: q.template_formula,
          })
          .select()
          .single();

        if (!insertQError && newQ && q.question_options && q.question_options.length > 0) {
          const optionsToInsert = q.question_options.map((opt: { text: string; is_correct: boolean; order_index: number }) => ({
            question_id: newQ.id,
            text: opt.text,
            is_correct: opt.is_correct,
            order_index: opt.order_index,
          }));

          await supabase.from('question_options').insert(optionsToInsert);
        }
      }
    }

    return NextResponse.json({
      success: true,
      test: newTest,
      message: 'Test muvaffaqiyatli nusxalandi',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serverda xatolik yuz berdi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
