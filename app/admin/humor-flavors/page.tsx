'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

type HumorFlavor = {
  id: number;
  slug: string;
  description: string | null;
};

type ExistingStep = {
  id: string;
  humor_flavor_id: number;
  order_by: number;
  description: string | null;
  llm_system_prompt: string | null;
  llm_user_prompt: string | null;
  llm_temperature: number | null;
  llm_input_type_id: number | null;
  llm_output_type_id: number | null;
  llm_model_id: number | null;
  humor_flavor_step_type_id: number | null;
  flavor_slug?: string;
};

type PendingStep = {
  key: string;
  description: string;
  llm_system_prompt: string;
  llm_user_prompt: string;
  llm_temperature: number;
  llm_input_type_id: number;
  llm_output_type_id: number;
  llm_model_id: number;
  humor_flavor_step_type_id: number;
};

const INPUT_TYPES = [
  { id: 1, label: 'Image + text' },
  { id: 2, label: 'Text only' },
];

const OUTPUT_TYPES = [
  { id: 1, label: 'String' },
  { id: 2, label: 'Array' },
];

const STEP_TYPES = [
  { id: 1, label: 'Celebrity recognition' },
  { id: 2, label: 'Image description' },
  { id: 3, label: 'General' },
];

const LLM_MODELS = [
  { id: 1, name: 'GPT-4.1' },
  { id: 2, name: 'GPT-4.1-mini' },
  { id: 3, name: 'GPT-4.1-nano' },
  { id: 4, name: 'GPT-4.5-preview' },
  { id: 5, name: 'GPT-4o' },
  { id: 6, name: 'GPT-4o-mini' },
  { id: 7, name: 'o1' },
  { id: 8, name: 'Grok-2-vision' },
  { id: 9, name: 'Grok-3' },
  { id: 10, name: 'Grok-4' },
  { id: 11, name: 'Gemini 2.5 Pro (was 1.5 Pro)' },
  { id: 12, name: 'Gemini 2.5 Flash (was 1.5 Flash)' },
  { id: 13, name: 'Gemini 2.5 Pro' },
  { id: 14, name: 'Gemini 2.5 Flash' },
  { id: 15, name: 'Gemini 2.5 Flash Lite' },
  { id: 16, name: 'GPT 5' },
  { id: 17, name: 'GPT 5 Mini' },
  { id: 18, name: 'GPT 5 Nano' },
  { id: 19, name: 'OpenAI' },
];

const EMPTY_STEP: Omit<PendingStep, 'key'> = {
  description: '',
  llm_system_prompt: '',
  llm_user_prompt: '',
  llm_temperature: 0.7,
  llm_input_type_id: 1,
  llm_output_type_id: 1,
  llm_model_id: 5,
  humor_flavor_step_type_id: 3,
};

