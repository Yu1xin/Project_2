import { createClient } from '@supabase/supabase-js';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const flavorId = Number(id);

  if (Number.isNaN(flavorId)) {
    return Response.json({ error: 'Invalid flavor ID.' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [flavorRes, stepsRes] = await Promise.all([
    supabase
      .from('humor_flavors')
      .select('id, slug, description, created_by_user_id')
      .eq('id', flavorId)
      .single(),
    supabase
      .from('humor_flavor_steps')
      .select('id, humor_flavor_id, order_by, description, llm_system_prompt, llm_user_prompt, llm_temperature, llm_model_id, llm_input_type_id, llm_output_type_id, humor_flavor_step_type_id')
      .eq('humor_flavor_id', flavorId)
      .order('order_by', { ascending: true }),
  ]);

  if (flavorRes.error) return Response.json({ error: flavorRes.error.message }, { status: 500 });
  if (stepsRes.error) return Response.json({ error: stepsRes.error.message }, { status: 500 });

  return Response.json({ flavor: flavorRes.data, steps: stepsRes.data ?? [] });
}
