import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pile = searchParams.get('pile') || 'all';
  const userId = searchParams.get('userId');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // For named piles, exclude captions the user already voted on
  let excludedIds: string[] = [];
  if (userId && pile !== 'all') {
    const { data: votes } = await supabase
      .from('caption_votes')
      .select('caption_id')
      .eq('profile_id', userId);
    excludedIds = (votes || []).map((v: any) => v.caption_id).filter(Boolean);
  }

  let query = supabase
    .from('captions')
    .select('id, content, like_count, images(url)');

  if (excludedIds.length > 0) {
    query = query.not('id', 'in', `(${excludedIds.join(',')})`);
  }

  if (pile === 'latest') {
    query = query.order('created_datetime_utc', { ascending: false }).limit(30);
  } else if (pile === 'top') {
    query = query.order('like_count', { ascending: false, nullsFirst: false }).limit(30);
  } else if (pile === 'bottom') {
    query = query.order('like_count', { ascending: true, nullsFirst: false }).limit(30);
  } else {
    // all — latest 100
    query = query.order('created_datetime_utc', { ascending: false }).limit(100);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}
