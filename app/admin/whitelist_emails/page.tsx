'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type WhitelistEmailRow = {
  id: number;
  created_datetime_utc: string | null;
  modified_datetime_utc: string | null;
  email_address: string | null;
  created_by_user_id: string | null;
  modified_by_user_id: string | null;
};

export default function WhitelistEmailAddressesPage() {
  const [emails, setEmails] = useState<WhitelistEmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [newEmail, setNewEmail] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingEmail, setEditingEmail] = useState('');

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  async function loadEmails() {
    setLoading(true);

    try {
      const res = await fetch('/api/admin/whitelist-emails');
      const data = await res.json();
      if (!res.ok) {
        console.error('Fetch error:', data.error);
      } else {
        setEmails(data as WhitelistEmailRow[]);
      }
    } catch (err: any) {
      console.error('Fetch error:', err.message);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadEmails();
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
    setNewEmail('');
  }

  function startEdit(row: WhitelistEmailRow) {
    setEditingId(row.id);
    setEditingEmail(row.email_address || '');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingEmail('');
  }

  async function handleCreate() {
    if (!newEmail.trim()) {
      alert('Email address cannot be empty.');
      return;
    }

    try {
      setCreating(true);

      const userId = await getCurrentUserId();
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('whitelist_email_addresses')
        .insert({
          email_address: newEmail.trim(),
          created_datetime_utc: now,
          modified_datetime_utc: now,
          created_by_user_id: userId,
          modified_by_user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      setEmails((prev) => [data as WhitelistEmailRow, ...prev]);
      resetCreateForm();
      alert('Whitelist email added successfully!');
    } catch (err: any) {
      console.error(err);
      alert(`Failed to create whitelist email: ${err.message || 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(id: number) {
    if (!editingEmail.trim()) {
      alert('Email address cannot be empty.');
      return;
    }

    try {
      const userId = await getCurrentUserId();
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('whitelist_email_addresses')
        .update({
          email_address: editingEmail.trim(),
          modified_datetime_utc: now,
          modified_by_user_id: userId,
        })
        .eq('id', id);

      if (error) throw error;

      setEmails((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                email_address: editingEmail.trim(),
                modified_datetime_utc: now,
                modified_by_user_id: userId,
              }
            : item
        )
      );

      cancelEdit();
      alert('Whitelist email updated successfully!');
    } catch (err: any) {
      console.error(err);
      alert(`Failed to update whitelist email: ${err.message || 'Unknown error'}`);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this whitelist email?')) return;

    try {
      const { error } = await supabase
        .from('whitelist_email_addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEmails((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      console.error(err);
      alert(`Failed to delete whitelist email: ${err.message || 'Unknown error'}`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-10 text-center font-mono text-zinc-100">
        Loading whitelist email addresses...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 flex items-center gap-3 text-3xl font-black text-zinc-900 dark:text-zinc-100">
          <span className="rounded-lg bg-amber-600 p-2 text-xl text-white">📧</span>
          Whitelist Email Addresses
        </h1>

        <div className="mb-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Add New Whitelist Email
          </h2>

          <div className="grid gap-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Email Address
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter email address..."
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-fit rounded-2xl bg-amber-600 px-5 py-3 font-black text-white transition hover:bg-amber-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Add Email'}
            </button>
          </div>
        </div>

        {emails.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-zinc-800 bg-zinc-950 p-12 text-center text-zinc-100">
            <p className="font-medium text-zinc-100">
              No whitelist email addresses found...
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {emails.map((email) => {
              const isEditing = editingId === email.id;

              return (
                <div
                  key={email.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-bold text-zinc-300">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={editingEmail}
                          onChange={(e) => setEditingEmail(e.target.value)}
                          className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate(email.id)}
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
                      <div className="mb-3 flex justify-between items-start gap-4">
                        <div>
                          <h2 className="text-xl font-bold text-amber-600 dark:text-amber-400 break-all">
                            {email.email_address || 'No Email Address'}
                          </h2>
                        </div>

                        <span className="rounded uppercase bg-zinc-800 px-2 py-1 text-[10px] font-mono text-zinc-100">
                          ID: {email.id}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm text-zinc-100">
                        <p>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">Created By:</span>{' '}
                          <span className="font-mono text-xs">
                            {email.created_by_user_id || 'N/A'}
                          </span>
                        </p>
                        <p>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">Modified By:</span>{' '}
                          <span className="font-mono text-xs">
                            {email.modified_by_user_id || 'N/A'}
                          </span>
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-4">
                        <div className="text-[10px] font-mono text-zinc-100">
                          {email.created_datetime_utc && (
                            <>Created: {new Date(email.created_datetime_utc).toLocaleString()}</>
                          )}
                          {email.modified_datetime_utc && (
                            <> · Modified: {new Date(email.modified_datetime_utc).toLocaleString()}</>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(email)}
                            className="rounded-xl bg-blue-50 px-4 py-2 text-xs font-black text-blue-600 transition-all hover:bg-blue-600 hover:text-white"
                          >
                            EDIT
                          </button>
                          <button
                            onClick={() => handleDelete(email.id)}
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