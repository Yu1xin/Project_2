import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [logsRes, modelsRes] = await Promise.all([
    supabase
      .from('llm_model_responses')
      .select('id, llm_model_response, llm_system_prompt, llm_user_prompt, llm_model_id, processing_time_seconds, created_datetime_utc')
      .order('created_datetime_utc', { ascending: false }),
    supabase
      .from('llm_models')
      .select('id, name'),
  ]);

  if (logsRes.error) return Response.json({ error: logsRes.error.message }, { status: 500 });
  if (modelsRes.error) return Response.json({ error: modelsRes.error.message }, { status: 500 });

  return Response.json({ logs: logsRes.data ?? [], models: modelsRes.data ?? [] });
}
