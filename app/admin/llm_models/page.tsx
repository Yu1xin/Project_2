'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type LlmModelRow = {
  id: number;
  name: string | null;
  llm_provider_id: number | null;
  provider_model_id: string | null;
  is_temperature_supported: boolean | null;
  created_datetime_utc?: string | null;
  modified_datetime_utc?: string | null;
  created_by_user_id?: string | null;
  modified_by_user_id?: string | null;
};

export default function LlmModelsPage() {
  const [models, setModels] = useState<LlmModelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // create form state
  const [newName, setNewName] = useState('');
  const [newProviderId, setNewProviderId] = useState('');
  const [newProviderModelId, setNewProviderModelId] = useState('');
  const [newIsTemperatureSupported, setNewIsTemperatureSupported] = useState(false);

  // edit form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingProviderId, setEditingProviderId] = useState('');
  const [editingProviderModelId, setEditingProviderModelId] = useState('');
  const [editingIsTemperatureSupported, setEditingIsTemperatureSupported] = useState(false);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const tableName = 'llm_models';

  async function loadModels() {
    setLoading(true);

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_datetime_utc', { ascending: false });

    if (error) {
      console.error('Fetch error:', error.message);
    } else {
      setModels((data || []) as LlmModelRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadModels();
  }, []);

  async function getCurrentUserId() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw error;
    if (!session?.user) throw new Error('Please log in first.');

    return session.user.id;
  }

  function resetCreateForm() {
    setNewName('');
    setNewProviderId('');
    setNewProviderModelId('');
    setNewIsTemperatureSupported(false);
  }

  function startEdit(model: LlmModelRow) {
    setEditingId(model.id);
    setEditingName(model.name || '');
    setEditingProviderId(
      model.llm_provider_id === null || model.llm_provider_id === undefined
        ? ''
        : String(model.llm_provider_id)
    );
    setEditingProviderModelId(model.provider_model_id || '');
    setEditingIsTemperatureSupported(Boolean(model.is_temperature_supported));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName('');
    setEditingProviderId('');
    setEditingProviderModelId('');
    setEditingIsTemperatureSupported(false);
  }

  async function handleCreate() {
    if (!newName.trim()) {
      alert('Model name cannot be empty.');
      return;
    }

    const parsedProviderId =
      newProviderId.trim() === '' ? null : Number(newProviderId);

    if (parsedProviderId !== null && Number.isNaN(parsedProviderId)) {
      alert('Provider ID must be a number.');
      return;
    }

    try {
      setCreating(true);

      const userId = await getCurrentUserId();
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from(tableName)
        .insert({
          name: newName.trim(),
          llm_provider_id: parsedProviderId,
          provider_model_id: newProviderModelId.trim() || null,
          is_temperature_supported: newIsTemperatureSupported,
          created_datetime_utc: now,
          modified_datetime_utc: now,
          created_by_user_id: userId,
          modified_by_user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      setModels((prev) => [data as LlmModelRow, ...prev]);
      resetCreateForm();
      alert('LLM model created successfully!');
    } catch (err: any) {
      console.error(err);
      alert(`Failed to create model: ${err.message || 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(id: number) {
    if (!editingName.trim()) {
      alert('Model name cannot be empty.');
      return;
    }

    const parsedProviderId =
      editingProviderId.trim() === '' ? null : Number(editingProviderId);

    if (parsedProviderId !== null && Number.isNaN(parsedProviderId)) {
      alert('Provider ID must be a number.');
      return;
    }

    try {
      const userId = await getCurrentUserId();
      const now = new Date().toISOString();

      const { error } = await supabase
        .from(tableName)
        .update({
          name: editingName.trim(),
          llm_provider_id: parsedProviderId,
          provider_model_id: editingProviderModelId.trim() || null,
          is_temperature_supported: editingIsTemperatureSupported,
          modified_datetime_utc: now,
          modified_by_user_id: userId,
        })
        .eq('id', id);

      if (error) throw error;

      setModels((prev) =>
        prev.map((model) =>
          model.id === id
            ? {
                ...model,
                name: editingName.trim(),
                llm_provider_id: parsedProviderId,
                provider_model_id: editingProviderModelId.trim() || null,
                is_temperature_supported: editingIsTemperatureSupported,
                modified_datetime_utc: now,
                modified_by_user_id: userId,
              }
            : model
        )
      );

      cancelEdit();
      alert('LLM model updated successfully!');
    } catch (err: any) {
      console.error(err);
      alert(`Failed to update model: ${err.message || 'Unknown error'}`);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this model?')) return;

    try {
      const { error } = await supabase.from(tableName).delete().eq('id', id);

      if (error) throw error;

      setModels((prev) => prev.filter((model) => model.id !== id));
    } catch (err: any) {
      console.error(err);
      alert(`Failed to delete model: ${err.message || 'Unknown error'}`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-10 text-center font-mono text-zinc-100">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-black text-zinc-100">
          LLM Models Management
        </h1>

        <div className="mb-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-zinc-100">
            Add New LLM Model
          </h2>

          <div className="grid gap-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Model Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter model name..."
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                LLM Provider ID
              </label>
              <input
                type="text"
                value={newProviderId}
                onChange={(e) => setNewProviderId(e.target.value)}
                placeholder="Enter provider ID..."
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Provider Model ID
              </label>
              <input
                type="text"
                value={newProviderModelId}
                onChange={(e) => setNewProviderModelId(e.target.value)}
                placeholder="Enter provider model ID..."
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <label className="flex items-center gap-3 text-sm font-bold text-zinc-300">
              <input
                type="checkbox"
                checked={newIsTemperatureSupported}
                onChange={(e) => setNewIsTemperatureSupported(e.target.checked)}
              />
              Temperature Supported
            </label>

            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-fit rounded-2xl bg-blue-600 px-5 py-3 font-black text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Add Model'}
            </button>
          </div>
        </div>

        {models.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-zinc-800 bg-zinc-950 p-12 text-center text-zinc-100">
            <p className="font-medium text-zinc-400">No models found...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {models.map((model) => {
              const isEditing = editingId === model.id;

              return (
                <div
                  key={model.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-bold text-zinc-300">
                          Model Name
                        </label>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-bold text-zinc-300">
                          LLM Provider ID
                        </label>
                        <input
                          type="text"
                          value={editingProviderId}
                          onChange={(e) => setEditingProviderId(e.target.value)}
                          className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-bold text-zinc-300">
                          Provider Model ID
                        </label>
                        <input
                          type="text"
                          value={editingProviderModelId}
                          onChange={(e) => setEditingProviderModelId(e.target.value)}
                          className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <label className="flex items-center gap-3 text-sm font-bold text-zinc-300">
                        <input
                          type="checkbox"
                          checked={editingIsTemperatureSupported}
                          onChange={(e) =>
                            setEditingIsTemperatureSupported(e.target.checked)
                          }
                        />
                        Temperature Supported
                      </label>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate(model.id)}
                          className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-white transition-all hover:bg-emerald-600"
                        >
                          SAVE
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded-xl bg-zinc-800 px-4 py-2 text-xs font-black text-zinc-300 transition-all hover:bg-zinc-700"
                        >
                          CANCEL
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-3 flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <h2 className="text-xl font-bold text-blue-400">
                            {model.name || 'Unnamed Model'}
                          </h2>
                          <p className="text-sm text-zinc-300">
                            LLM Provider ID: {model.llm_provider_id ?? 'N/A'}
                          </p>
                          <p className="text-sm text-zinc-300">
                            Provider Model ID: {model.provider_model_id || 'N/A'}
                          </p>
                          <p className="text-sm text-zinc-300">
                            Temperature Supported:{' '}
                            {model.is_temperature_supported ? 'true' : 'false'}
                          </p>
                        </div>

                        <span className="rounded bg-zinc-800 px-2 py-1 text-[10px] font-mono uppercase text-zinc-100">
                          ID: {model.id}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-4">
                        <div className="text-[10px] font-mono text-zinc-500">
                          {model.created_datetime_utc && (
                            <>Created: {new Date(model.created_datetime_utc).toLocaleString()}</>
                          )}
                          {model.modified_datetime_utc && (
                            <> · Modified: {new Date(model.modified_datetime_utc).toLocaleString()}</>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(model)}
                            className="rounded-xl bg-blue-50 px-4 py-2 text-xs font-black text-blue-600 transition-all hover:bg-blue-600 hover:text-white"
                          >
                            EDIT
                          </button>
                          <button
                            onClick={() => handleDelete(model.id)}
                            className="rounded-xl bg-red-50 px-4 py-2 text-xs font-black text-red-600 transition-all hover:bg-red-600 hover:text-white"
                          >
                            DELETE
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
