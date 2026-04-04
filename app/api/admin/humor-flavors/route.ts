import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [flavorsRes, stepsRes] = await Promise.all([
    supabase
      .from('humor_flavors')
      .select('id, slug, description, is_pinned, created_by_user_id')
      .order('is_pinned', { ascending: false })
      .order('created_datetime_utc', { ascending: false }),
    supabase
      .from('humor_flavor_steps')
      .select('id, humor_flavor_id, order_by, description, llm_system_prompt, llm_user_prompt, llm_temperature, llm_input_type_id, llm_output_type_id, llm_model_id, humor_flavor_step_type_id')
      .order('humor_flavor_id', { ascending: true })
      .order('order_by', { ascending: true }),
  ]);

  if (flavorsRes.error) return Response.json({ error: flavorsRes.error.message }, { status: 500 });
  if (stepsRes.error) return Response.json({ error: stepsRes.error.message }, { status: 500 });

  return Response.json({ flavors: flavorsRes.data ?? [], steps: stepsRes.data ?? [] });
}
