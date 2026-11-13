import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const attemptId = formData.get('attempt_id') as string | null;
    const questionId = formData.get('question_id') as string | null;

    if (!file || !attemptId || !questionId) {
      return NextResponse.json({ error: 'Rasm va urinish ma\'lumotlari yetarli emas' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Verify attempt is in progress
    const { data: attempt } = await supabase
      .from('attempts')
      .select('status')
      .eq('id', attemptId)
      .single();

    if (!attempt || attempt.status !== 'in_progress') {
      return NextResponse.json({ error: 'Urinish faol emas' }, { status: 403 });
    }

    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `${attemptId}/${questionId}_${Date.now()}.${fileExt}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('test-photos')
      .upload(filePath, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from('test-photos')
      .getPublicUrl(filePath);

    return NextResponse.json({ success: true, photo_url: publicUrlData.publicUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serverda xatolik yuz berdi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
