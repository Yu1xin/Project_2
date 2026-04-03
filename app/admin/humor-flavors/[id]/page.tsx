'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useParams } from 'next/navigation';

type Flavor = {
  id: number;
  slug: string | null;
  description: string | null;
};

type Step = {
  id: string;
  humor_flavor_id: number;
  order_by: number;
  description: string | null;
  llm_system_prompt: string | null;
  llm_user_prompt: string | null;
  llm_temperature: number | null;
  llm_model_id: number | null;
  llm_input_type_id: number | null;
  llm_output_type_id: number | null;
  humor_flavor_step_type_id: number | null;
};

const STEP_TYPES = [
  { id: 1, label: 'Celebrity recognition' },
  { id: 2, label: 'Image description' },
  { id: 3, label: 'General' },
];

const INPUT_TYPES = [
  { id: 1, label: 'Image + text' },
  { id: 2, label: 'Text only' },
];

const OUTPUT_TYPES = [
  { id: 1, label: 'String' },
  { id: 2, label: 'Array' },
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

export default function FlavorDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const flavorId =
    typeof rawId === 'string' ? Number(rawId) : Array.isArray(rawId) ? Number(rawId[0]) : NaN;

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [flavor, setFlavor] = useState<Flavor | null>(null);
  const [editingFlavor, setEditingFlavor] = useState(false);
  const [flavorDraft, setFlavorDraft] = useState<{ slug: string; description: string }>({ slug: '', description: '' });
  const [savingFlavor, setSavingFlavor] = useState(false);

  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Step>>({});
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addDraft, setAddDraft] = useState({
    description: '',
    llm_system_prompt: '',
    llm_user_prompt: '',
    llm_temperature: 0.7,
    llm_model_id: 5,
    llm_input_type_id: 1,
    llm_output_type_id: 1,
    humor_flavor_step_type_id: 3,
  });
  const [adding, setAdding] = useState(false);

  async function getUserId() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!session?.user) throw new Error('Not logged in.');
    return session.user.id;
  }

  async function loadSteps() {
    if (Number.isNaN(flavorId)) { setLoading(false); return; }
    setLoading(true);

    const [flavorRes, stepsRes] = await Promise.all([
      supabase.from('humor_flavors').select('id, slug, description').eq('id', flavorId).single(),
      supabase
        .from('humor_flavor_steps')
        .select('id, humor_flavor_id, order_by, description, llm_system_prompt, llm_user_prompt, llm_temperature, llm_model_id, llm_input_type_id, llm_output_type_id, humor_flavor_step_type_id')
        .eq('humor_flavor_id', flavorId)
        .order('order_by', { ascending: true }),
    ]);

    if (flavorRes.error) { console.error(flavorRes.error); }
    else setFlavor(flavorRes.data as Flavor);

    if (stepsRes.error) { console.error(stepsRes.error); alert(stepsRes.error.message); }
    else setSteps((stepsRes.data as Step[]) || []);

    setLoading(false);
  }

  async function saveFlavor() {
    if (!flavor) return;
    setSavingFlavor(true);
    const userId = await getUserId();
    const { error } = await supabase
      .from('humor_flavors')
      .update({ slug: flavorDraft.slug || null, description: flavorDraft.description || null, modified_by_user_id: userId })
      .eq('id', flavorId);
    if (error) {
      alert(error.message);
    } else {
      setFlavor((prev) => prev ? { ...prev, slug: flavorDraft.slug || null, description: flavorDraft.description || null } : prev);
      setEditingFlavor(false);
    }
    setSavingFlavor(false);
  }

  useEffect(() => { loadSteps(); }, [flavorId]);

  function startEdit(step: Step) {
    setEditingId(step.id);
    setEditDraft({ ...step });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft({});
  }

  async function saveEdit(stepId: string) {
    setSaving(true);
    const userId = await getUserId();
    const { error } = await supabase
      .from('humor_flavor_steps')
      .update({
        description: editDraft.description || null,
        llm_system_prompt: editDraft.llm_system_prompt || null,
        llm_user_prompt: editDraft.llm_user_prompt || null,
        llm_temperature: editDraft.llm_temperature ?? null,
        llm_model_id: editDraft.llm_model_id ?? null,
        llm_input_type_id: editDraft.llm_input_type_id ?? null,
        llm_output_type_id: editDraft.llm_output_type_id ?? null,
        humor_flavor_step_type_id: editDraft.humor_flavor_step_type_id ?? null,
        modified_by_user_id: userId,
      })
      .eq('id', stepId);

    if (error) { alert(error.message); }
    else {
      setSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, ...editDraft } as Step : s))
      );
      setEditingId(null);
      setEditDraft({});
    }
    setSaving(false);
  }

  async function moveStep(stepId: string, dir: 'up' | 'down') {
    const idx = steps.findIndex((s) => s.id === stepId);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= steps.length) return;

    const reordered = [...steps];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];

    // Optimistic update
    const withNewOrder = reordered.map((s, i) => ({ ...s, order_by: i + 1 }));
    setSteps(withNewOrder);

    setReordering(true);
    const updates = [
      supabase.from('humor_flavor_steps').update({ order_by: idx + 1 }).eq('id', reordered[swapIdx].id),
      supabase.from('humor_flavor_steps').update({ order_by: swapIdx + 1 }).eq('id', reordered[idx].id),
    ];
    const results = await Promise.all(updates);
    const err = results.find((r) => r.error)?.error;
    if (err) { alert(err.message); await loadSteps(); }
    setReordering(false);
  }

  async function addStep() {
    setAdding(true);
    const userId = await getUserId();
    const nextOrder = steps.length > 0 ? Math.max(...steps.map((s) => s.order_by)) + 1 : 1;
    const { data, error } = await supabase
      .from('humor_flavor_steps')
      .insert({
        humor_flavor_id: flavorId,
        order_by: nextOrder,
        description: addDraft.description || null,
        llm_system_prompt: addDraft.llm_system_prompt || null,
        llm_user_prompt: addDraft.llm_user_prompt || null,
        llm_temperature: addDraft.llm_temperature,
        llm_model_id: addDraft.llm_model_id,
        llm_input_type_id: addDraft.llm_input_type_id,
        llm_output_type_id: addDraft.llm_output_type_id,
        humor_flavor_step_type_id: addDraft.humor_flavor_step_type_id,
        created_by_user_id: userId,
        modified_by_user_id: userId,
      })
      .select()
      .single();

    if (error) {
      alert(error.message);
    } else {
      setSteps((prev) => [...prev, data as Step]);
      setAddDraft({
        description: '',
        llm_system_prompt: '',
        llm_user_prompt: '',
        llm_temperature: 0.7,
        llm_model_id: 5,
        llm_input_type_id: 1,
        llm_output_type_id: 1,
        humor_flavor_step_type_id: 3,
      });
      setShowAddForm(false);
    }
    setAdding(false);
  }

  async function deleteStep(stepId: string) {
    if (!confirm('Delete this step?')) return;
    const { error } = await supabase.from('humor_flavor_steps').delete().eq('id', stepId);
    if (error) { alert(error.message); return; }
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
  }

  if (Number.isNaN(flavorId)) {
    return <div className="p-8 text-red-600">Invalid flavor ID.</div>;
  }

  if (loading) {
    return <div className="p-8 text-gray-600">Loading steps...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8 space-y-6">
      {/* Flavor metadata */}
      <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-5">
        {editingFlavor ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Name (slug)</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={flavorDraft.slug}
                onChange={(e) => setFlavorDraft((d) => ({ ...d, slug: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
              <textarea
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={flavorDraft.description}
                onChange={(e) => setFlavorDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveFlavor}
                disabled={savingFlavor}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
              >{savingFlavor ? 'Saving...' : 'Save'}</button>
              <button
                onClick={() => setEditingFlavor(false)}
                disabled={savingFlavor}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded-lg transition"
              >Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{flavor?.slug ?? `Flavor ${flavorId}`}</h1>
              {flavor?.description && (
                <p className="mt-1 text-sm text-gray-500">{flavor.description}</p>
              )}
            </div>
            <button
              onClick={() => { setFlavorDraft({ slug: flavor?.slug ?? '', description: flavor?.description ?? '' }); setEditingFlavor(true); }}
              className="shrink-0 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition"
            >Edit name &amp; description</button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Steps</h2>
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">{steps.length} step{steps.length !== 1 ? 's' : ''}</p>
          <button
            onClick={() => { setShowAddForm((v) => !v); setEditingId(null); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
          >
            {showAddForm ? 'Cancel' : '+ Add Step'}
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="border border-blue-200 rounded-xl bg-blue-50 p-5 space-y-3">
          <h2 className="font-semibold text-blue-800">New Step {steps.length + 1}</h2>

          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Step description"
            value={addDraft.description}
            onChange={(e) => setAddDraft((d) => ({ ...d, description: e.target.value }))}
          />
          <textarea
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="System prompt"
            value={addDraft.llm_system_prompt}
            onChange={(e) => setAddDraft((d) => ({ ...d, llm_system_prompt: e.target.value }))}
          />
          <textarea
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="User prompt"
            value={addDraft.llm_user_prompt}
            onChange={(e) => setAddDraft((d) => ({ ...d, llm_user_prompt: e.target.value }))}
          />

          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Temperature</label>
              <input
                type="number" min={0} max={2} step={0.1}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={addDraft.llm_temperature}
                onChange={(e) => setAddDraft((d) => ({ ...d, llm_temperature: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Model</label>
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={addDraft.llm_model_id}
                onChange={(e) => setAddDraft((d) => ({ ...d, llm_model_id: Number(e.target.value) }))}
              >
                {LLM_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Input type</label>
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={addDraft.llm_input_type_id}
                onChange={(e) => setAddDraft((d) => ({ ...d, llm_input_type_id: Number(e.target.value) }))}
              >
                {INPUT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Output type</label>
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={addDraft.llm_output_type_id}
                onChange={(e) => setAddDraft((d) => ({ ...d, llm_output_type_id: Number(e.target.value) }))}
              >
                {OUTPUT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Step type</label>
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={addDraft.humor_flavor_step_type_id}
                onChange={(e) => setAddDraft((d) => ({ ...d, humor_flavor_step_type_id: Number(e.target.value) }))}
              >
                {STEP_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={addStep}
              disabled={adding}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
            >
              {adding ? 'Adding...' : 'Add Step'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {steps.length === 0 ? (
        <div className="text-gray-500 text-lg">No steps found for this flavor.</div>
      ) : (
        <div className="space-y-4">
          {steps.map((step, idx) => {
            const isEditing = editingId === step.id;

            return (
              <div key={step.id} className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
                {/* Step header */}
                <div className="flex items-center justify-between bg-gray-50 px-5 py-3 border-b border-gray-200">
                  <span className="font-bold text-gray-800">Step {idx + 1}</span>

                  <div className="flex items-center gap-2">
                    {/* Reorder buttons */}
                    <button
                      onClick={() => moveStep(step.id, 'up')}
                      disabled={idx === 0 || reordering || isEditing}
                      className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-30 transition"
                      title="Move up"
                    >↑</button>
                    <button
                      onClick={() => moveStep(step.id, 'down')}
                      disabled={idx === steps.length - 1 || reordering || isEditing}
                      className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-30 transition"
                      title="Move down"
                    >↓</button>

                    {isEditing ? (
                      <>
                        <button
                          onClick={() => saveEdit(step.id)}
                          disabled={saving}
                          className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-50"
                        >{saving ? 'Saving...' : 'Save'}</button>
                        <button
                          onClick={cancelEdit}
                          disabled={saving}
                          className="px-3 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300 text-gray-700 transition"
                        >Cancel</button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(step)}
                          className="px-3 py-1 text-xs rounded bg-green-100 hover:bg-green-200 text-green-700 font-semibold transition"
                        >Edit</button>
                        <button
                          onClick={() => deleteStep(step.id)}
                          className="px-3 py-1 text-xs rounded bg-red-100 hover:bg-red-200 text-red-600 font-semibold transition"
                        >Delete</button>
                      </>
                    )}
                  </div>
                </div>

                {/* Step body */}
                <div className="p-5 space-y-4">
                  {isEditing ? (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
                        <input
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          value={editDraft.description ?? ''}
                          onChange={(e) => setEditDraft((d) => ({ ...d, description: e.target.value }))}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">System Prompt</label>
                        <textarea
                          rows={5}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          value={editDraft.llm_system_prompt ?? ''}
                          onChange={(e) => setEditDraft((d) => ({ ...d, llm_system_prompt: e.target.value }))}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">User Prompt</label>
                        <textarea
                          rows={5}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          value={editDraft.llm_user_prompt ?? ''}
                          onChange={(e) => setEditDraft((d) => ({ ...d, llm_user_prompt: e.target.value }))}
                        />
                      </div>

                      <div className="flex flex-wrap gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Temperature</label>
                          <input
                            type="number" min={0} max={2} step={0.1}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={editDraft.llm_temperature ?? ''}
                            onChange={(e) => setEditDraft((d) => ({ ...d, llm_temperature: Number(e.target.value) }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Model</label>
                          <select
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={editDraft.llm_model_id ?? ''}
                            onChange={(e) => setEditDraft((d) => ({ ...d, llm_model_id: Number(e.target.value) }))}
                          >
                            {LLM_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Input type</label>
                          <select
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={editDraft.llm_input_type_id ?? ''}
                            onChange={(e) => setEditDraft((d) => ({ ...d, llm_input_type_id: Number(e.target.value) }))}
                          >
                            {INPUT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Output type</label>
                          <select
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={editDraft.llm_output_type_id ?? ''}
                            onChange={(e) => setEditDraft((d) => ({ ...d, llm_output_type_id: Number(e.target.value) }))}
                          >
                            {OUTPUT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Step type</label>
                          <select
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={editDraft.humor_flavor_step_type_id ?? ''}
                            onChange={(e) => setEditDraft((d) => ({ ...d, humor_flavor_step_type_id: Number(e.target.value) }))}
                          >
                            {STEP_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                          </select>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {step.description && (
                        <p className="text-sm text-gray-700"><span className="font-semibold">Description:</span> {step.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="bg-gray-100 rounded px-2 py-1 text-gray-600">Temp: {step.llm_temperature ?? 'N/A'}</span>
                        <span className="bg-gray-100 rounded px-2 py-1 text-gray-600">Model: {LLM_MODELS.find((m) => m.id === step.llm_model_id)?.name ?? step.llm_model_id ?? 'N/A'}</span>
                        <span className="bg-gray-100 rounded px-2 py-1 text-gray-600">Input: {INPUT_TYPES.find((t) => t.id === step.llm_input_type_id)?.label ?? 'N/A'}</span>
                        <span className="bg-gray-100 rounded px-2 py-1 text-gray-600">Output: {OUTPUT_TYPES.find((t) => t.id === step.llm_output_type_id)?.label ?? 'N/A'}</span>
                        <span className="bg-gray-100 rounded px-2 py-1 text-gray-600">Type: {STEP_TYPES.find((t) => t.id === step.humor_flavor_step_type_id)?.label ?? 'N/A'}</span>
                      </div>
                      {step.llm_system_prompt && (
                        <div>
                          <div className="text-xs font-semibold text-gray-500 mb-1">System Prompt</div>
                          <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 border border-gray-200 p-3 rounded-lg overflow-x-auto">{step.llm_system_prompt}</pre>
                        </div>
                      )}
                      {step.llm_user_prompt && (
                        <div>
                          <div className="text-xs font-semibold text-gray-500 mb-1">User Prompt</div>
                          <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 border border-gray-200 p-3 rounded-lg overflow-x-auto">{step.llm_user_prompt}</pre>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
