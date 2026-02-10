import { supabase } from '@/lib/supabaseClient';

export default async function ListPage() {

  const { data: contexts, error } = await supabase
    .from('community_contexts')
    .select('*');//select all in community_contexts form

  if (error) {
    return <div className="p-10 text-red-500">error: {error.message}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-8 font-sans">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-2">🦁🐻Columbia & Barnard Contexts before you can make Memes</h1>
        <p className="text-gray-500">What LLM(or a new student) needs to know</p>
      </header>

      <div className="grid gap-6">
        {contexts?.map((item) => (
          <div key={item.id} className="p-6 border rounded-xl shadow-sm hover:shadow-md transition-shadow bg-white">
            <div className="flex items-center mb-3">
              <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded mr-2">
                ID: {item.id}
              </span>
              <span className="text-gray-400 text-sm">
                Updated at: {new Date(item.modified_datetime_utc).toLocaleDateString()}
              </span>
            </div>

            {/* Details */}
            <p className="text-lg text-gray-800 leading-relaxed">
              {item.content}
            </p>
          </div>
        ))}
      </div>

      <footer className="mt-20 text-center text-gray-400 text-sm">
        © 2026 CS Assignment #2 - Meme Context Gallery
      </footer>
    </div>
  );
}
