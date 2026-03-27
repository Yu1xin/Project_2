'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type CaptionRow = {
  id: string;
  content: string | null;
  is_public: boolean | null;
  profile_id: string | null;
  image_id: string | null;
  like_count: number | null;
  is_featured: boolean | null;
  created_datetime_utc?: string | null;
};

type ImageRow = {
  id: string;
  url: string | null;
};

export default function AdminCaptionsPage() {
  const [captions, setCaptions] = useState<CaptionRow[]>([]);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newImageId, setNewImageId] = useState('');
  const [newIsPublic, setNewIsPublic] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingIsPublic, setEditingIsPublic] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function loadData() {
    setLoading(true);

    const [captionsRes, imagesRes] = await Promise.all([
      supabase
        .from('captions')
        .select('*')
        .order('created_datetime_utc', { ascending: false }),
      supabase
        .from('images')
        .select('id, url')
        .order('created_datetime_utc', { ascending: false }),
    ]);

    if (captionsRes.error) {
      console.error('Fetch captions error:', captionsRes.error.message);
    } else {
      setCaptions((captionsRes.data || []) as CaptionRow[]);
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
    if (!newContent.trim()) {
      alert('Caption content cannot be empty.');
      return;
    }

    if (!newImageId) {
      alert('Please select an image for this caption.');
      return;
    }

    try {
      setCreating(true);

      const userId = await getCurrentUserId();
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('captions')
        .insert({
          content: newContent.trim(),
          image_id: newImageId,
          profile_id: userId,
          is_public: newIsPublic,
          is_featured: false,
          like_count: 0,
          created_datetime_utc: now,
          modified_datetime_utc: now,
          created_by_user_id: userId,
          modified_by_user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      setCaptions((prev) => [data as CaptionRow, ...prev]);
      setNewContent('');
      setNewImageId('');
      setNewIsPublic(false);

      alert('New caption created successfully!');
    } catch (err: any) {
      console.error(err);
      alert(`Failed to create caption: ${err.message || 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (caption: CaptionRow) => {
    setEditingId(caption.id);
    setEditingContent(caption.content || '');
    setEditingIsPublic(Boolean(caption.is_public));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingContent('');
    setEditingIsPublic(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editingContent.trim()) {
      alert('Caption content cannot be empty.');
      return;
    }

    try {
      const userId = await getCurrentUserId();
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('captions')
        .update({
          content: editingContent.trim(),
          is_public: editingIsPublic,
          modified_datetime_utc: now,
          modified_by_user_id: userId,
        })
        .eq('id', id);

      if (error) throw error;

      setCaptions((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                content: editingContent.trim(),
                is_public: editingIsPublic,
              }
            : c
        )
      );

      cancelEdit();
      alert('Caption updated successfully!');
    } catch (err: any) {
      console.error(err);
      alert(`Failed to update caption: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure to delete this caption?')) return;

    const { error } = await supabase.from('captions').delete().eq('id', id);

    if (error) {
      alert('Failed to delete: ' + error.message);
    } else {
      setCaptions((prev) => prev.filter((c) => c.id !== id));
    }
  };

  if (loading) return <div className="p-10 ml-64 font-mono">loading...</div>;

  return (
    <div className="p-10 ml-64 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-3">
          <span className="bg-orange-500 text-white p-2 rounded-lg text-xl">📝</span>
          Captions Management
        </h1>

        {/* CREATE NEW CAPTION */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Create New Caption</h2>

          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">
                Caption Content
              </label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={4}
                placeholder="Write a new caption here..."
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
                    {img.id.substring(0, 8)}
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

            <label className="flex items-center gap-3 text-sm text-slate-700 font-medium">
              <input
                type="checkbox"
                checked={newIsPublic}
                onChange={(e) => setNewIsPublic(e.target.checked)}
              />
              Make this caption public
            </label>

            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-fit px-5 py-3 rounded-2xl bg-orange-500 text-white font-black hover:bg-orange-600 transition disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Caption'}
            </button>
          </div>
        </div>

        {/* LIST */}
        <div className="grid gap-4">
          {captions.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center">
              <p className="text-slate-400 font-medium">No caption data for now...</p>
            </div>
          ) : (
            captions.map((c) => {
              const isEditing = editingId === c.id;

              return (
                <div
                  key={c.id}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start gap-6">
                    <div className="flex-1">
                      {isEditing ? (
                        <div className="space-y-4">
                          <textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            rows={4}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
                          />

                          <label className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                            <input
                              type="checkbox"
                              checked={editingIsPublic}
                              onChange={(e) => setEditingIsPublic(e.target.checked)}
                            />
                            Public
                          </label>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdate(c.id)}
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
                            "{c.content}"
                          </p>

                          <div className="flex flex-wrap gap-2 mb-4">
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase font-mono">
                              ID: {c.id.substring(0, 8)}
                            </span>
                            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded uppercase font-mono">
                              User: {c.profile_id?.substring(0, 8)}
                            </span>
                            <span className="text-[10px] bg-violet-50 text-violet-600 px-2 py-1 rounded uppercase font-mono">
                              Image: {c.image_id?.substring(0, 8)}
                            </span>
                            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded font-bold">
                              {c.is_public ? 'PUBLIC' : 'PRIVATE'}
                            </span>
                            <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-1 rounded font-bold">
                              Likes: {c.like_count ?? 0}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => startEdit(c)}
                          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-black hover:bg-blue-600 hover:text-white transition-all"
                        >
                          EDIT
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
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