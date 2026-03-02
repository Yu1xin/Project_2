'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleProcess = async () => {
    if (!file) return;
    setLoading(true);
    setStatus('Starting...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Auth token missing. Please login again.");

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Step 1: Generate Presigned URL
      setStatus('Getting upload permission...');
      const s1Res = await fetch('https://api.almostcrackd.ai/pipeline/generate-presigned-url', {
        method: 'POST',
        headers,
        body: JSON.stringify({ contentType: file.type })
      });
      const { presignedUrl, cdnUrl } = await s1Res.json();

      // Step 2: Upload Bytes (PUT request to S3)
      setStatus('Uploading image...');
      await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file
      });

      // Step 3: Register Image
      setStatus('Registering with AI pipeline...');
      const s3Res = await fetch('https://api.almostcrackd.ai/pipeline/upload-image-from-url', {
        method: 'POST',
        headers,
        body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: false })
      });
      const { imageId } = await s3Res.json();

      // Step 4: Generate Captions
      setStatus('Generating captions...');
      await fetch('https://api.almostcrackd.ai/pipeline/generate-captions', {
        method: 'POST',
        headers,
        body: JSON.stringify({ imageId })
      });

      setStatus('Success! Image processed.');
      alert("Done! You can check the main gallery now.");
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
      <div className="w-full max-w-md p-8 border border-slate-200 rounded-3xl shadow-xl">
        <h1 className="text-2xl font-bold mb-6">Upload & AI Caption 📸</h1>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mb-6 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <button
          onClick={handleProcess}
          disabled={loading || !file}
          className="w-full bg-black text-white py-3 rounded-xl font-bold disabled:bg-slate-300 transition-all active:scale-95"
        >
          {loading ? 'Processing...' : 'Submit to Pipeline'}
        </button>
        {status && <p className="mt-4 text-center text-sm font-mono text-blue-600">{status}</p>}
        <Link href="/main" className="block mt-8 text-center text-xs text-slate-400 underline">Back to Main</Link>
      </div>
    </div>
  );
}