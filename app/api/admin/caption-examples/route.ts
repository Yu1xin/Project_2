import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [captionExamplesRes, imagesRes] = await Promise.all([
    supabase
      .from('caption_examples')
      .select('*')
      .order('created_datetime_utc', { ascending: false }),
    supabase
      .from('images')
      .select('id, url, image_description')
      .order('created_datetime_utc', { ascending: false }),
  ]);

  if (captionExamplesRes.error) return Response.json({ error: captionExamplesRes.error.message }, { status: 500 });
  if (imagesRes.error) return Response.json({ error: imagesRes.error.message }, { status: 500 });

  return Response.json({ captionExamples: captionExamplesRes.data ?? [], images: imagesRes.data ?? [] });
}
