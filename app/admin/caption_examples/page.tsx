'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type CaptionExampleRow = {
  id: string;
  caption: string | null;
  explanation: string | null;
  image_description: string | null;
  priority: number | null;
  image_id: string | null;
  created_by_user_id: string | null;
  modified_by_user_id: string | null;
  created_datetime_utc?: string | null;
  modified_datetime_utc?: string | null;
};

type ImageRow = {
  id: string;
  url: string | null;
  image_description: string | null;
};

export default function AdminCaptionExamplesPage() {
  const [captionExamples, setCaptionExamples] = useState<CaptionExampleRow[]>([]);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [newCaption, setNewCaption] = useState('');
  const [newExplanation, setNewExplanation] = useState('');
  const [newImageDescription, setNewImageDescription] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [newImageId, setNewImageId] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCaption, setEditingCaption] = useState('');
  const [editingExplanation, setEditingExplanation] = useState('');
  const [editingImageDescription, setEditingImageDescription] = useState('');
  const [editingPriority, setEditingPriority] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function loadData() {
    setLoading(true);

    const [captionExamplesRes, imagesRes] = await Promise.all([
      supabase
        .from('caption_examples')
        .select('*')
        .order('created_datetime_utc', { ascending: false }),
      supabase
        .from('images')
        .select('id, url, image_description')
        .order('created_datetime_utc', { ascending: false }),
    ]);

    if (captionExamplesRes.error) {
      console.error('Fetch caption_examples error:', captionExamplesRes.error.message);
    } else {
      setCaptionExamples((captionExamplesRes.data || []) as CaptionExampleRow[]);
    }

    if (imagesRes.error) {
      console.error('Fetch images error:', imagesRes.error.message);
    } else {
      setImages((imagesRes.data || []) as ImageRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
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

  const handleCreate = async () => {
    if (!newCaption.trim()) {
      alert('Caption cannot be empty.');
      return;
    }

    if (!newImageId) {
      alert('Please select an image.');
      return;
    }

    try {
      setCreating(true);

      const userId = await getCurrentUserId();
      const now = new Date().toISOString();

      const priorityValue =
        newPriority.trim() === '' ? null : Number.parseInt(newPriority, 10);

      if (newPriority.trim() !== '' && Number.isNaN(priorityValue)) {
        alert('Priority must be a number.');
        return;
      }

      const { data, error } = await supabase
        .from('caption_examples')
        .insert({
          caption: newCaption.trim(),
          explanation: newExplanation.trim() || null,
          image_description: newImageDescription.trim() || null,
          priority: priorityValue,
          image_id: newImageId,
          created_datetime_utc: now,
          modified_datetime_utc: now,
          created_by_user_id: userId,
          modified_by_user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      setCaptionExamples((prev) => [data as CaptionExampleRow, ...prev]);
      setNewCaption('');
      setNewExplanation('');
      setNewImageDescription('');
      setNewPriority('');
      setNewImageId('');

      alert('New caption example created successfully!');
    } catch (err: any) {
      console.error(err);
      alert(`Failed to create caption example: ${err.message || 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (row: CaptionExampleRow) => {
    setEditingId(row.id);
    setEditingCaption(row.caption || '');
    setEditingExplanation(row.explanation || '');
    setEditingImageDescription(row.image_description || '');
    setEditingPriority(row.priority == null ? '' : String(row.priority));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingCaption('');
    setEditingExplanation('');
    setEditingImageDescription('');
    setEditingPriority('');
  };

  const handleUpdate = async (id: string) => {
    if (!editingCaption.trim()) {
      alert('Caption cannot be empty.');
      return;
    }

    try {
      const userId = await getCurrentUserId();
      const now = new Date().toISOString();

      const priorityValue =
        editingPriority.trim() === '' ? null : Number.parseInt(editingPriority, 10);

      if (editingPriority.trim() !== '' && Number.isNaN(priorityValue)) {
        alert('Priority must be a number.');
        return;
      }

      const { error } = await supabase
        .from('caption_examples')
        .update({
          caption: editingCaption.trim(),
          explanation: editingExplanation.trim() || null,
          image_description: editingImageDescription.trim() || null,
          priority: priorityValue,
          modified_datetime_utc: now,
          modified_by_user_id: userId,
        })
        .eq('id', id);

      if (error) throw error;

      setCaptionExamples((prev) =>
        prev.map((row) =>
          row.id === id
            ? {
                ...row,
                caption: editingCaption.trim(),
                explanation: editingExplanation.trim() || null,
                image_description: editingImageDescription.trim() || null,
                priority: priorityValue,
                modified_datetime_utc: now,
                modified_by_user_id: userId,
              }
            : row
        )
      );

      cancelEdit();
      alert('Caption example updated successfully!');
    } catch (err: any) {
      console.error(err);
      alert(`Failed to update caption example: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this caption example?')) return;

    const { error } = await supabase.from('caption_examples').delete().eq('id', id);

    if (error) {
      alert('Failed to delete: ' + error.message);
    } else {
      setCaptionExamples((prev) => prev.filter((row) => row.id !== id));
    }
  };

  if (loading) {
    return <div className="p-10 ml-64 font-mono">loading...</div>;
  }

  return (
    <div className="p-10 ml-64 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-3">
          <span className="bg-orange-500 text-white p-2 rounded-lg text-xl">📝</span>
          Caption Examples Management
        </h1>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">
            Create New Caption Example
          </h2>

          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">
                Caption
              </label>
              <textarea
                value={newCaption}
                onChange={(e) => setNewCaption(e.target.value)}
                rows={4}
                placeholder="Write a new caption here..."
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">
                Explanation
              </label>
              <textarea
                value={newExplanation}
                onChange={(e) => setNewExplanation(e.target.value)}
                rows={3}
                placeholder="Optional explanation..."
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">
                Image Description
              </label>
              <textarea
                value={newImageDescription}
                onChange={(e) => setNewImageDescription(e.target.value)}
                rows={3}
                placeholder="Optional image description for this example..."
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">
                Priority
              </label>
              <input
                type="number"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                placeholder="Optional priority"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">
                Select Image
              </label>
              <select
                value={newImageId}
                onChange={(e) => setNewImageId(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="">Choose an image...</option>
                {images.map((img) => (
                  <option key={img.id} value={img.id}>
                    {img.image_description
                      ? `${img.image_description} (${img.id.substring(0, 8)})`
                      : img.id.substring(0, 8)}
                  </option>
                ))}
              </select>

              {newImageId && (
                <div className="mt-3">
                  <img
                    src={images.find((img) => img.id === newImageId)?.url || ''}
                    alt="Selected"
                    className="w-40 h-28 object-cover rounded-xl border border-slate-100"
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-fit px-5 py-3 rounded-2xl bg-orange-500 text-white font-black hover:bg-orange-600 transition disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Caption Example'}
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          {captionExamples.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center">
              <p className="text-slate-400 font-medium">
                No caption example data for now...
              </p>
            </div>
          ) : (
            captionExamples.map((row) => {
              const isEditing = editingId === row.id;

              return (
                <div
                  key={row.id}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start gap-6">
                    <div className="flex-1">
                      {isEditing ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">
                              Caption
                            </label>
                            <textarea
                              value={editingCaption}
                              onChange={(e) => setEditingCaption(e.target.value)}
                              rows={4}
                              className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">
                              Explanation
                            </label>
                            <textarea
                              value={editingExplanation}
                              onChange={(e) => setEditingExplanation(e.target.value)}
                              rows={3}
                              className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">
                              Image Description
                            </label>
                            <textarea
                              value={editingImageDescription}
                              onChange={(e) => setEditingImageDescription(e.target.value)}
                              rows={3}
                              className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">
                              Priority
                            </label>
                            <input
                              type="number"
                              value={editingPriority}
                              onChange={(e) => setEditingPriority(e.target.value)}
                              className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdate(row.id)}
                              className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black hover:bg-emerald-600 transition-all"
                            >
                              SAVE
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-black hover:bg-slate-200 transition-all"
                            >
                              CANCEL
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-slate-800 text-lg font-medium italic mb-2">
                            "{row.caption}"
                          </p>

                          {row.explanation && (
                            <p className="text-sm text-slate-600 mb-3">
                              Explanation: {row.explanation}
                            </p>
                          )}

                          {row.image_description && (
                            <p className="text-sm text-slate-600 mb-3">
                              Image Description: {row.image_description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-2 mb-4">
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase font-mono">
                              ID: {row.id.substring(0, 8)}
                            </span>
                            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded uppercase font-mono">
                              User: {row.created_by_user_id?.substring(0, 8)}
                            </span>
                            <span className="text-[10px] bg-violet-50 text-violet-600 px-2 py-1 rounded uppercase font-mono">
                              Image: {row.image_id?.substring(0, 8)}
                            </span>
                            <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-1 rounded font-bold">
                              Priority: {row.priority ?? 0}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => startEdit(row)}
                          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-black hover:bg-blue-600 hover:text-white transition-all"
                        >
                          EDIT
                        </button>
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-black hover:bg-red-600 hover:text-white transition-all"
                        >
                          DELETE
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}