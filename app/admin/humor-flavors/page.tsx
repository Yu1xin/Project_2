'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

type HumorFlavor = {
  id: number;
  slug: string;
  description: string | null;
};

export default function HumorFlavorsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [flavors, setFlavors] = useState<HumorFlavor[]>([]);
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  async function loadFlavors() {
    const { data, error } = await supabase
      .from('humor_flavors')
      .select('id, slug, description')
      .order('created_datetime_utc', { ascending: false });

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    setFlavors((data as HumorFlavor[]) || []);
  }

  useEffect(() => {
    loadFlavors();
  }, []);

  async function createFlavor() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      alert('not logged in');
      return;
    }

    const { error } = await supabase.from('humor_flavors').insert({
      slug,
      description,
      created_by_user_id: session.user.id,
      modified_by_user_id: session.user.id,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setSlug('');
    setDescription('');
    loadFlavors();
  }

  async function deleteFlavor(id: number) {
    const { error } = await supabase
      .from('humor_flavors')
      .delete()
      .eq('id', id);

    if (error) {
      alert(error.message);
      return;
    }

    loadFlavors();
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800">Humor Flavors</h1>

      <div className="border p-4 rounded-lg space-y-3 bg-white shadow-sm">
        <h2 className="font-semibold text-lg text-gray-700">Create Flavor</h2>

        <input
          className="border border-gray-300 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />

        <textarea
          className="border border-gray-300 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <button
          onClick={createFlavor}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
        >
          Create
        </button>
      </div>

      <div className="space-y-3">
        {flavors.map((flavor) => (
          <div
            key={flavor.id}
            className="border p-4 rounded-lg bg-white flex justify-between items-center shadow-sm"
          >
            <div>
              <div className="font-semibold text-gray-800">{flavor.slug}</div>
              <div className="text-sm text-gray-500">
                {flavor.description}
              </div>
            </div>

            <div className="flex gap-2">
              <Link
                href={`/admin/humor-flavors/${flavor.id}`}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition"
              >
                Open
              </Link>

              <button
                onClick={() => deleteFlavor(flavor.id)}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}