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
    <div className="p-8 space-y-6 bg-gray-100 min-h-screen">
      <h1 className="text-4xl font-bold text-gray-900">Flavor Steps</h1>
      <p className="text-lg text-gray-700">Flavor ID: {flavorId}</p>

      {steps.length === 0 ? (
        <div className="text-gray-600 text-lg">No steps found for this flavor.</div>
      ) : (
        <div className="space-y-6">
          {steps.map((step) => (
            <div
              key={step.id}
              className="border border-gray-300 rounded-xl p-6 bg-white shadow-sm space-y-4"
            >
              <div className="text-2xl font-bold text-gray-900">
                Step {step.order_by}
              </div>

              <div className="text-gray-800">
                <span className="font-semibold text-gray-900">Description:</span>{' '}
                {step.description || 'No description'}
              </div>

              <div className="text-gray-800">
                <span className="font-semibold text-gray-900">Temperature:</span>{' '}
                {step.llm_temperature ?? 'N/A'}
              </div>

              <div>
                <div className="font-semibold text-gray-900 mb-2">System Prompt:</div>
                <pre className="whitespace-pre-wrap text-sm text-gray-900 bg-gray-100 border border-gray-300 p-4 rounded-lg overflow-x-auto">
                  {step.llm_system_prompt || 'None'}
                </pre>
              </div>

              <div>
                <div className="font-semibold text-gray-900 mb-2">User Prompt:</div>
                <pre className="whitespace-pre-wrap text-sm text-gray-900 bg-gray-100 border border-gray-300 p-4 rounded-lg overflow-x-auto">
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