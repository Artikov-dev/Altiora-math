import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const { attempt_id, device_token, question_id, value, photo_url } = await request.json();

    if (!attempt_id || !device_token || !question_id) {
      return NextResponse.json({ error: 'Talab qilingan parametrlar yetarli emas' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Verify attempt is active
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('status, deadline_at')
      .eq('id', attempt_id)
      .eq('device_token', device_token)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: 'Urinish topilmadi yoki token noto\'g\'ri' }, { status: 403 });
    }

    if (attempt.status !== 'in_progress') {
      return NextResponse.json({ error: 'Ushbu test allaqachon yakunlangan' }, { status: 403 });
    }

    if (new Date() > new Date(attempt.deadline_at)) {
      await supabase
        .from('attempts')
        .update({ status: 'submitted', submitted_at: new Date().toISOString() })
        .eq('id', attempt_id);
      return NextResponse.json({ error: 'Vaqt tugadi' }, { status: 403 });
    }

    // Upsert answer
    const { error: upsertError } = await supabase
      .from('answers')
      .upsert(
        {
          attempt_id,
          question_id,
          value: value ?? '',
          photo_url: photo_url || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'attempt_id, question_id' }
      );

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serverda xatolik yuz berdi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
