'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewCaption, setPreviewCaption] = useState<string | null>(null); // ✅ 新增：存储生成的文字

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
        if (!token) throw new Error("Please login first.");

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        // --- Step 1: Generate Presigned URL ---
        setStatus('Getting permission...');
        const s1Res = await fetch('https://api.almostcrackd.ai/pipeline/generate-presigned-url', {
          method: 'POST', headers, body: JSON.stringify({ contentType: file.type })
        });
        const { presignedUrl, cdnUrl } = await s1Res.json();

        // --- Step 2: Upload Image Bytes ---
        setStatus('Uploading bytes...');
        await fetch(presignedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });

        // --- Step 3: Register Image URL ---
        setStatus('Registering image...');
        const s3Res = await fetch('https://api.almostcrackd.ai/pipeline/upload-image-from-url', {
          method: 'POST', headers, body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: false })
        });
        const { imageId } = await s3Res.json();

        // --- Step 4: Generate Captions ---
        setStatus('AI is thinking...');
        const s4Res = await fetch('https://api.almostcrackd.ai/pipeline/generate-captions', {
          method: 'POST', headers, body: JSON.stringify({ imageId })
        });

        const captionData = await s4Res.json();
        console.log("Full API Response:", captionData); // 建议在控制台确认结构

        // --- 🚀 鲁棒性文字提取逻辑 ---
        let finalCaption = "";

        if (Array.isArray(captionData)) {
          // 情况 A: 直接返回数组 [ {content: "..."}, ... ]
          finalCaption = captionData[0]?.content || captionData[0];
        } else if (captionData && captionData.captions && Array.isArray(captionData.captions)) {
          // 情况 B: 返回对象带 captions 数组 { captions: [ {content: "..."}, ... ] }
          finalCaption = captionData.captions[0]?.content || captionData.captions[0];
        } else if (captionData && captionData.content) {
          // 情况 C: 直接返回 content 字段 { content: "..." }
          finalCaption = captionData.content;
        } else if (typeof captionData === 'string') {
          // 情况 D: 返回的就是纯字符串
          finalCaption = captionData;
        }

        // 如果还是空的，给一个调侃式的提示，证明流程走通了
        if (!finalCaption || typeof finalCaption === 'object') {
          finalCaption = "Meme generated, but AI is speechless. (Check DB for ID: " + imageId.slice(0,8) + ")";
        }

        setPreviewCaption(finalCaption);
        setPreviewUrl(cdnUrl);
        setStatus('Success!');
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
    setPreviewCaption(null);
    setStatus('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
      {!previewUrl ? (
        /* --- 上传界面 --- */
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
          {status && <p className="mt-4 text-center text-xs font-mono text-blue-500">{status}</p>}
        </div>
      ) : (
        /* --- 预览界面 (展示图片+文字) --- */
        <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl animate-in zoom-in duration-300">
          <h2 className="text-xl font-bold mb-6 text-center text-slate-800">Final Result ✨</h2>

          <div className="overflow-hidden rounded-2xl border border-slate-100 mb-6 shadow-sm">
            <img src={previewUrl} alt="Meme Preview" className="w-full h-auto object-cover" />

            {/* ✅ 展示生成的 Caption 文字 */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
              <blockquote className="text-lg text-blue-600 font-bold italic">
                "{previewCaption || "No caption generated"}"
              </blockquote>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Link href="/" className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold text-center shadow-lg shadow-emerald-100">
              👍add to existing memes
            </Link>
            <button onClick={resetPage} className="w-full bg-slate-100 text-slate-500 py-3 rounded-xl font-bold hover:bg-red-50 hover:text-red-500 transition-all">
              🙂‍↔️delete this
            </button>
          </div>
        </div>
      )}
    </div>
  );
}