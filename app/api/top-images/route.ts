import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Sum like_count per image across all captions
  const { data: captions } = await supabase
    .from('captions')
    .select('image_id, like_count')
    .not('image_id', 'is', null);

  const scoreMap = new Map<string, number>();
  for (const c of (captions ?? [])) {
    if (!c.image_id) continue;
    scoreMap.set(c.image_id, (scoreMap.get(c.image_id) ?? 0) + Number(c.like_count ?? 0));
  }

  const top50Ids = Array.from(scoreMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([id]) => id);

  if (top50Ids.length === 0) return Response.json([]);

  const { data: images } = await supabase
    .from('images')
    .select('id, url, image_description')
    .in('id', top50Ids);

  // Preserve ranking order
  const sorted = top50Ids
    .map(id => (images ?? []).find((img: any) => img.id === id))
    .filter(Boolean);

  return Response.json(sorted);
}
