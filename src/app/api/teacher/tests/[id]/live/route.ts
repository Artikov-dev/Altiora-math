import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { liveHeartbeats, pendingWarnings } from '@/lib/liveProctoringState';

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

    // 1. Verify test ownership
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('id, title, code, duration_minutes, max_violations, is_published')
      .eq('id', params.id)
      .eq('teacher_id', user.id)
      .single();

    if (testError || !test) {
      return NextResponse.json({ error: 'Test topilmadi' }, { status: 404 });
    }

    // 2. Total questions count
    const { count: questionsCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('test_id', params.id);

    const totalQuestions = questionsCount || 0;

    // 3. Fetch all attempts for this test
    const { data: attempts, error: attemptsError } = await supabase
      .from('attempts')
      .select(`
        id,
        student_name,
        device_token,
        status,
        score,
        max_score,
        started_at,
        deadline_at,
        submitted_at,
        created_at,
        violations (id, type, occurred_at, duration_ms)
      `)
      .eq('test_id', params.id)
      .order('started_at', { ascending: false });

    if (attemptsError) {
      return NextResponse.json({ error: attemptsError.message }, { status: 500 });
    }

    const attemptIds = (attempts || []).map((a) => a.id);

    // 4. Fetch answered counts for all attempts
    const answersCounts: Record<string, number> = {};
    if (attemptIds.length > 0) {
      const { data: answers } = await supabase
        .from('answers')
        .select('attempt_id, value')
        .in('attempt_id', attemptIds);

      if (answers) {
        answers.forEach((ans) => {
          if (ans.value && ans.value.trim()) {
            answersCounts[ans.attempt_id] = (answersCounts[ans.attempt_id] || 0) + 1;
          }
        });
      }
    }

    const now = Date.now();

    // 5. Build live student models
    const students = (attempts || []).map((att) => {
      const hb = liveHeartbeats.get(att.id);
      const violationsList = Array.isArray(att.violations) ? att.violations : [];
      const violationsCount = violationsList.length;

      // Sort violations to find the latest
      const latestViolation = violationsList.length > 0
        ? [...violationsList].sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())[0]
        : null;

      // Calculate time remaining
      const deadlineTime = new Date(att.deadline_at).getTime();
      const remainingSeconds = Math.max(0, Math.floor((deadlineTime - now) / 1000));

      // Calculate live status
      let liveStatus: 'active' | 'away' | 'idle' | 'offline' | 'submitted' | 'auto_submitted';

      if (att.status === 'submitted') {
        liveStatus = 'submitted';
      } else if (att.status === 'auto_submitted') {
        liveStatus = 'auto_submitted';
      } else {
        const timeSincePing = hb ? now - hb.lastPing : Infinity;

        if (hb?.isAway) {
          liveStatus = 'away';
        } else if (timeSincePing < 15000) {
          liveStatus = 'active';
        } else if (timeSincePing < 35000) {
          liveStatus = 'idle';
        } else {
          liveStatus = 'offline';
        }
      }

      return {
        id: att.id,
        student_name: att.student_name,
        status: att.status,
        live_status: liveStatus,
        answered_count: answersCounts[att.id] || 0,
        total_questions: totalQuestions,
        current_question_index: hb?.currentQuestionIndex ?? null,
        violations_count: violationsCount,
        max_violations: test.max_violations,
        latest_violation: latestViolation,
        score: att.score,
        max_score: att.max_score,
        remaining_seconds: remainingSeconds,
        started_at: att.started_at,
        submitted_at: att.submitted_at,
        last_ping_ago_seconds: hb ? Math.floor((now - hb.lastPing) / 1000) : null,
      };
    });

    const summary = {
      total: students.length,
      active: students.filter((s) => s.live_status === 'active').length,
      away: students.filter((s) => s.live_status === 'away').length,
      submitted: students.filter((s) => s.live_status === 'submitted' || s.live_status === 'auto_submitted').length,
      idle: students.filter((s) => s.live_status === 'idle').length,
      offline: students.filter((s) => s.live_status === 'offline').length,
    };

    return NextResponse.json({
      test,
      students,
      summary,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serverda xatolik yuz berdi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Actions from Live Proctoring Room (send warning or force submit)
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

    // Verify test ownership
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('id')
      .eq('id', params.id)
      .eq('teacher_id', user.id)
      .single();

    if (testError || !test) {
      return NextResponse.json({ error: 'Test topilmadi' }, { status: 404 });
    }

    const body = await request.json();
    const { action, attempt_id, message } = body;

    if (!attempt_id) {
      return NextResponse.json({ error: 'Urinish ID si ko\'rsatilmadi' }, { status: 400 });
    }

    if (action === 'warn') {
      const warnMsg = message?.trim() || 'Ustoz ogohlantirishi: Iltimos ekrandan chiqmang!';
      pendingWarnings.set(attempt_id, warnMsg);
      return NextResponse.json({ success: true, message: 'Ogohlantirish navbatga qo\'yildi' });
    }

    if (action === 'force_submit') {
      // Force submit attempt
      const nowIso = new Date().toISOString();
      const { data: updatedAttempt, error: updateError } = await supabase
        .from('attempts')
        .update({
          status: 'auto_submitted',
          submitted_at: nowIso,
        })
        .eq('id', attempt_id)
        .eq('test_id', params.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      liveHeartbeats.delete(attempt_id);
      pendingWarnings.delete(attempt_id);

      return NextResponse.json({
        success: true,
        attempt: updatedAttempt,
        message: 'O\'quvchi testi majburiy yakunlandi',
      });
    }

    return NextResponse.json({ error: 'Noma\'lum amal' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serverda xatolik yuz berdi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
