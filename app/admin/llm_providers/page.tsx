'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type LlmProviderRow = {
  id: number;
  name: string | null;
  created_by_user_id?: string | null;
  modified_by_user_id?: string | null;
  created_datetime_utc?: string | null;
  modified_datetime_utc?: string | null;
};

export default function LlmProvidersPage() {
  const [providers, setProviders] = useState<LlmProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // create form state
  const [newName, setNewName] = useState('');

  // edit form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const tableName = 'llm_providers';

  async function loadProviders() {
    setLoading(true);

    try {
      const res = await fetch('/api/admin/llm-providers');
      const data = await res.json();
      if (!res.ok) {
        console.error('Fetch error:', data.error);
      } else {
        setProviders(data as LlmProviderRow[]);
      }
    } catch (err: any) {
      console.error('Fetch error:', err.message);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadProviders();
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
  }

  function startEdit(provider: LlmProviderRow) {
    setEditingId(provider.id);
    setEditingName(provider.name || '');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName('');
  }

  async function handleCreate() {
    if (!newName.trim()) {
      alert('Provider name cannot be empty.');
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
          created_datetime_utc: now,
          modified_datetime_utc: now,
          created_by_user_id: userId,
          modified_by_user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      setProviders((prev) => [data as LlmProviderRow, ...prev]);
      resetCreateForm();
      alert('LLM provider created successfully!');
    } catch (err: any) {
      console.error(err);
      alert(`Failed to create provider: ${err.message || 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(id: number) {
    if (!editingName.trim()) {
      alert('Provider name cannot be empty.');
      return;
    }

    try {
      const userId = await getCurrentUserId();
      const now = new Date().toISOString();

      const { error } = await supabase
        .from(tableName)
        .update({
          name: editingName.trim(),
          modified_datetime_utc: now,
          modified_by_user_id: userId,
        })
        .eq('id', id);

      if (error) throw error;

      setProviders((prev) =>
        prev.map((provider) =>
          provider.id === id
            ? {
                ...provider,
                name: editingName.trim(),
                modified_datetime_utc: now,
                modified_by_user_id: userId,
              }
            : provider
        )
      );

      cancelEdit();
      alert('LLM provider updated successfully!');
    } catch (err: any) {
      console.error(err);
      alert(`Failed to update provider: ${err.message || 'Unknown error'}`);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this provider?')) return;

    try {
      const { error } = await supabase.from(tableName).delete().eq('id', id);

      if (error) throw error;

      setProviders((prev) => prev.filter((provider) => provider.id !== id));
    } catch (err: any) {
      console.error(err);
      alert(`Failed to delete provider: ${err.message || 'Unknown error'}`);
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
          LLM Providers Management
        </h1>

        <div className="mb-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-zinc-100">
            Add New LLM Provider
          </h2>

          <div className="grid gap-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Provider Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter provider name..."
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-fit rounded-2xl bg-blue-600 px-5 py-3 font-black text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Add Provider'}
            </button>
          </div>
        </div>

        {providers.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-zinc-800 bg-zinc-950 p-12 text-center text-zinc-100">
            <p className="font-medium text-zinc-400">No providers found...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {providers.map((provider) => {
              const isEditing = editingId === provider.id;

              return (
                <div
                  key={provider.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-bold text-zinc-300">
                          Provider Name
                        </label>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate(provider.id)}
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
                            {provider.name || 'Unnamed Provider'}
                          </h2>
                        </div>

                        <span className="rounded bg-zinc-800 px-2 py-1 text-[10px] font-mono uppercase text-zinc-100">
                          ID: {provider.id}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-4">
                        <div className="text-[10px] font-mono text-zinc-500">
                          {provider.created_datetime_utc && (
                            <>Created: {new Date(provider.created_datetime_utc).toLocaleString()}</>
                          )}
                          {provider.modified_datetime_utc && (
                            <> · Modified: {new Date(provider.modified_datetime_utc).toLocaleString()}</>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(provider)}
                            className="rounded-xl bg-blue-50 px-4 py-2 text-xs font-black text-blue-600 transition-all hover:bg-blue-600 hover:text-white"
                          >
                            EDIT
                          </button>
                          <button
                            onClick={() => handleDelete(provider.id)}
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