return (
  <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
    <h1 className="text-3xl font-bold text-gray-800">Humor Flavors</h1>

    {/* Create Box */}
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

    {/* Flavor List */}
    <div className="space-y-3">
      {flavors.map((flavor) => (
        <div
          key={flavor.id}
          className="border p-4 rounded-lg bg-white flex justify-between items-center shadow-sm"
        >
          <div>
            <div className="font-semibold text-gray-800">
              {flavor.slug}
            </div>
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