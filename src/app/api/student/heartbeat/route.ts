import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';
import { liveHeartbeats, pendingWarnings } from '@/lib/liveProctoringState';

export async function POST(request: Request) {
  try {
    const { attempt_id, device_token, current_question_index } = await request.json();

    if (!attempt_id || !device_token) {
      return NextResponse.json({ error: 'Urinish parametrlari yetarli emas' }, { status: 400 });
    }

    const supabase = getAdminClient();

    const { data: attempt, error } = await supabase
      .from('attempts')
      .select('id, status, deadline_at')
      .eq('id', attempt_id)
      .eq('device_token', device_token)
      .single();

    if (error || !attempt) {
      return NextResponse.json({ error: 'Urinish topilmadi' }, { status: 404 });
    }

    if (attempt.status !== 'in_progress') {
      liveHeartbeats.delete(attempt_id);
      return NextResponse.json({ is_active: false, status: attempt.status });
    }

    const now = new Date();
    const deadline = new Date(attempt.deadline_at);
    const remainingSeconds = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 1000));

    if (remainingSeconds <= 0) {
      liveHeartbeats.delete(attempt_id);
      return NextResponse.json({ is_active: false, time_up: true });
    }

    // Update real-time heartbeat in live state
    liveHeartbeats.set(attempt_id, {
      lastPing: Date.now(),
      currentQuestionIndex: typeof current_question_index === 'number' ? current_question_index : undefined,
      isAway: false,
    });

    // Check for pending warning from teacher
    let warningMessage: string | null = null;
    if (pendingWarnings.has(attempt_id)) {
      warningMessage = pendingWarnings.get(attempt_id) || null;
      pendingWarnings.delete(attempt_id);
    }

    return NextResponse.json({
      is_active: true,
      remaining_seconds: remainingSeconds,
      warning: warningMessage,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server xatoligi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
