import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const { attempt_id, device_token } = await request.json();

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
      return NextResponse.json({ is_active: false, status: attempt.status });
    }

    const now = new Date();
    const deadline = new Date(attempt.deadline_at);
    const remainingSeconds = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 1000));

    if (remainingSeconds <= 0) {
      return NextResponse.json({ is_active: false, time_up: true });
    }

    return NextResponse.json({
      is_active: true,
      remaining_seconds: remainingSeconds,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server xatoligi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
