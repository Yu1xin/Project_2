'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

type GeneratePresignedUrlResponse = {
  presignedUrl: string;
  cdnUrl: string;
};

type UploadImageFromUrlResponse = {
  imageId: string;
};

type CaptionApiResponse =
  | string
  | { content?: string; captions?: Array<string | { content?: string }> }
  | Array<string | { content?: string }>;

type HumorFlavorRow = {
  id: number | string;
  slug?: string | null;
  name?: string | null;
  humor_flavor?: string | null;
  label?: string | null;
  description?: string | null;
};

function getFlavorLabel(flavor: HumorFlavorRow) {
  return (
    flavor.name ||
    flavor.label ||
    flavor.humor_flavor ||
    flavor.description ||
    `Flavor ${flavor.id}`
  );
}

export default function UploadPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingFlavors, setLoadingFlavors] = useState(true);
  const [status, setStatus] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [imageId, setImageId] = useState<string | null>(null);
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [editedCaption, setEditedCaption] = useState('');

  const [humorFlavors, setHumorFlavors] = useState<HumorFlavorRow[]>([]);
  const [selectedFlavorId, setSelectedFlavorId] = useState<string>('');
  const [isRevising, setIsRevising] = useState(false);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  useEffect(() => {
    async function loadHumorFlavors() {
      setLoadingFlavors(true);

      const { data, error } = await supabase
        .from('humor_flavors')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('Failed to load humor flavors:', error.message);
        setStatus(`Failed to load humor flavors: ${error.message}`);
      } else {
        const rows = (data || []) as HumorFlavorRow[];
        setHumorFlavors(rows);

        if (rows.length > 0) {
          setSelectedFlavorId(String(rows[0].id));
        }
      }

      setLoadingFlavors(false);
    }

    loadHumorFlavors();
  }, [supabase]);

  function extractCaption(payload: CaptionApiResponse, fallbackImageId?: string) {
    let finalCaption = '';

    if (Array.isArray(payload)) {
      const first = payload[0];
      if (typeof first === 'string') finalCaption = first;
      else finalCaption = first?.content || '';
    } else if (typeof payload === 'string') {
      finalCaption = payload;
    } else if (payload?.captions && Array.isArray(payload.captions)) {
      const first = payload.captions[0];
      if (typeof first === 'string') finalCaption = first;
      else finalCaption = first?.content || '';
    } else if (payload?.content) {
      finalCaption = payload.content;
    }

    if (!finalCaption.trim()) {
      finalCaption = fallbackImageId
        ? `Meme generated, but AI is speechless. (Image ID: ${fallbackImageId.slice(0, 8)})`
        : 'Meme generated, but AI is speechless.';
    }

    return finalCaption;
  }

  async function requireSession() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw error;
    if (!session?.access_token || !session.user?.id) {
      throw new Error('Please login first.');
    }

    return {
      token: session.access_token,
      userId: session.user.id,
    };
  }

  async function generateCaptionForImage(
    token: string,
    uploadedImageId: string,
    flavorId?: string
  ) {
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const body: Record<string, unknown> = {
      imageId: uploadedImageId,
    };

    if (flavorId) {
      body.humorFlavorId = Number(flavorId);
    }

    const res = await fetch(
      'https://api.almostcrackd.ai/pipeline/generate-captions',
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Caption generation failed: ${text}`);
    }

    const captionData = (await res.json()) as CaptionApiResponse;
    return extractCaption(captionData, uploadedImageId);
  }

  const handleProcess = async () => {
    if (!file) {
      setStatus('Please choose an image first.');
      return;
    }

    if (!selectedFlavorId) {
      setStatus('Please choose a humor flavor first.');
      return;
    }

    setLoading(true);
    setStatus('Starting...');

    try {
      const { token } = await requireSession();

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      setStatus('Getting permission...');
      const s1Res = await fetch(
        'https://api.almostcrackd.ai/pipeline/generate-presigned-url',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ contentType: file.type }),
        }
      );

      if (!s1Res.ok) {
        const text = await s1Res.text();
        throw new Error(`Failed to get upload permission: ${text}`);
      }

      const presignData =
        (await s1Res.json()) as GeneratePresignedUrlResponse;

      if (!presignData?.presignedUrl || !presignData?.cdnUrl) {
        throw new Error('Upload permission response was incomplete.');
      }

      setStatus('Uploading bytes...');
      const uploadRes = await fetch(presignData.presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Image upload failed.');
      }

      setStatus('Registering image...');
      const s3Res = await fetch(
        'https://api.almostcrackd.ai/pipeline/upload-image-from-url',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            imageUrl: presignData.cdnUrl,
            isCommonUse: false,
          }),
        }
      );

      if (!s3Res.ok) {
        const text = await s3Res.text();
        throw new Error(`Failed to register image: ${text}`);
      }

      const uploadImageData =
        (await s3Res.json()) as UploadImageFromUrlResponse;

      if (!uploadImageData?.imageId) {
        throw new Error('Image registration did not return an imageId.');
      }

      setStatus('AI is thinking...');
      const finalCaption = await generateCaptionForImage(
        token,
        uploadImageData.imageId,
        selectedFlavorId
      );

      setImageId(uploadImageData.imageId);
      setGeneratedCaption(finalCaption);
      setEditedCaption(finalCaption);
      setPreviewUrl(presignData.cdnUrl);
      setStatus('Success! Edit the caption, revise it, or save it.');
    } catch (err: any) {
      console.error(err);
      setStatus(`Error: ${err.message || 'Something went wrong.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRevise = async () => {
    if (!imageId) {
      setStatus('Missing imageId. Please upload an image first.');
      return;
    }

    if (!selectedFlavorId) {
      setStatus('Please choose a humor flavor first.');
      return;
    }

    try {
      setIsRevising(true);
      setStatus('Revising caption with selected flavor...');

      const { token } = await requireSession();
      const revisedCaption = await generateCaptionForImage(
        token,
        imageId,
        selectedFlavorId
      );

      setGeneratedCaption(revisedCaption);
      setEditedCaption(revisedCaption);
      setStatus('Revised successfully! You can revise again or save it.');
    } catch (err: any) {
      console.error(err);
      setStatus(`Error: ${err.message || 'Failed to revise caption.'}`);
    } finally {
      setIsRevising(false);
    }
  };

  const handleSave = async () => {
    if (!imageId) {
      setStatus('Missing imageId. Please upload again.');
      return;
    }

    if (!editedCaption.trim()) {
      setStatus('Caption cannot be empty.');
      return;
    }

    if (!selectedFlavorId) {
      setStatus('Please choose a humor flavor.');
      return;
    }

    try {
      setLoading(true);
      setStatus('Saving meme...');

      const { userId } = await requireSession();

      const payload = {
        image_id: imageId,
        content: editedCaption.trim(),
        profile_id: userId,
        humor_flavor_id: Number(selectedFlavorId),
        is_public: true,
        like_count: 0,
      };

      const { error } = await supabase.from('captions').insert(payload);

      if (error) throw error;

      setStatus('Saved successfully! Redirecting...');
      setTimeout(() => {
        router.push('/main');
      }, 800);
    } catch (err: any) {
      console.error(err);
      setStatus(`Error: ${err.message || 'Failed to save meme.'}`);
    } finally {
      setLoading(false);
    }
  };

  const resetPage = () => {
    setFile(null);
    setPreviewUrl(null);
    setImageId(null);
    setGeneratedCaption('');
    setEditedCaption('');
    setStatus('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      {!previewUrl ? (
        <div className="w-full max-w-md rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 text-zinc-900 dark:text-zinc-100 shadow-xl">
          <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Upload & Caption 📸
          </h1>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Humor Flavor
            </label>
            <FlavorPicker
              flavors={humorFlavors}
              value={selectedFlavorId}
              onChange={setSelectedFlavorId}
              disabled={loadingFlavors || loading}
              loading={loadingFlavors}
            />
          </div>

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mb-6 block w-full text-sm text-zinc-400 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-blue-700 hover:file:bg-blue-100"
          />

          <button
            onClick={handleProcess}
            disabled={loading || !file || !selectedFlavorId || loadingFlavors}
            className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white disabled:bg-slate-200"
          >
            {loading ? 'AI is processing...' : 'Generate Meme 🚀'}
          </button>

          {status && (
            <p className="mt-4 break-words text-center text-xs font-mono text-blue-500">
              {status}
            </p>
          )}
        </div>
      ) : (
        <div className="w-full max-w-md rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 text-zinc-900 dark:text-zinc-100 shadow-2xl animate-in zoom-in duration-300">
          <h2 className="mb-6 text-center text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Final Result ✨
          </h2>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Humor Flavor
            </label>
            <FlavorPicker
              flavors={humorFlavors}
              value={selectedFlavorId}
              onChange={setSelectedFlavorId}
              disabled={loading || isRevising || loadingFlavors}
              loading={loadingFlavors}
            />
          </div>

          <div className="mb-6 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
            <img
              src={previewUrl}
              alt="Meme Preview"
              className="h-auto w-full object-cover"
            />

            <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 text-zinc-900 dark:text-zinc-100">
              <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-100">
                Edit your meme caption
              </label>

              <textarea
                value={editedCaption}
                onChange={(e) => setEditedCaption(e.target.value)}
                rows={4}
                className="w-full resize-none rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 text-base text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Rewrite the meme caption here..."
              />

              <p className="mt-2 break-words text-xs text-zinc-500">
                AI draft: {generatedCaption}
              </p>

              {imageId && (
                <p className="mt-1 break-words text-[11px] text-zinc-500">
                  Image ID: {imageId}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleRevise}
              disabled={loading || isRevising || !selectedFlavorId}
              className="w-full rounded-2xl bg-violet-600 py-4 font-bold text-white disabled:bg-slate-200"
            >
              {isRevising ? 'Revising...' : '🔁 Revise with Selected Flavor'}
            </button>

            <button
              onClick={handleSave}
              disabled={loading || isRevising || !editedCaption.trim()}
              className="w-full rounded-2xl bg-emerald-500 py-4 text-center font-bold text-white shadow-lg shadow-emerald-100 disabled:bg-slate-200"
            >
              {loading ? 'Saving...' : '👍 Add to existing memes'}
            </button>

            <button
              onClick={() => setEditedCaption(generatedCaption)}
              disabled={loading || isRevising}
              className="w-full rounded-xl bg-blue-50 py-3 font-bold text-blue-600 transition-all hover:bg-blue-100 disabled:opacity-50"
            >
              ↺ Reset to Current AI Version
            </button>

            <button
              onClick={resetPage}
              disabled={loading || isRevising}
              className="w-full rounded-xl bg-slate-100 dark:bg-zinc-800 py-3 font-bold text-zinc-600 dark:text-zinc-400 transition-all hover:bg-red-50 dark:hover:bg-zinc-700 hover:text-red-500 disabled:opacity-50"
            >
              🙂‍↔️ Delete this
            </button>
          </div>

          {status && (
            <p className="mt-4 break-words text-center text-xs font-mono text-blue-500">
              {status}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function FlavorPicker({
  flavors,
  value,
  onChange,
  disabled,
  loading,
}: {
  flavors: HumorFlavorRow[];
  value: string;
  onChange: (id: string) => void;
  disabled: boolean;
  loading: boolean;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = flavors.find((f) => String(f.id) === value);

  const filtered = search.trim()
    ? flavors.filter((f) => {
        const q = search.toLowerCase();
        return (
          getFlavorLabel(f).toLowerCase().includes(q) ||
          (f.slug ?? '').toLowerCase().includes(q)
        );
      })
    : flavors;

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  if (loading) {
    return (
      <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-3 text-sm text-zinc-500">
        Loading flavors...
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => { if (!disabled) setOpen((v) => !v); }}
        className={`flex cursor-pointer items-center rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-3 focus-within:ring-2 focus-within:ring-blue-400 ${disabled ? 'pointer-events-none opacity-50' : ''}`}
      >
        {open ? (
          <input
            autoFocus
            className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 outline-none placeholder-zinc-500"
            placeholder="Search flavor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 truncate text-sm text-zinc-900 dark:text-zinc-100">
            {selected ? getFlavorLabel(selected) : 'Select a flavor'}
          </span>
        )}
        <span className="ml-2 text-xs text-zinc-500">{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl">
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-zinc-500">No flavors match</div>
            ) : (
              filtered.map((f) => (
                <button
                  key={String(f.id)}
                  type="button"
                  onClick={() => { onChange(String(f.id)); setSearch(''); setOpen(false); }}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 ${String(f.id) === value ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-zinc-900 dark:text-zinc-100'}`}
                >
                  {getFlavorLabel(f)}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}