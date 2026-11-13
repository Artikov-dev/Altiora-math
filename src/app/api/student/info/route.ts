import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.trim().toUpperCase();

    if (!code) {
      return NextResponse.json({ error: 'Test kodi ko\'rsatilmadi' }, { status: 400 });
    }

    const supabase = getAdminClient();

    const { data: test, error } = await supabase
      .from('tests')
      .select('title, description, duration_minutes, max_violations, require_fullscreen, is_published')
      .eq('code', code)
      .single();

    if (error || !test) {
      return NextResponse.json({ error: 'Bunday test topilmadi' }, { status: 404 });
    }

    if (!test.is_published) {
      return NextResponse.json({ error: 'Ushbu test hali e\'lon qilinmagan' }, { status: 403 });
    }

    return NextResponse.json({ test });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serverda xatolik yuz berdi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
