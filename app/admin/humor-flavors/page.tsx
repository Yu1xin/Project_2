'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

type HumorFlavor = {
  id: string;
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

    if (!error && data) setFlavors(data);
  }

  useEffect(() => {
    loadFlavors();
  }, []);

  async function createFlavor() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert('not logged in');

    const { error } = await supabase.from('humor_flavors').insert({
      slug,
      description,
      created_by_user_id: session.user.id,
      modified_by_user_id: session.user.id,
      created_datetime_utc: new Date().toISOString(),
      modified_datetime_utc: new Date().toISOString(),
    });

    if (error) {
      alert(error.message);
      return;
    }

    setSlug('');
    setDescription('');
    loadFlavors();
  }

  async function deleteFlavor(id: string) {
    const { error } = await supabase.from('humor_flavors').delete().eq('id', id);
    if (error) return alert(error.message);
    loadFlavors();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Humor Flavors</h1>

      <div className="border p-4 rounded space-y-3 bg-white">
        <h2 className="font-semibold">Create Flavor</h2>
        <input
          className="border p-2 w-full"
          placeholder="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
        <textarea
          className="border p-2 w-full"
          placeholder="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button onClick={createFlavor} className="px-4 py-2 bg-white-600 text-white rounded">
          Create
        </button>
      </div>

      <div className="space-y-3">
        {flavors.map((flavor) => (
          <div key={flavor.id} className="border p-4 rounded bg-white flex justify-between">
            <div>
              <div className="font-bold">{flavor.slug}</div>
              <div className="text-sm text-gray-600">{flavor.description}</div>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/humor-flavors/${flavor.id}`}>
                Open
              </Link>
              <button
                onClick={() => deleteFlavor(flavor.id)}
                className="px-3 py-2 bg-red-600 text-white rounded"
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