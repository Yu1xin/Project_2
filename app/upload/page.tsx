'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useSearchParams } from 'next/navigation';

type GeneratePresignedUrlResponse = { presignedUrl: string; cdnUrl: string };
type UploadImageFromUrlResponse = { imageId: string };
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

type GalleryImage = {
  id: string;
  url: string;
  image_description?: string | null;
};

function getFlavorLabel(flavor: HumorFlavorRow) {
  return flavor.name || flavor.label || flavor.humor_flavor || flavor.description || `Flavor ${flavor.id}`;
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-zinc-400 font-mono">Loading...</div>}>
      <UploadPageInner />
    </Suspense>
  );
}

function HowItWorks() {
  const steps = [
    { icon: '🖼️', title: 'Pick or upload', desc: 'Browse top-rated gallery images or upload your own' },
    { icon: '🎭', title: 'Choose a humor flavor', desc: 'Sets the AI\'s personality and comedic style' },
    { icon: '✨', title: 'AI writes your caption', desc: 'The AI generates a caption to complete your meme' },
  ];
  return (
    <div className="flex flex-col gap-0">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-5">How it works</p>
      {steps.map((s, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 text-sm shadow-sm">
              {s.icon}
            </div>
            {i < steps.length - 1 && (
              <div className="w-px flex-1 bg-zinc-200 dark:bg-zinc-700 my-1" />
            )}
          </div>
          <div className="pb-6">
            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 leading-tight">{s.title}</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug mt-0.5">{s.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function StepLabel({ num, label, hint }: { num: string; label: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-6 h-6 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-black flex items-center justify-center shrink-0">{num}</span>
      <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{label}</span>
      {hint && <span className="text-xs text-zinc-400 font-normal">— {hint}</span>}
    </div>
  );
}

function GalleryGrid({
  images, selected, onSelect, loading,
}: {
  images: GalleryImage[];
  selected: GalleryImage | null;
  onSelect: (img: GalleryImage) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="h-48 flex items-center justify-center text-zinc-400 text-sm animate-pulse rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
        Loading gallery…
      </div>
    );
  }
  if (images.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-zinc-400 text-sm rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700">
        No gallery images yet
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-3">
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-64 overflow-y-auto pr-1">
        {images.map(img => {
          const isSelected = selected?.id === img.id;
          return (
            <button
              key={img.id}
              onClick={() => onSelect(img)}
              title={img.image_description || img.id}
              className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all focus:outline-none ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-300 dark:ring-blue-700 scale-95'
                  : 'border-transparent hover:border-zinc-400 dark:hover:border-zinc-500 hover:scale-95'
              }`}
            >
              <img src={img.url} alt="" className="w-full h-full object-cover" />
              {isSelected && (
                <div className="absolute inset-0 bg-blue-600/30 flex items-center justify-center">
                  <span className="text-white text-lg font-black drop-shadow">✓</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-zinc-400 text-right">Top {images.length} images by score</p>
    </div>
  );
}

function UploadDropzone({
  file, onFileChange,
}: {
  file: File | null;
  onFileChange: (f: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault(); setDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f && f.type.startsWith('image/')) onFileChange(f);
      }}
      onClick={() => inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-all ${
        dragging ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20' : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 bg-zinc-50 dark:bg-zinc-900/60'
      }`}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => onFileChange(e.target.files?.[0] || null)} />
      {file ? (
        <>
          <img
            src={URL.createObjectURL(file)}
            alt="preview"
            className="w-32 h-32 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-700 shadow"
          />
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{file.name}</p>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onFileChange(null); }}
            className="text-xs text-red-400 hover:text-red-600 underline"
          >
            Remove
          </button>
        </>
      ) : (
        <>
          <span className="text-4xl">📤</span>
          <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">Click or drag & drop an image</p>
          <p className="text-xs text-zinc-400">PNG, JPG, GIF supported</p>
        </>
      )}
    </div>
  );
}

function UploadPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const [prefillBanner, setPrefillBanner] = useState<string | null>(null);

  // Gallery state
  const [imageMode, setImageMode] = useState<'gallery' | 'upload'>('gallery');
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<GalleryImage | null>(null);

  const supabase = useMemo(
    () => createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  );

  // Load gallery images
  useEffect(() => {
    fetch('/api/top-images')
      .then(r => r.json())
      .then(d => setGalleryImages(d ?? []))
      .catch(() => {})
      .finally(() => setGalleryLoading(false));
  }, []);

  // Load humor flavors
  useEffect(() => {
    async function loadHumorFlavors() {
      setLoadingFlavors(true);
      const { data, error } = await supabase
        .from('humor_flavors')
        .select('*')
        .order('id', { ascending: true });
      if (error) {
        setStatus(`Failed to load humor flavors: ${error.message}`);
      } else {
        const rows = (data || []) as HumorFlavorRow[];
        setHumorFlavors(rows);
        const paramFlavorId = searchParams.get('flavorId');
        if (paramFlavorId && rows.find(r => String(r.id) === paramFlavorId)) {
          setSelectedFlavorId(paramFlavorId);
        } else if (rows.length > 0) {
          setSelectedFlavorId(String(rows[0].id));
        }
      }
      setLoadingFlavors(false);
    }
    loadHumorFlavors();
  }, [supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fill from "Duplicate the Humor" params
  useEffect(() => {
    const paramCaption  = searchParams.get('caption');
    const paramImageId  = searchParams.get('imageId');
    const paramImageUrl = searchParams.get('imageUrl');
    const parts: string[] = [];
    if (paramCaption)  { setGeneratedCaption(paramCaption); setEditedCaption(paramCaption); parts.push('caption'); }
    if (paramImageId)  { setImageId(paramImageId); parts.push('image'); }
    if (paramImageUrl) { setPreviewUrl(paramImageUrl); }
    if (parts.length > 0) setPrefillBanner(`Duplicated from Meme Board: ${parts.join(' + ')} pre-filled ✨`);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function extractCaption(payload: CaptionApiResponse, fallbackImageId?: string) {
    let finalCaption = '';
    if (Array.isArray(payload)) {
      const first = payload[0];
      finalCaption = typeof first === 'string' ? first : first?.content || '';
    } else if (typeof payload === 'string') {
      finalCaption = payload;
    } else if (payload?.captions && Array.isArray(payload.captions)) {
      const first = payload.captions[0];
      finalCaption = typeof first === 'string' ? first : first?.content || '';
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
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!session?.access_token || !session.user?.id) throw new Error('Please login first.');
    return { token: session.access_token, userId: session.user.id };
  }

  async function generateCaptionForImage(token: string, uploadedImageId: string, flavorId?: string) {
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const body: Record<string, unknown> = { imageId: uploadedImageId };
    if (flavorId) body.humorFlavorId = Number(flavorId);
    const res = await fetch('https://api.almostcrackd.ai/pipeline/generate-captions', {
      method: 'POST', headers, body: JSON.stringify(body),
    });
    if (!res.ok) { const text = await res.text(); throw new Error(`Caption generation failed: ${text}`); }
    return extractCaption((await res.json()) as CaptionApiResponse, uploadedImageId);
  }

  // Upload mode: upload file → register → generate caption
  const handleProcessUpload = async () => {
    if (!file) { setStatus('Please choose an image first.'); return; }
    if (!selectedFlavorId) { setStatus('Please choose a humor flavor first.'); return; }
    setLoading(true); setStatus('Starting...');
    try {
      const { token } = await requireSession();
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      setStatus('Getting permission...');
      const s1Res = await fetch('https://api.almostcrackd.ai/pipeline/generate-presigned-url', {
        method: 'POST', headers, body: JSON.stringify({ contentType: file.type }),
      });
      if (!s1Res.ok) throw new Error(`Failed to get upload permission: ${await s1Res.text()}`);
      const presignData = (await s1Res.json()) as GeneratePresignedUrlResponse;
      if (!presignData?.presignedUrl || !presignData?.cdnUrl) throw new Error('Upload permission response was incomplete.');
      setStatus('Uploading bytes...');
      const uploadRes = await fetch(presignData.presignedUrl, {
        method: 'PUT', headers: { 'Content-Type': file.type }, body: file,
      });
      if (!uploadRes.ok) throw new Error('Image upload failed.');
      setStatus('Registering image...');
      const s3Res = await fetch('https://api.almostcrackd.ai/pipeline/upload-image-from-url', {
        method: 'POST', headers, body: JSON.stringify({ imageUrl: presignData.cdnUrl, isCommonUse: false }),
      });
      if (!s3Res.ok) throw new Error(`Failed to register image: ${await s3Res.text()}`);
      const uploadImageData = (await s3Res.json()) as UploadImageFromUrlResponse;
      if (!uploadImageData?.imageId) throw new Error('Image registration did not return an imageId.');
      setStatus('AI is thinking...');
      const finalCaption = await generateCaptionForImage(token, uploadImageData.imageId, selectedFlavorId);
      setImageId(uploadImageData.imageId);
      setGeneratedCaption(finalCaption);
      setEditedCaption(finalCaption);
      setPreviewUrl(presignData.cdnUrl);
      setStatus('Success! Edit the caption, revise it, or save it.');
    } catch (err: any) {
      setStatus(`Error: ${err.message || 'Something went wrong.'}`);
    } finally { setLoading(false); }
  };

  // Gallery mode: use existing image → generate caption
  const handleGenerateFromGallery = async () => {
    if (!selectedGalleryImage || !selectedFlavorId) return;
    setLoading(true); setStatus('AI is thinking...');
    try {
      const { token } = await requireSession();
      const caption = await generateCaptionForImage(token, selectedGalleryImage.id, selectedFlavorId);
      setImageId(selectedGalleryImage.id);
      setPreviewUrl(selectedGalleryImage.url);
      setGeneratedCaption(caption);
      setEditedCaption(caption);
      setStatus('Success! Edit the caption, revise it, or save it.');
    } catch (err: any) {
      setStatus(`Error: ${err.message || 'Something went wrong.'}`);
    } finally { setLoading(false); }
  };

  const handleRevise = async () => {
    if (!imageId || !selectedFlavorId) return;
    try {
      setIsRevising(true); setStatus('Revising caption with selected flavor...');
      const { token } = await requireSession();
      const revisedCaption = await generateCaptionForImage(token, imageId, selectedFlavorId);
      setGeneratedCaption(revisedCaption);
      setEditedCaption(revisedCaption);
      setStatus('Revised! You can revise again or save it.');
    } catch (err: any) {
      setStatus(`Error: ${err.message || 'Failed to revise caption.'}`);
    } finally { setIsRevising(false); }
  };

  const handleSave = async () => {
    if (!imageId || !editedCaption.trim() || !selectedFlavorId) return;
    try {
      setLoading(true); setStatus('Saving meme...');
      const { userId } = await requireSession();
      const { error } = await supabase.from('captions').insert({
        image_id: imageId, content: editedCaption.trim(), profile_id: userId,
        humor_flavor_id: Number(selectedFlavorId), is_public: true, like_count: 0,
        created_by_user_id: userId, modified_by_user_id: userId,
      });
      if (error) throw error;
      setStatus('Saved! Redirecting...');
      setTimeout(() => router.push('/main'), 800);
    } catch (err: any) {
      setStatus(`Error: ${err.message || 'Failed to save meme.'}`);
    } finally { setLoading(false); }
  };

  const resetPage = () => {
    setFile(null); setPreviewUrl(null); setImageId(null);
    setGeneratedCaption(''); setEditedCaption(''); setStatus('');
    setSelectedGalleryImage(null);
  };

  const canGenerate = imageMode === 'gallery'
    ? !!selectedGalleryImage && !!selectedFlavorId && !loadingFlavors
    : !!file && !!selectedFlavorId && !loadingFlavors;

  const handleGenerate = imageMode === 'gallery' ? handleGenerateFromGallery : handleProcessUpload;

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto w-full max-w-4xl">

        {prefillBanner && (
          <div className="mb-6 rounded-2xl border border-violet-300/40 bg-violet-50 dark:bg-violet-950/40 px-4 py-3 text-sm text-violet-700 dark:text-violet-300 flex items-center justify-between gap-3">
            <span>🎭 {prefillBanner}</span>
            <button onClick={() => setPrefillBanner(null)} className="text-violet-400 hover:text-violet-600 text-xs shrink-0">✕</button>
          </div>
        )}

        {!previewUrl ? (
          <div className="flex gap-12 items-start">

            {/* Left sidebar: instructions */}
            <aside className="hidden md:block w-48 shrink-0 sticky top-10">
              <h1 className="mb-1 text-2xl font-black text-zinc-900 dark:text-zinc-100">Meme Lab 🧪</h1>
              <p className="mb-6 text-xs text-zinc-500 dark:text-zinc-400">AI caption generation</p>
              <HowItWorks />
            </aside>

            {/* Right: form, no outer box */}
            <div className="flex-1 text-zinc-900 dark:text-zinc-100">

              {/* Mobile title (hidden on md+) */}
              <div className="md:hidden mb-6">
                <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">Meme Lab 🧪</h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">AI caption generation</p>
              </div>

              {/* Step 1: Image */}
              <div className="mb-7">
                <StepLabel num="1" label="Choose an image" />
                <div className="flex gap-1 mb-4 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900">
                  {([['gallery', '🖼️  Gallery (top 50)'], ['upload', '📤  Upload new']] as const).map(([mode, label]) => (
                    <button
                      key={mode}
                      onClick={() => setImageMode(mode)}
                      className={`flex-1 rounded-lg py-2 text-sm font-bold transition-all ${
                        imageMode === mode
                          ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {imageMode === 'gallery' ? (
                  <GalleryGrid
                    images={galleryImages}
                    selected={selectedGalleryImage}
                    onSelect={img => setSelectedGalleryImage(prev => prev?.id === img.id ? null : img)}
                    loading={galleryLoading}
                  />
                ) : (
                  <UploadDropzone file={file} onFileChange={setFile} />
                )}
              </div>

              {/* Step 2: Humor Flavor */}
              <div className="mb-7">
                <StepLabel num="2" label="Choose a humor flavor" hint="the AI's personality" />
                <FlavorPicker
                  flavors={humorFlavors}
                  value={selectedFlavorId}
                  onChange={setSelectedFlavorId}
                  disabled={loadingFlavors || loading}
                  loading={loadingFlavors}
                />
              </div>

              {/* Step 3: Generate */}
              <div>
                <StepLabel num="3" label="Generate your meme" />
                <button
                  onClick={handleGenerate}
                  disabled={loading || !canGenerate}
                  className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 py-4 font-bold text-white text-base disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-400 transition-all active:scale-95 shadow-lg shadow-blue-100 dark:shadow-none"
                >
                  {loading ? `${status || 'Processing…'}` : 'Generate Meme 🚀'}
                </button>
                {loading && (
                  <p className="mt-3 text-center text-xs font-mono text-blue-500 animate-pulse">{status}</p>
                )}
                {!loading && status && (
                  <p className="mt-3 text-center text-xs font-mono text-red-500">{status}</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ── Result view ── */
          <div className="flex gap-12 items-start">
            <aside className="hidden md:block w-48 shrink-0 sticky top-10">
              <h1 className="mb-1 text-2xl font-black text-zinc-900 dark:text-zinc-100">Meme Lab 🧪</h1>
              <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">Your meme is ready</p>
            </aside>
            <div className="flex-1 text-zinc-900 dark:text-zinc-100">
              <h2 className="mb-6 text-xl font-bold">Final Result ✨</h2>

            <div className="mb-5">
              <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                Humor Flavor <span className="font-normal text-zinc-400">(AI personality)</span>
              </label>
              <FlavorPicker
                flavors={humorFlavors}
                value={selectedFlavorId}
                onChange={setSelectedFlavorId}
                disabled={loading || isRevising || loadingFlavors}
                loading={loadingFlavors}
              />
            </div>

            <div className="mb-6 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <img src={previewUrl} alt="Meme Preview" className="h-auto w-full object-cover" />
              <div className="border-t border-zinc-200 dark:border-zinc-800 p-6">
                <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-100">
                  Edit your meme caption
                </label>
                <textarea
                  value={editedCaption}
                  onChange={e => setEditedCaption(e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 text-base text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Rewrite the meme caption here..."
                />
                <p className="mt-2 break-words text-xs text-zinc-400">AI draft: {generatedCaption}</p>
                {imageId && <p className="mt-1 break-words text-[11px] text-zinc-400">Image ID: {imageId}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleRevise}
                disabled={loading || isRevising || !selectedFlavorId}
                className="w-full rounded-2xl bg-violet-600 hover:bg-violet-700 py-4 font-bold text-white disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-400 transition-all active:scale-95"
              >
                {isRevising ? 'Revising...' : '🔁 Revise with Selected Flavor'}
              </button>
              <button
                onClick={handleSave}
                disabled={loading || isRevising || !editedCaption.trim()}
                className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-600 py-4 font-bold text-white shadow-lg shadow-emerald-100 dark:shadow-none disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-400 transition-all active:scale-95"
              >
                {loading ? 'Saving...' : '👍 Add to Meme Board'}
              </button>
              <button
                onClick={() => setEditedCaption(generatedCaption)}
                disabled={loading || isRevising}
                className="w-full rounded-xl bg-blue-50 dark:bg-blue-950/30 py-3 font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-all disabled:opacity-50"
              >
                ↺ Reset to AI version
              </button>
              <button
                onClick={resetPage}
                disabled={loading || isRevising}
                className="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 py-3 font-bold text-zinc-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-zinc-700 hover:text-red-500 transition-all disabled:opacity-50"
              >
                🗑️ Start over
              </button>
            </div>

            {status && (
              <p className="mt-4 break-words text-center text-xs font-mono text-blue-500">{status}</p>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

function FlavorPicker({
  flavors, value, onChange, disabled, loading,
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
  const selected = flavors.find(f => String(f.id) === value);
  const filtered = search.trim()
    ? flavors.filter(f => {
        const q = search.toLowerCase();
        return getFlavorLabel(f).toLowerCase().includes(q) || (f.slug ?? '').toLowerCase().includes(q);
      })
    : flavors;

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(''); }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  if (loading) {
    return <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-3 text-sm text-zinc-500">Loading flavors...</div>;
  }

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => { if (!disabled) setOpen(v => !v); }}
        className={`flex cursor-pointer items-center rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-3 focus-within:ring-2 focus-within:ring-blue-400 ${disabled ? 'pointer-events-none opacity-50' : ''}`}
      >
        {open ? (
          <input
            autoFocus
            className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 outline-none placeholder-zinc-500"
            placeholder="Search flavor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onClick={e => e.stopPropagation()}
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
              filtered.map(f => (
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
