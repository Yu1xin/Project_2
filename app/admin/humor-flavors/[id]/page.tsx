'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type Step = {
  id: string;
  humor_flavor_id: string;
  order_by: number;
  description: string | null;
  llm_system_prompt: string | null;
  llm_user_prompt: string | null;
  llm_temperature: number | null;
  llm_input_type_id: string | null;
  llm_output_type_id: string | null;
  llm_model_id: string | null;
  humor_flavor_step_type_id: string | null;
};

export default function FlavorDetailPage({ params }: { params: { id: string } }) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const flavorId = params.id;
  const [steps, setSteps] = useState<Step[]>([]);
  const [testOutput, setTestOutput] = useState('');

  async function loadSteps() {
    const { data, error } = await supabase
      .from('humor_flavor_steps')
      .select('*')
      .eq('humor_flavor_id', flavorId)
      .order('order_by', { ascending: true });

    if (!error && data) setSteps(data);
  }

  useEffect(() => {
    loadSteps();
  }, [flavorId]);

  async function createStep() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert('not logged in');

    const nextOrder = steps.length + 1;

    const { error } = await supabase.from('humor_flavor_steps').insert({
      humor_flavor_id: flavorId,
      order_by: nextOrder,
      description: 'new step',
      llm_system_prompt: '',
      llm_user_prompt: '',
      llm_temperature: 0.7,
      created_by_user_id: session.user.id,
      modified_by_user_id: session.user.id,
      created_datetime_utc: new Date().toISOString(),
      modified_datetime_utc: new Date().toISOString(),
    });

    if (error) return alert(error.message);
    loadSteps();
  }

  async function updateStep(id: string, field: string, value: any) {
    const { data: { session } } = await supabase.auth.getSession();

    const { error } = await supabase
      .from('humor_flavor_steps')
      .update({
        [field]: value,
        modified_by_user_id: session?.user.id,
        modified_datetime_utc: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) return alert(error.message);
    loadSteps();
  }

  async function deleteStep(id: string) {
    const { error } = await supabase.from('humor_flavor_steps').delete().eq('id', id);
    if (error) return alert(error.message);
    loadSteps();
  }

  async function moveUp(step: Step) {
    if (step.order_by === 1) return;
    const prev = steps.find((s) => s.order_by === step.order_by - 1);
    if (!prev) return;

    await updateStep(step.id, 'order_by', step.order_by - 1);
    await updateStep(prev.id, 'order_by', prev.order_by + 1);
    loadSteps();
  }

  async function moveDown(step: Step) {
    const next = steps.find((s) => s.order_by === step.order_by + 1);
    if (!next) return;

    await updateStep(step.id, 'order_by', step.order_by + 1);
    await updateStep(next.id, 'order_by', next.order_by - 1);
    loadSteps();
  }

  async function testFlavor() {
    // 最低配：先把当前 steps 内容显示出来，证明你能读取 flavor steps
    // 如果你来得及，再接 REST API
    const text = steps.map((s) => `Step ${s.order_by}: ${s.description}`).join('\n');
    setTestOutput(text || 'No steps found');

    // 之后可替换成 fetch(api.almostcrackd.ai...)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Flavor Detail</h1>

      <button onClick={createStep} className="px-4 py-2 bg-blue-600 text-white rounded">
        Add Step
      </button>

      <div className="space-y-4">
        {steps.map((step) => (
          <div key={step.id} className="border p-4 rounded bg-white space-y-2">
            <div className="flex gap-2 items-center">
              <span className="font-bold">Order:</span>
              <input
                type="number"
                value={step.order_by}
                onChange={(e) => updateStep(step.id, 'order_by', Number(e.target.value))}
                className="border p-1 w-20"
              />
              <button onClick={() => moveUp(step)} className="px-2 py-1 bg-gray-200 rounded">↑</button>
              <button onClick={() => moveDown(step)} className="px-2 py-1 bg-gray-200 rounded">↓</button>
              <button onClick={() => deleteStep(step.id)} className="px-2 py-1 bg-red-500 text-white rounded">
                Delete
              </button>
            </div>

            <input
              className="border p-2 w-full"
              value={step.description || ''}
              onChange={(e) => updateStep(step.id, 'description', e.target.value)}
              placeholder="description"
            />

            <textarea
              className="border p-2 w-full"
              value={step.llm_system_prompt || ''}
              onChange={(e) => updateStep(step.id, 'llm_system_prompt', e.target.value)}
              placeholder="system prompt"
            />

            <textarea
              className="border p-2 w-full"
              value={step.llm_user_prompt || ''}
              onChange={(e) => updateStep(step.id, 'llm_user_prompt', e.target.value)}
              placeholder="user prompt"
            />

            <input
              type="number"
              step="0.1"
              className="border p-2 w-full"
              value={step.llm_temperature ?? 0.7}
              onChange={(e) => updateStep(step.id, 'llm_temperature', Number(e.target.value))}
              placeholder="temperature"
            />
          </div>
        ))}
      </div>

      <div className="border p-4 rounded bg-white space-y-3">
        <h2 className="font-bold">Test Flavor</h2>
        <button onClick={testFlavor} className="px-4 py-2 bg-green-600 text-white rounded">
          Generate / Test
        </button>
        <pre className="whitespace-pre-wrap text-sm">{testOutput}</pre>
      </div>
    </div>
  );
}