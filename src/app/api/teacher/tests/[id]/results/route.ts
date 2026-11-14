import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

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

    // 1. Verify test belongs to teacher
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('id, title, code, duration_minutes, max_violations, created_at')
      .eq('id', params.id)
      .eq('teacher_id', user.id)
      .single();

    if (testError || !test) {
      return NextResponse.json({ error: 'Test topilmadi' }, { status: 404 });
    }

    // 2. Fetch all attempts for this test
    const { data: attempts, error: attemptsError } = await supabase
      .from('attempts')
      .select(`
        id,
        student_name,
        device_token,
        started_at,
        deadline_at,
        submitted_at,
        status,
        score,
        max_score,
        created_at,
        violations (id)
      `)
      .eq('test_id', params.id)
      .order('created_at', { ascending: false });

    if (attemptsError) {
      return NextResponse.json({ error: attemptsError.message }, { status: 500 });
    }

    // Format attempts with calculated stats
    const formattedAttempts = (attempts || []).map((att) => {
      const startTime = new Date(att.started_at).getTime();
      const endTime = att.submitted_at
        ? new Date(att.submitted_at).getTime()
        : Date.now();
      const durationSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000));

      const percentage = att.max_score > 0
        ? Math.round((Number(att.score) / Number(att.max_score)) * 100)
        : 0;

      const violationCount = Array.isArray(att.violations) ? att.violations.length : 0;

      return {
        id: att.id,
        student_name: att.student_name,
        status: att.status,
        score: Number(att.score) || 0,
        max_score: Number(att.max_score) || 0,
        percentage,
        duration_seconds: durationSeconds,
        violations_count: violationCount,
        started_at: att.started_at,
        submitted_at: att.submitted_at,
        created_at: att.created_at,
      };
    });

    return NextResponse.json({
      test,
      attempts: formattedAttempts,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serverda xatolik yuz berdi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
