'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [imageId, setImageId] = useState<string | null>(null);
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [editedCaption, setEditedCaption] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleProcess = async () => {
    if (!file) return;
    setLoading(true);
    setStatus('Starting...');

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;
      if (!token) throw new Error('Please login first.');

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
      const { presignedUrl, cdnUrl } = await s1Res.json();

      setStatus('Uploading bytes...');
      await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      setStatus('Registering image...');
      const s3Res = await fetch(
        'https://api.almostcrackd.ai/pipeline/upload-image-from-url',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: false }),
        }
      );
      const { imageId } = await s3Res.json();

      setStatus('AI is thinking...');
      const s4Res = await fetch(
        'https://api.almostcrackd.ai/pipeline/generate-captions',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ imageId }),
        }
      );

      const captionData = await s4Res.json();

      let finalCaption = '';

      if (Array.isArray(captionData)) {
        finalCaption = captionData[0]?.content || captionData[0] || '';
      } else if (captionData?.captions && Array.isArray(captionData.captions)) {
        finalCaption = captionData.captions[0]?.content || captionData.captions[0] || '';
      } else if (captionData?.content) {
        finalCaption = captionData.content;
      } else if (typeof captionData === 'string') {
        finalCaption = captionData;
      }

      if (!finalCaption || typeof finalCaption === 'object') {
        finalCaption =
          'Meme generated, but AI is speechless. (Check DB for ID: ' +
          imageId.slice(0, 8) +
          ')';
      }

      setImageId(imageId);
      setGeneratedCaption(finalCaption);
      setEditedCaption(finalCaption);
      setPreviewUrl(cdnUrl);
      setStatus('Success!');
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!imageId || !editedCaption.trim()) {
      setStatus('Caption cannot be empty.');
      return;
    }

    try {
      setLoading(true);
      setStatus('Saving meme...');

      const { error } = await supabase.from('captions').insert({
        image_id: imageId,
        content: editedCaption.trim(),
      });

      if (error) throw error;

      setStatus('Saved successfully!');
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
      console.error(err);
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
      {!previewUrl ? (
        <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-3xl shadow-xl">
          <h1 className="text-2xl font-bold mb-6 text-slate-800">Upload & Caption 📸</h1>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mb-6 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <button
            onClick={handleProcess}
            disabled={loading || !file}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold disabled:bg-slate-200"
          >
            {loading ? 'AI is processing...' : 'Generate Meme 🚀'}
          </button>
          {status && (
            <p className="mt-4 text-center text-xs font-mono text-blue-500">{status}</p>
          )}
        </div>
      ) : (
        <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl animate-in zoom-in duration-300">
          <h2 className="text-xl font-bold mb-6 text-center text-slate-800">Final Result ✨</h2>

          <div className="overflow-hidden rounded-2xl border border-slate-100 mb-6 shadow-sm">
            <img src={previewUrl} alt="Meme Preview" className="w-full h-auto object-cover" />

            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Edit your meme caption
              </label>
              <textarea
                value={editedCaption}
                onChange={(e) => setEditedCaption(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-slate-200 p-4 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                placeholder="Rewrite the meme caption here..."
              />
              <p className="mt-2 text-xs text-slate-400">
                AI draft: {generatedCaption}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleSave}
              disabled={loading || !editedCaption.trim()}
              className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold text-center shadow-lg shadow-emerald-100 disabled:bg-slate-200"
            >
              {loading ? 'Saving...' : '👍 Add to existing memes'}
            </button>

            <button
              onClick={() => setEditedCaption(generatedCaption)}
              className="w-full bg-blue-50 text-blue-600 py-3 rounded-xl font-bold hover:bg-blue-100 transition-all"
            >
              ↺ Reset to AI version
            </button>

            <button
              onClick={resetPage}
              className="w-full bg-slate-100 text-slate-500 py-3 rounded-xl font-bold hover:bg-red-50 hover:text-red-500 transition-all"
            >
              🙂‍↔️ Delete this
            </button>
          </div>

          {status && (
            <p className="mt-4 text-center text-xs font-mono text-blue-500">{status}</p>
          )}
        </div>
      )}
    </div>
  );
}