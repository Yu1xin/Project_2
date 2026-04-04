import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pile = searchParams.get('pile') || 'all';
  const userId = searchParams.get('userId');
  const search = searchParams.get('search')?.trim() || '';
  const searchField = searchParams.get('searchField') || 'all';

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const SELECT = 'id, content, like_count, image_id, humor_flavor_id, profile_id, images(url, image_description)';

  // ── Search mode: full-table search, no pile limit ──
  if (search) {
    let query = supabase.from('captions').select(SELECT);

    if (searchField === 'content') {
      query = query.ilike('content', `%${search}%`);
    } else if (searchField === 'image_id') {
      // UUID column — cast to text for partial match
      query = query.filter('image_id::text', 'ilike', `%${search}%`);
    } else if (searchField === 'profile_id') {
      // UUID column — cast to text for partial match
      query = query.filter('profile_id::text', 'ilike', `%${search}%`);
    } else if (searchField === 'image_description') {
      // image_description lives on the images table — filter captions that join to matching images
      const { data: matchingImages } = await supabase
        .from('images')
        .select('id')
        .ilike('image_description', `%${search}%`);
      const imageIds = (matchingImages || []).map((i: any) => i.id).filter(Boolean);
      if (imageIds.length === 0) return Response.json([]);
      query = query.in('image_id', imageIds);
    } else {
      // 'all' — search across content and profile_id (image_description needs separate join)
      const { data: matchingImages } = await supabase
        .from('images')
        .select('id')
        .ilike('image_description', `%${search}%`);
      const imageIds = (matchingImages || []).map((i: any) => i.id).filter(Boolean);

      // Fetch by content, profile_id (UUID cast), and image_description separately then merge
      const fetches = [
        supabase.from('captions').select(SELECT).ilike('content', `%${search}%`).limit(200),
        supabase.from('captions').select(SELECT).filter('profile_id::text', 'ilike', `%${search}%`).limit(200),
        ...(imageIds.length > 0
          ? [supabase.from('captions').select(SELECT).in('image_id', imageIds).limit(200)]
          : []),
      ];
      const results = await Promise.all(fetches);
      const seen = new Set<string>();
      const merged = results.flatMap(r => r.data || []).filter((row: any) => {
        if (seen.has(row.id)) return false;
        seen.add(row.id);
        return true;
      });
      return Response.json(merged.slice(0, 200));
    }

    query = query.order('created_datetime_utc', { ascending: false }).limit(200);
    const { data, error } = await query;
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data ?? []);
  }

  // ── Pile mode ──
  let excludedIds: string[] = [];
  if (userId && pile !== 'all') {
    const { data: votes } = await supabase
      .from('caption_votes').select('caption_id').eq('profile_id', userId);
    excludedIds = (votes || []).map((v: any) => v.caption_id).filter(Boolean);
  }

  let query = supabase.from('captions').select(SELECT);

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
    query = query.order('created_datetime_utc', { ascending: false }).limit(100);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}
