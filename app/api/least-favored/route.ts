import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from('captions')
    .select('id, content, like_count, images(url)')
    .order('like_count', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true })
    .limit(25);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(data ?? []);
}
