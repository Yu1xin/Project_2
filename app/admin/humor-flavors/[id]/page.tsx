'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useParams } from 'next/navigation';

type Step = {
  id: string;
  humor_flavor_id: number;
  order_by: number;
  description: string | null;
  llm_system_prompt: string | null;
  llm_user_prompt: string | null;
  llm_temperature: number | null;
};

export default function FlavorDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const flavorId =
    typeof rawId === 'string' ? Number(rawId) : Array.isArray(rawId) ? Number(rawId[0]) : NaN;

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadSteps() {
    if (Number.isNaN(flavorId)) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('humor_flavor_steps')
      .select(
        'id, humor_flavor_id, order_by, description, llm_system_prompt, llm_user_prompt, llm_temperature'
      )
      .eq('humor_flavor_id', flavorId)
      .order('order_by', { ascending: true });

    if (error) {
      console.error('loadSteps error:', error);
      alert(error.message);
    } else {
      setSteps((data as Step[]) || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadSteps();
  }, [flavorId]);

  if (Number.isNaN(flavorId)) {
    return (
      <div className="p-8 text-red-600">
        Invalid flavor ID. rawId = {JSON.stringify(rawId)}
      </div>
    );
  }

  if (loading) {
    return <div className="p-8">Loading steps...</div>;
  }

  return (
    <div className="p-8 space-y-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800">Flavor Steps</h1>
      <p className="text-gray-600">Flavor ID: {flavorId}</p>

      {steps.length === 0 ? (
        <div className="text-gray-500">No steps found for this flavor.</div>
      ) : (
        <div className="space-y-4">
          {steps.map((step) => (
            <div key={step.id} className="border rounded-lg p-4 bg-white shadow-sm space-y-2">
              <div className="font-semibold text-gray-800">Step {step.order_by}</div>

              <div>
                <span className="font-medium">Description:</span>{' '}
                {step.description || 'No description'}
              </div>

              <div>
                <span className="font-medium">Temperature:</span>{' '}
                {step.llm_temperature ?? 'N/A'}
              </div>

              <div>
                <span className="font-medium">System Prompt:</span>
                <pre className="whitespace-pre-wrap text-sm bg-gray-100 p-2 rounded mt-1">
                  {step.llm_system_prompt || 'None'}
                </pre>
              </div>

              <div>
                <span className="font-medium">User Prompt:</span>
                <pre className="whitespace-pre-wrap text-sm bg-gray-100 p-2 rounded mt-1">
                  {step.llm_user_prompt || 'None'}
                </pre>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}