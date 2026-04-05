import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) return Response.json({ error: 'Missing userId' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [likedRes, dislikedRes, myMemesRes, myFlavorsRes] = await Promise.all([
    supabase
      .from('caption_votes')
      .select('captions(id, content, like_count, images(url))')
      .eq('profile_id', userId)
      .eq('vote_value', 1)
      .limit(60),
    supabase
      .from('caption_votes')
      .select('captions(id, content, like_count, images(url))')
      .eq('profile_id', userId)
      .eq('vote_value', -1)
      .limit(60),
    supabase
      .from('captions')
      .select('id, content, like_count, images(url)')
      .eq('profile_id', userId)
      .order('created_datetime_utc', { ascending: false })
      .limit(60),
    supabase
      .from('humor_flavors')
      .select('id, slug, description')
      .eq('created_by_user_id', userId)
      .order('created_datetime_utc', { ascending: false })
      .limit(60),
  ]);

  function extractMeme(row: any) {
    const c = row.captions;
    if (!c) return null;
    return {
      id: c.id,
      content: c.content ?? null,
      like_count: c.like_count ?? null,
      image_url: c.images?.url ?? null,
    };
  }

  const liked = (likedRes.data ?? []).map(extractMeme).filter(Boolean);
  const disliked = (dislikedRes.data ?? []).map(extractMeme).filter(Boolean);
  const myMemes = (myMemesRes.data ?? []).map((c: any) => ({
    id: c.id,
    content: c.content ?? null,
    like_count: c.like_count ?? null,
    image_url: c.images?.url ?? null,
  }));
  const myFlavors = (myFlavorsRes.data ?? []).map((f: any) => ({
    id: f.id,
    slug: f.slug ?? null,
    description: f.description ?? null,
  }));

  return Response.json({ liked, disliked, myMemes, myFlavors });
}
