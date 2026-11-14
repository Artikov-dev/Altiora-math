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

    // 1. Fetch test
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('id, title, code')
      .eq('id', params.id)
      .eq('teacher_id', user.id)
      .single();

    if (testError || !test) {
      return NextResponse.json({ error: 'Test topilmadi' }, { status: 404 });
    }

    // 2. Fetch attempts
    const { data: attempts, error: attemptsError } = await supabase
      .from('attempts')
      .select(`
        id,
        student_name,
        started_at,
        submitted_at,
        status,
        score,
        max_score,
        violations (id)
      `)
      .eq('test_id', params.id)
      .order('student_name', { ascending: true });

    if (attemptsError) {
      return NextResponse.json({ error: attemptsError.message }, { status: 500 });
    }

    // 3. Build CSV with UTF-8 BOM
    const headers = [
      '№',
      'F.I.SH',
      'To\'plagan ball',
      'Maksimal ball',
      'Foiz (%)',
      'Holati',
      'Qoidabuzarliklar soni',
      'Ketgan vaqt',
      'Boshlagan vaqti',
      'Topshirgan vaqti',
    ];

    const escapeCsv = (str: string | number) => {
      const stringValue = String(str ?? '');
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const rows = (attempts || []).map((att, idx) => {
      const startTime = new Date(att.started_at).getTime();
      const endTime = att.submitted_at
        ? new Date(att.submitted_at).getTime()
        : Date.now();
      const durationSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000));
      const durationMins = Math.floor(durationSeconds / 60);
      const durationSecs = durationSeconds % 60;
      const formattedDuration = `${durationMins} daq ${durationSecs} son`;

      const percentage = att.max_score > 0
        ? Math.round((Number(att.score) / Number(att.max_score)) * 100)
        : 0;

      const violationCount = Array.isArray(att.violations) ? att.violations.length : 0;

      const statusMap: Record<string, string> = {
        in_progress: 'Jarayonda',
        submitted: 'Topshirdi',
        auto_submitted: 'Avto-yakunlandi',
      };

      const formattedStarted = new Date(att.started_at).toLocaleString('uz-UZ', {
        timeZone: 'Asia/Tashkent',
      });
      const formattedSubmitted = att.submitted_at
        ? new Date(att.submitted_at).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })
        : '-';

      return [
        idx + 1,
        escapeCsv(att.student_name),
        att.score,
        att.max_score,
        `${percentage}%`,
        statusMap[att.status] || att.status,
        violationCount,
        escapeCsv(formattedDuration),
        escapeCsv(formattedStarted),
        escapeCsv(formattedSubmitted),
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="natijalar-${test.code}.csv"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serverda xatolik yuz berdi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