export default function HumorFlavorsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [flavors, setFlavors] = useState<HumorFlavor[]>([]);
  const [allSteps, setAllSteps] = useState<ExistingStep[]>([]);
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [pendingSteps, setPendingSteps] = useState<PendingStep[]>([]);
  const [creating, setCreating] = useState(false);
  const [showNewStepForm, setShowNewStepForm] = useState(false);
  const [showMixPanel, setShowMixPanel] = useState(false);
  const [newStep, setNewStep] = useState(EMPTY_STEP);

  async function loadFlavors() {
    const { data, error } = await supabase
      .from('humor_flavors')
      .select('id, slug, description')
      .order('created_datetime_utc', { ascending: false });
    if (error) { console.error(error); alert(error.message); return; }
    setFlavors((data as HumorFlavor[]) || []);
  }

  async function loadAllSteps() {
    const [stepsRes, flavorsRes] = await Promise.all([
      supabase
        .from('humor_flavor_steps')
        .select('id, humor_flavor_id, order_by, description, llm_system_prompt, llm_user_prompt, llm_temperature, llm_input_type_id, llm_output_type_id, llm_model_id, humor_flavor_step_type_id')
        .order('humor_flavor_id', { ascending: true })
        .order('order_by', { ascending: true }),
      supabase.from('humor_flavors').select('id, slug'),
    ]);

    if (stepsRes.error) { console.error(stepsRes.error); return; }

    const flavorMap = new Map<number, string>();
    (flavorsRes.data || []).forEach((f: any) => flavorMap.set(f.id, f.slug));

    setAllSteps(
      (stepsRes.data || []).map((s: any) => ({
        ...s,
        flavor_slug: flavorMap.get(s.humor_flavor_id) ?? `Flavor ${s.humor_flavor_id}`,
      }))
    );
  }

  useEffect(() => {
    loadFlavors();
    loadAllSteps();
  }, []);

  function addNewStep() {
    setPendingSteps((prev) => [...prev, { key: crypto.randomUUID(), ...newStep }]);
    setNewStep(EMPTY_STEP);
    setShowNewStepForm(false);
  }

  function copyExistingStep(step: ExistingStep) {
    setPendingSteps((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        description: step.description ?? '',
        llm_system_prompt: step.llm_system_prompt ?? '',
        llm_user_prompt: step.llm_user_prompt ?? '',
        llm_temperature: step.llm_temperature ?? 0.7,
        llm_input_type_id: step.llm_input_type_id ?? 1,
        llm_output_type_id: step.llm_output_type_id ?? 1,
        llm_model_id: step.llm_model_id ?? 5,
        humor_flavor_step_type_id: step.humor_flavor_step_type_id ?? 3,
      },
    ]);
  }

  function removeStep(key: string) {
    setPendingSteps((prev) => prev.filter((s) => s.key !== key));
  }

  function moveStep(key: string, dir: 'up' | 'down') {
    setPendingSteps((prev) => {
      const idx = prev.findIndex((s) => s.key === key);
      const next = [...prev];
      const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }

  async function createFlavor() {
    if (!slug.trim()) { alert('Slug is required.'); return; }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { alert('Not logged in.'); return; }

    setCreating(true);
    try {
      const { data: existing } = await supabase
        .from('humor_flavors')
        .select('id')
        .eq('slug', slug.trim())
        .maybeSingle();

      if (existing) {
        alert(`A flavor with slug "${slug.trim()}" already exists. Please choose a different slug.`);
        setCreating(false);
        return;
      }

      const { data, error } = await supabase
        .from('humor_flavors')
        .insert({
          slug: slug.trim(),
          description: description.trim() || null,
          created_by_user_id: session.user.id,
          modified_by_user_id: session.user.id,
        })
        .select('id')
        .single();

      if (error) throw error;

      if (pendingSteps.length > 0) {
        const { error: stepsError } = await supabase
          .from('humor_flavor_steps')
          .insert(
            pendingSteps.map((s, i) => ({
              humor_flavor_id: data.id,
              order_by: i + 1,
              description: s.description || null,
              llm_system_prompt: s.llm_system_prompt || null,
              llm_user_prompt: s.llm_user_prompt || null,
              llm_temperature: s.llm_temperature,
              llm_input_type_id: s.llm_input_type_id,
              llm_output_type_id: s.llm_output_type_id,
              llm_model_id: s.llm_model_id,
              humor_flavor_step_type_id: s.humor_flavor_step_type_id,
              created_by_user_id: session.user.id,
              modified_by_user_id: session.user.id,
            }))
          );
        if (stepsError) throw stepsError;
      }

      setSlug('');
      setDescription('');
      setPendingSteps([]);
      await loadFlavors();
      await loadAllSteps();
      alert('Flavor created!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function deleteFlavor(id: number) {
    const { error } = await supabase.from('humor_flavors').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    loadFlavors();
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800">Humor Flavors</h1>

      {/* ── CREATE FORM ── */}
      <div className="border rounded-xl p-6 space-y-4 bg-white shadow-sm text-zinc-900">
        <h2 className="font-semibold text-lg text-gray-700">Create Flavor</h2>

        <input
          className="border border-gray-300 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="slug (e.g. dark-humor)"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />

        <textarea
          className="border border-gray-300 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* ── STEPS BUILDER ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">
              Steps{pendingSteps.length > 0 ? ` (${pendingSteps.length})` : ''}
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowMixPanel((v) => !v); setShowNewStepForm(false); }}
                className="px-3 py-1.5 text-sm rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 transition font-medium"
              >
                + Copy from existing
              </button>
              <button
                type="button"
                onClick={() => { setShowNewStepForm((v) => !v); setShowMixPanel(false); }}
                className="px-3 py-1.5 text-sm rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition font-medium"
              >
                + New step
              </button>
            </div>
          </div>

          {/* Pending steps list */}
          {pendingSteps.length === 0 && !showNewStepForm && !showMixPanel && (
            <p className="text-sm text-gray-400 italic">
              No steps yet — add a new step or copy from existing flavors.
            </p>
          )}

          {pendingSteps.map((s, i) => (
            <div key={s.key} className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700">
                  Step {i + 1}{s.description ? ` — ${s.description}` : ''}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => moveStep(s.key, 'up')}
                    disabled={i === 0}
                    className="px-2 py-0.5 text-xs rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-30"
                  >↑</button>
                  <button
                    onClick={() => moveStep(s.key, 'down')}
                    disabled={i === pendingSteps.length - 1}
                    className="px-2 py-0.5 text-xs rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-30"
                  >↓</button>
                  <button
                    onClick={() => removeStep(s.key)}
                    className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-600 hover:bg-red-200"
                  >✕</button>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Temp: {s.llm_temperature} · Input: {INPUT_TYPES.find((t) => t.id === s.llm_input_type_id)?.label ?? s.llm_input_type_id}
              </p>
              {s.llm_system_prompt && (
                <p className="text-xs text-gray-500 truncate">System: {s.llm_system_prompt}</p>
              )}
              {s.llm_user_prompt && (
                <p className="text-xs text-gray-500 truncate">User: {s.llm_user_prompt}</p>
              )}
            </div>
          ))}

          {/* New step form */}
          {showNewStepForm && (
            <div className="border border-blue-200 rounded-xl p-4 bg-blue-50 space-y-3">
              <h4 className="font-semibold text-blue-800">New Step</h4>
              <input
                className="border border-gray-300 p-2 w-full rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Step description"
                value={newStep.description}
                onChange={(e) => setNewStep((p) => ({ ...p, description: e.target.value }))}
              />
              <textarea
                className="border border-gray-300 p-2 w-full rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="System prompt"
                rows={3}
                value={newStep.llm_system_prompt}
                onChange={(e) => setNewStep((p) => ({ ...p, llm_system_prompt: e.target.value }))}
              />
              <textarea
                className="border border-gray-300 p-2 w-full rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="User prompt"
                rows={3}
                value={newStep.llm_user_prompt}
                onChange={(e) => setNewStep((p) => ({ ...p, llm_user_prompt: e.target.value }))}
              />
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-700 font-medium">Temperature</label>
                  <input
                    type="number"
                    min={0} max={2} step={0.1}
                    value={newStep.llm_temperature}
                    onChange={(e) => setNewStep((p) => ({ ...p, llm_temperature: Number(e.target.value) }))}
                    className="border border-gray-300 p-1.5 w-24 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-700 font-medium">Input type</label>
                  <select
                    value={newStep.llm_input_type_id}
                    onChange={(e) => setNewStep((p) => ({ ...p, llm_input_type_id: Number(e.target.value) }))}
                    className="border border-gray-300 p-1.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {INPUT_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-700 font-medium">Output type</label>
                  <select
                    value={newStep.llm_output_type_id}
                    onChange={(e) => setNewStep((p) => ({ ...p, llm_output_type_id: Number(e.target.value) }))}
                    className="border border-gray-300 p-1.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {OUTPUT_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-700 font-medium">Model</label>
                  <select
                    value={newStep.llm_model_id}
                    onChange={(e) => setNewStep((p) => ({ ...p, llm_model_id: Number(e.target.value) }))}
                    className="border border-gray-300 p-1.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {LLM_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-700 font-medium">Step type</label>
                  <select
                    value={newStep.humor_flavor_step_type_id}
                    onChange={(e) => setNewStep((p) => ({ ...p, humor_flavor_step_type_id: Number(e.target.value) }))}
                    className="border border-gray-300 p-1.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {STEP_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addNewStep}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition"
                >
                  Add Step
                </button>
                <button
                  onClick={() => { setShowNewStepForm(false); setNewStep(EMPTY_STEP); }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-sm transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Mix panel — copy from existing steps */}
          {showMixPanel && (
            <div className="border border-violet-200 rounded-xl p-4 bg-violet-50 space-y-3">
              <h4 className="font-semibold text-violet-800">Copy from existing steps</h4>
              {allSteps.length === 0 ? (
                <p className="text-sm text-gray-500">No existing steps found.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {allSteps.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-start justify-between gap-3 border border-violet-100 bg-white rounded-lg p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-violet-700">
                          {s.flavor_slug} · Step {s.order_by}
                        </p>
                        {s.description && (
                          <p className="text-xs text-gray-600">{s.description}</p>
                        )}
                        {s.llm_system_prompt && (
                          <p className="text-xs text-gray-400 truncate">System: {s.llm_system_prompt}</p>
                        )}
                        {s.llm_user_prompt && (
                          <p className="text-xs text-gray-400 truncate">User: {s.llm_user_prompt}</p>
                        )}
                        <p className="text-xs text-gray-400">Temp: {s.llm_temperature ?? 'N/A'}</p>
                      </div>
                      <button
                        onClick={() => copyExistingStep(s)}
                        className="shrink-0 px-3 py-1 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition font-medium"
                      >
                        Copy
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => setShowMixPanel(false)}
                className="text-sm text-violet-600 hover:underline"
              >
                Close
              </button>
            </div>
          )}
        </div>

        <button
          onClick={createFlavor}
          disabled={creating || !slug.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition font-medium disabled:opacity-50"
        >
          {creating ? 'Creating...' : 'Create Flavor'}
        </button>
      </div>

      {/* ── EXISTING FLAVORS ── */}
      <div className="space-y-3">
        {flavors.map((flavor) => (
          <div
            key={flavor.id}
            className="border p-4 rounded-lg text-zinc-900 flex justify-between items-center shadow-sm bg-white"
          >
            <div>
              <div className="font-semibold text-gray-800">{flavor.slug}</div>
              <div className="text-sm text-gray-500">{flavor.description}</div>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/admin/humor-flavors/${flavor.id}`}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition"
              >
                Open
              </Link>
              <button
                onClick={() => deleteFlavor(flavor.id)}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
