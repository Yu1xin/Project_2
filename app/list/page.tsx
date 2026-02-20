import { supabase } from '@/lib/supabaseClient'

export default async function ListPage() {
  // 1. 修改为你的实际表名，按创建时间倒序排列，方便看到最新的投票
  const { data, error } = await supabase
    .from('caption_votes')
    .select('*')
    .order('id', { ascending: false })

  if (error) {
    return <div className="p-4 text-red-500">Error fetching data: {error.message}</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold mb-6 text-black">Vote Records (Verification)</h1>

      {data.length === 0 ? (
        <p className="text-gray-500">No votes found in the database yet.</p>
      ) : (
        <div className="grid gap-4">
          {data.map((item: any) => (
            <div key={item.id} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Vote ID: {item.id}
                </span>
                <span className={`font-bold ${item.vote_value > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Value: {item.vote_value}
                </span>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p><strong>Profile ID (User):</strong> {item.profile_id}</p>
                <p><strong>Caption ID:</strong> {item.caption_id}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <a href="/" className="text-blue-600 hover:underline">← Back to Gallery</a>
      </div>
    </div>
  )
}