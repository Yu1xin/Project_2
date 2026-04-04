'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type ImageRow = {
  id: string;
  url: string | null;
  image_description?: string | null;
  created_datetime_utc?: string | null;
  modified_datetime_utc?: string | null;
  is_common_use?: boolean | null;
  is_public?: boolean | null;
  profile_id?: string | null;
  created_by_user_id?: string | null;
};

export default function AdminImagesPage() {
  const [images, setImages] = useState<ImageRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingNew, setUploadingNew] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [newDescription, setNewDescription] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function loadImages() {
    setLoading(true);

    try {
      const res = await fetch('/api/admin/images');
      const data = await res.json();
      if (!res.ok) {
        console.error(data.error);
        alert(`Failed to load images: ${data.error}`);
        setImages([]);
      } else {
        setImages(data as ImageRow[]);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to load images: ${err.message}`);
      setImages([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadImages();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  async function getCurrentUser() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw error;
    if (!session?.user) throw new Error('Please log in first.');

    return {
      user: session.user,
      accessToken: session.access_token,
    };
  }

  async function uploadFileAndGetCdnUrl(file: File, accessToken: string) {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const s1Res = await fetch(
      'https://api.almostcrackd.ai/pipeline/generate-presigned-url',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ contentType: file.type }),
      }
    );

    if (!s1Res.ok) {
      throw new Error('Failed to get presigned upload URL.');
    }

    const { presignedUrl, cdnUrl } = await s1Res.json();

    if (!presignedUrl || !cdnUrl) {
      throw new Error('Upload API did not return presignedUrl/cdnUrl.');
    }

    const uploadRes = await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });

    if (!uploadRes.ok) {
      throw new Error('Failed to upload image bytes.');
    }

    return cdnUrl as string;
  }

  async function registerUploadedImage(cdnUrl: string, accessToken: string) {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const res = await fetch(
      'https://api.almostcrackd.ai/pipeline/upload-image-from-url',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          imageUrl: cdnUrl,
          isCommonUse: false,
        }),
      }
    );

    if (!res.ok) {
      throw new Error('Failed to register image in pipeline.');
    }

    return await res.json();
  }

  async function handleCreateNewImage(file: File, description: string) {
    try {
      setUploadingNew(true);

      const { accessToken } = await getCurrentUser();

      const cdnUrl = await uploadFileAndGetCdnUrl(file, accessToken);
      const registrationResult = await registerUploadedImage(cdnUrl, accessToken);

      // Save description if provided
      if (description.trim() && registrationResult?.imageId) {
        await supabase
          .from('images')
          .update({ image_description: description.trim() })
          .eq('id', registrationResult.imageId);
      }

      setPendingFile(null);
      setNewDescription('');
      await loadImages();

      alert('New image uploaded successfully!');
    } catch (err: any) {
      console.error(err);
      alert(`Upload failed: ${err.message || 'Unknown error'}`);
    } finally {
      setUploadingNew(false);
    }
  }

  async function handleReplaceImage(imageId: string, file: File) {
    try {
      setReplacingId(imageId);

      const { user, accessToken } = await getCurrentUser();

      const cdnUrl = await uploadFileAndGetCdnUrl(file, accessToken);

      // 这里也先注册一下，确保这个 URL 是系统认识的有效图片
      const registrationResult = await registerUploadedImage(cdnUrl, accessToken);
      console.log('Replacement registration result:', registrationResult);

      const { error } = await supabase
        .from('images')
        .update({
          url: cdnUrl,
          modified_by_user_id: user.id,
        })
        .eq('id', imageId);

      if (error) throw error;

      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId
            ? { ...img, url: cdnUrl }
            : img
        )
      );

      alert('Image replaced successfully!');
    } catch (err: any) {
      console.error(err);
      alert(`Replace failed: ${err.message || 'Unknown error'}`);
    } finally {
      setReplacingId(null);
    }
  }

  async function deleteImage(id: string) {
    const confirmDelete = confirm('Are you sure you want to delete this image?');
    if (!confirmDelete) return;

    try {
      setDeletingId(id);

      const { error } = await supabase.from('images').delete().eq('id', id);

      if (error) throw error;

      setImages((prev) => prev.filter((img) => img.id !== id));
      alert('Deleted successfully!');
    } catch (err: any) {
      console.error(err);
      alert(`Delete failed: ${err.message || 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return <div className="p-10 text-zinc-100">Loading images...</div>;
  }

  return (
    <div className="p-10 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Manage Images 🖼️</h2>
            <p className="text-sm text-zinc-100 mt-1">
              Upload new images, replace old ones, or delete image records.
            </p>
          </div>

          {pendingFile ? (
            <div className="flex flex-col gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 p-4 w-72">
              <p className="text-sm font-semibold text-zinc-300 truncate">📎 {pendingFile.name}</p>
              <input
                type="text"
                placeholder="Image description (optional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleCreateNewImage(pendingFile, newDescription)}
                  disabled={uploadingNew}
                  className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {uploadingNew ? 'Uploading...' : 'Confirm Upload'}
                </button>
                <button
                  onClick={() => { setPendingFile(null); setNewDescription(''); }}
                  disabled={uploadingNew}
                  className="rounded-xl bg-zinc-800 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <label className="inline-flex items-center gap-3 rounded-2xl bg-blue-600 px-5 py-3 text-white font-bold cursor-pointer hover:bg-blue-700 transition">
              <span>Upload New Image</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.currentTarget.value = '';
                  if (!file) return;
                  setPendingFile(file);
                }}
              />
            </label>
          )}
        </div>

        {images.length === 0 ? (
          <p className="text-zinc-100">No images found.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {images.map((img) => {
              const isReplacing = replacingId === img.id;
              const isDeleting = deletingId === img.id;

              return (
                <div
                  key={img.id}
                  className="text-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100"
                >
                  <img
                    src={img.url || ''}
                    className="w-full h-32 object-cover rounded-lg mb-4 bg-slate-100"
                    alt="Meme"
                  />

                  <p className="mb-2 text-[10px] text-zinc-100 font-mono break-all">
                    {img.id}
                  </p>

                  <p className="mb-3 text-[11px] text-zinc-100">
                    Public: {img.is_public ? 'Yes' : 'No'} · Common Use:{' '}
                    {img.is_common_use ? 'Yes' : 'No'}
                  </p>

                  {currentUserId && img.created_by_user_id !== currentUserId ? (
                    <p className="text-xs text-zinc-500 italic text-center mt-2">not yours</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <label
                        className={`w-full text-center py-2 rounded-xl font-bold text-sm transition cursor-pointer ${
                          isReplacing
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'
                        }`}
                      >
                        {isReplacing ? 'Replacing...' : 'Replace Image'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isReplacing}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            e.currentTarget.value = '';
                            if (!file) return;
                            await handleReplaceImage(img.id, file);
                          }}
                        />
                      </label>

                      <button
                        onClick={() => deleteImage(img.id)}
                        disabled={isDeleting}
                        className="w-full bg-red-50 text-red-600 py-2 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-all text-sm disabled:opacity-50"
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
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