import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createTestSchema } from '@/lib/validations';
import { generateTestCode } from '@/lib/codeGenerator';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 401 });
    }

    // Get tests for this teacher along with attempts count
    const { data: tests, error: testsError } = await supabase
      .from('tests')
      .select(`
        *,
        attempts (
          id
        )
      `)
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });

    if (testsError) {
      return NextResponse.json({ error: testsError.message }, { status: 500 });
    }

    const formattedTests = tests.map((t) => ({
      ...t,
      submissions_count: Array.isArray(t.attempts) ? t.attempts.length : 0,
    }));

    return NextResponse.json({ tests: formattedTests });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serverda xatolik yuz berdi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
    const testCode = generateTestCode();

    // 1. Insert test
    const { data: newTest, error: testError } = await supabase
      .from('tests')
      .insert({
        ...testData,
        code: testCode,
        teacher_id: user.id,
      })
      .select()
      .single();

    if (testError || !newTest) {
      return NextResponse.json({ error: testError?.message || 'Test yaratishda xatolik' }, { status: 500 });
    }

    // 2. Insert questions & options
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const { options, ...qData } = q;

      const { data: insertedQuestion, error: qError } = await supabase
        .from('questions')
        .insert({
          test_id: newTest.id,
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
        throw new Error(qError?.message || 'Savol kiritishda xatolik');
      }

      if (qData.type === 'multiple_choice' && options && options.length > 0) {
        const optionsToInsert = options.map((opt, optIdx) => ({
          question_id: insertedQuestion.id,
          text: opt.text,
          is_correct: opt.is_correct,
          order_index: optIdx,
        }));

        const { error: optError } = await supabase
          .from('question_options')
          .insert(optionsToInsert);

        if (optError) {
          throw new Error(optError.message);
        }
      }
    }

    return NextResponse.json({ success: true, test: newTest }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serverda xatolik yuz berdi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
