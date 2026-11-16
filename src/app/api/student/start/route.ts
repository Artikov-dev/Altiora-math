import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const { code, student_name, device_token: clientDeviceToken } = await request.json();

    if (!code || !student_name || typeof student_name !== 'string') {
      return NextResponse.json(
        { error: 'Test kodi va o\'quvchi ismi talab qilinadi' },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanName = student_name.trim();

    if (cleanName.length < 3) {
      return NextResponse.json(
        { error: 'Ism kamida 3 ta belgidan iborat bo\'lishi kerak' },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // 1. Fetch test by code
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('*, questions(points)')
      .eq('code', cleanCode)
      .single();

    if (testError || !test) {
      return NextResponse.json({ error: 'Bunday test kodi topilmadi' }, { status: 404 });
    }

    if (!test.is_published) {
      return NextResponse.json({ error: 'Ushbu test hali e\'lon qilinmagan' }, { status: 403 });
    }

    // 2. Check if student already has an attempt
    const { data: existingAttempts, error: attemptCheckError } = await supabase
      .from('attempts')
      .select('*')
      .eq('test_id', test.id)
      .ilike('student_name', cleanName);

    if (attemptCheckError) {
      return NextResponse.json({ error: attemptCheckError.message }, { status: 500 });
    }

    const existingAttempt = existingAttempts && existingAttempts.length > 0 ? existingAttempts[0] : null;

    if (existingAttempt) {
      // If submitted or auto_submitted
      if (existingAttempt.status === 'submitted' || existingAttempt.status === 'auto_submitted') {
        return NextResponse.json(
          { error: 'Bu ism bilan test allaqachon topshirilgan! Qayta topshirish uchun o\'qituvchiga murojaat qiling.' },
          { status: 403 }
        );
      }

      // If in progress, check if deadline expired
      const now = new Date();
      const deadline = new Date(existingAttempt.deadline_at);
      if (now > deadline) {
        await supabase
          .from('attempts')
          .update({ status: 'submitted', submitted_at: now.toISOString() })
          .eq('id', existingAttempt.id);

        return NextResponse.json(
          { error: 'Test topshirish vaqti tugagan!' },
          { status: 403 }
        );
      }

      // Check device token collision
      if (clientDeviceToken && clientDeviceToken !== existingAttempt.device_token) {
        return NextResponse.json(
          { error: 'Ushbu ism-familiya bilan boshqa qurilmada test boshlangan! Bitta nom bilan ikki qurilmadan kirish taqiqlanadi.' },
          { status: 403 }
        );
      }

      // Resume existing in_progress attempt
      const response = NextResponse.json({
        success: true,
        resumed: true,
        attempt_id: existingAttempt.id,
        device_token: existingAttempt.device_token,
        code: test.code,
      });

      response.cookies.set('exam_attempt_id', existingAttempt.id, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: test.duration_minutes * 60 + 3600,
      });
      response.cookies.set('exam_device_token', existingAttempt.device_token, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: test.duration_minutes * 60 + 3600,
      });

      return response;
    }

    // 3. Create new attempt
    const deviceToken = crypto.randomUUID();
    const seed = Math.floor(Math.random() * 1000000) + 1;
    const startedAt = new Date();
    const deadlineAt = new Date(startedAt.getTime() + test.duration_minutes * 60 * 1000);

    const questionsList = (test.questions as { points: number }[]) || [];
    const maxScore = questionsList.reduce((acc, q) => acc + (Number(q.points) || 1), 0);

    const { data: newAttempt, error: createError } = await supabase
      .from('attempts')
      .insert({
        test_id: test.id,
        student_name: cleanName,
        device_token: deviceToken,
        seed,
        started_at: startedAt.toISOString(),
        deadline_at: deadlineAt.toISOString(),
        status: 'in_progress',
        score: 0,
        max_score: maxScore,
      })
      .select()
      .single();

    if (createError || !newAttempt) {
      return NextResponse.json({ error: createError?.message || 'Urinish yaratib bo\'lmadi' }, { status: 500 });
    }

    const response = NextResponse.json({
      success: true,
      resumed: false,
      attempt_id: newAttempt.id,
      device_token: deviceToken,
      code: test.code,
    });

    response.cookies.set('exam_attempt_id', newAttempt.id, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: test.duration_minutes * 60 + 3600,
    });
    response.cookies.set('exam_device_token', deviceToken, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: test.duration_minutes * 60 + 3600,
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serverda xatolik yuz berdi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
