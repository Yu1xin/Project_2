'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type TermRow = {
  id: number;
  term: string | null;
  definition: string | null;
  example: string | null;
  priority: number | null;
  created_datetime_utc?: string | null;
  modified_datetime_utc?: string | null;
};

export default function TermsPage() {
  const [terms, setTerms] = useState<TermRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [newTerm, setNewTerm] = useState('');
  const [newDefinition, setNewDefinition] = useState('');
  const [newExample, setNewExample] = useState('');
  const [newPriority, setNewPriority] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTerm, setEditingTerm] = useState('');
  const [editingDefinition, setEditingDefinition] = useState('');
  const [editingExample, setEditingExample] = useState('');
  const [editingPriority, setEditingPriority] = useState('');

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  async function loadTerms() {
    setLoading(true);

    try {
      const res = await fetch('/api/admin/terms');
      const data = await res.json();
      if (!res.ok) {
        console.error('Fetch error:', data.error);
      } else {
        setTerms(data as TermRow[]);
      }
    } catch (err: any) {
      console.error('Fetch error:', err.message);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadTerms();
  }, []);

  function resetCreateForm() {
    setNewTerm('');
    setNewDefinition('');
    setNewExample('');
    setNewPriority('');
  }

  function startEdit(termRow: TermRow) {
    setEditingId(termRow.id);
    setEditingTerm(termRow.term || '');
    setEditingDefinition(termRow.definition || '');
    setEditingExample(termRow.example || '');
    setEditingPriority(
      termRow.priority === null || termRow.priority === undefined
        ? ''
        : String(termRow.priority)
    );
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingTerm('');
    setEditingDefinition('');
    setEditingExample('');
    setEditingPriority('');
  }

  async function getCurrentUserId() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!session?.user) throw new Error('Please log in first.');
    return session.user.id;
  }

  async function handleCreate() {
    if (!newTerm.trim()) {
      alert('Term cannot be empty.');
      return;
    }

    const parsedPriority =
      newPriority.trim() === '' ? null : Number(newPriority);

    if (newPriority.trim() !== '' && Number.isNaN(parsedPriority)) {
      alert('Priority must be a number.');
      return;
    }

    try {
      setCreating(true);

      const userId = await getCurrentUserId();

      const { data, error } = await supabase
        .from('terms')
        .insert({
          term: newTerm.trim(),
          definition: newDefinition.trim() || null,
          example: newExample.trim() || null,
          priority: parsedPriority,
          created_by_user_id: userId,
          modified_by_user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      setTerms((prev) => {
        const next = [data as TermRow, ...prev];
        return next.sort((a, b) => {
          const ap = a.priority ?? Number.MAX_SAFE_INTEGER;
          const bp = b.priority ?? Number.MAX_SAFE_INTEGER;
          return ap - bp;
        });
      });

      resetCreateForm();
      alert('New term created successfully!');
    } catch (err: any) {
      console.error(err);
      alert(`Failed to create term: ${err.message || 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(id: number) {
    if (!editingTerm.trim()) {
      alert('Term cannot be empty.');
      return;
    }

    const parsedPriority =
      editingPriority.trim() === '' ? null : Number(editingPriority);

    if (editingPriority.trim() !== '' && Number.isNaN(parsedPriority)) {
      alert('Priority must be a number.');
      return;
    }

    try {
      const userId = await getCurrentUserId();

      const { error } = await supabase
        .from('terms')
        .update({
          term: editingTerm.trim(),
          definition: editingDefinition.trim() || null,
          example: editingExample.trim() || null,
          priority: parsedPriority,
          modified_by_user_id: userId,
        })
        .eq('id', id);

      if (error) throw error;

      setTerms((prev) => {
        const next = prev.map((item) =>
          item.id === id
            ? {
                ...item,
                term: editingTerm.trim(),
                definition: editingDefinition.trim() || null,
                example: editingExample.trim() || null,
                priority: parsedPriority,
                modified_by_user_id: userId,
              }
            : item
        );

        return next.sort((a, b) => {
          const ap = a.priority ?? Number.MAX_SAFE_INTEGER;
          const bp = b.priority ?? Number.MAX_SAFE_INTEGER;
          return ap - bp;
        });
      });

      cancelEdit();
      alert('Term updated successfully!');
    } catch (err: any) {
      console.error(err);
      alert(`Failed to update term: ${err.message || 'Unknown error'}`);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this term?')) return;

    try {
      const { error } = await supabase.from('terms').delete().eq('id', id);

      if (error) throw error;

      setTerms((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      console.error(err);
      alert(`Failed to delete term: ${err.message || 'Unknown error'}`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-10 text-center font-mono text-zinc-400">
        Loading terms...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 flex items-center gap-3 text-3xl font-black text-zinc-900 dark:text-zinc-100">
          <span className="rounded-lg bg-purple-600 p-2 text-xl text-white">📚</span>
          Terms Management
        </h1>

        {/* CREATE NEW TERM */}
        <div className="mb-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Add New Term
          </h2>

          <div className="grid gap-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Term
              </label>
              <input
                type="text"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                placeholder="Enter term..."
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Definition
              </label>
              <textarea
                value={newDefinition}
                onChange={(e) => setNewDefinition(e.target.value)}
                rows={4}
                placeholder="Enter definition..."
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Example
              </label>
              <textarea
                value={newExample}
                onChange={(e) => setNewExample(e.target.value)}
                rows={3}
                placeholder="Optional example..."
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Priority
              </label>
              <input
                type="number"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                placeholder="Optional priority..."
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-fit rounded-2xl bg-purple-600 px-5 py-3 font-black text-white transition hover:bg-purple-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Add Term'}
            </button>
          </div>
        </div>

        {/* LIST */}
        {terms.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-zinc-800 bg-zinc-950 p-12 text-center text-zinc-100">
            <p className="font-medium text-zinc-500">No terms found...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {terms.map((t) => {
              const isEditing = editingId === t.id;

              return (
                <div
                  key={t.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-bold text-zinc-300">
                          Term
                        </label>
                        <input
                          type="text"
                          value={editingTerm}
                          onChange={(e) => setEditingTerm(e.target.value)}
                          className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-bold text-zinc-300">
                          Definition
                        </label>
                        <textarea
                          value={editingDefinition}
                          onChange={(e) => setEditingDefinition(e.target.value)}
                          rows={4}
                          className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-bold text-zinc-300">
                          Example
                        </label>
                        <textarea
                          value={editingExample}
                          onChange={(e) => setEditingExample(e.target.value)}
                          rows={3}
                          className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-bold text-zinc-300">
                          Priority
                        </label>
                        <input
                          type="number"
                          value={editingPriority}
                          onChange={(e) => setEditingPriority(e.target.value)}
                          className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate(t.id)}
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
                      <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-purple-600 dark:text-purple-400">
                          {t.term || 'Untitled Term'}
                        </h2>

                        {t.priority !== null && (
                          <span className="rounded-full bg-purple-900/40 px-3 py-1 text-xs font-bold text-purple-300">
                            Priority {t.priority}
                          </span>
                        )}
                      </div>

                      <p className="mb-3 leading-relaxed text-zinc-100">
                        {t.definition || 'No definition provided.'}
                      </p>

                      {t.example && (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm italic text-zinc-300">
                          Example: {t.example}
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between gap-4">
                        <div className="text-[10px] font-mono text-zinc-500">
                          ID: {t.id}
                          {t.created_datetime_utc && (
                            <>
                              {' '}
                              · {new Date(t.created_datetime_utc).toLocaleDateString()}
                            </>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(t)}
                            className="rounded-xl bg-blue-50 px-4 py-2 text-xs font-black text-blue-600 transition-all hover:bg-blue-600 hover:text-white"
                          >
                            EDIT
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
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