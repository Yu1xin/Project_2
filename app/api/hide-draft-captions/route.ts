import { createClient } from '@supabase/supabase-js';

// POST /api/hide-draft-captions
// Body: { imageId: string, userId: string }
// Uses service role to bypass RLS and set is_public: false on all auto-saved captions
// Returns: { ids: string[] } — IDs of the captions that were hidden (most recent first)
export async function POST(request: Request) {
  const { imageId, userId } = await request.json();
  if (!imageId || !userId) {
    return Response.json({ error: 'Missing imageId or userId' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const since = new Date(Date.now() - 120_000).toISOString();

  const { data, error } = await supabase
    .from('captions')
    .select('id')
    .eq('image_id', imageId)
    .eq('profile_id', userId)
    .eq('is_public', true)
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return Response.json({ ids: [] });
  }

  const ids = data.map((r: { id: string }) => r.id);

  const { error: updateError } = await supabase
    .from('captions')
    .update({ is_public: false })
    .in('id', ids);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ ids });
}
