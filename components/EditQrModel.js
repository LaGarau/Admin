import React from "react";



export default function EditQrModal({
  selectedQR,
  form,
  handleChange,
  handleUpdate,
  setSelectedQR,
  categories,
  qrType,
  message,
}) {
  if (!selectedQR) return null;


  

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-100 dark:bg-gray-900/90 backdrop-blur-md border border-gray-100 dark:border-gray-700 shadow-2xl rounded-2xl p-8 w-[90%] max-w-xl relative animate-fadeIn">
        <button
          onClick={() => setSelectedQR(null)}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 transition"
        >
          ✕
        </button>

        <h1 className="text-2xl font-bold mb-6 text-center">Edit QR Code</h1>

        {message && (
          <p className="mb-4 text-green-600 text-center font-semibold">
            {message}
          </p>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          {/* QR Name */}
          <div>
            <label className="font-semibold">QR Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full p-2 mt-1 rounded bg-slate-300 focus:ring-2 focus:ring-blue-400 outline-none"
              required
            />
          </div>

          {/* Latitude & Longitude */}
          <div className="flex gap-4">
            <div className="w-1/2">
              <label className="font-semibold">Latitude</label>
              <input
                type="text"
                name="latitude"
                value={form.latitude}
                onChange={handleChange}
                className="w-full p-2 mt-1 rounded bg-slate-300 focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>
            <div className="w-1/2">
              <label className="font-semibold">Longitude</label>
              <input
                type="text"
                name="longitude"
                value={form.longitude}
                onChange={handleChange}
                className="w-full p-2 mt-1 rounded bg-slate-300 focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>
          </div>

          {/* Location Dropdown */}
          <div>
            <label className="font-semibold">Location Area</label>
            <select
              name="location"
              value={form.location}
              onChange={handleChange}
              className="w-full p-2 mt-1 rounded bg-slate-300 focus:ring-2 focus:ring-blue-400 outline-none"
              required
            >
              <option value="">-- Select Location --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* QR Type & Points */}
          <div className="flex gap-4">
            <div className="w-1/2">
              <label className="font-semibold">QR Type</label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full p-2 mt-1 rounded bg-slate-300 focus:ring-2 focus:ring-blue-400 outline-none"
                required
              >
                <option value="">-- Select QR Type --</option>
              
                {qrType && qrType.length > 0 ? (
                  qrType.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))
                ) : (
                  <option disabled>Loading QR Types...</option>
                )}
              </select>
            </div>

            <div className="w-1/2">
              <label className="font-semibold">Points</label>
              <input
                type="number"
                name="points"
                value={form.points}
                onChange={handleChange}
                className="w-full p-2 mt-1 rounded bg-slate-300 focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>
          </div>

          {/* Picture */}
          <div>
            <label className="font-semibold">Picture URL</label>
            <input
              type="url"
              name="picture"
              value={form.picture}
              onChange={handleChange}
              className="w-full p-2 mt-1 rounded bg-slate-300 focus:ring-2 focus:ring-blue-400 outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="font-semibold">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="3"
              className="w-full p-2 mt-1 rounded bg-slate-300 focus:ring-2 focus:ring-blue-400 outline-none"
            />
          </div>

          {/* Status */}
          <div className="flex gap-2 items-center">
            <label className="font-semibold">Status</label>
            <div className="flex gap-4">
              <label>
                <input
                  type="radio"
                  name="status"
                  value="Active"
                  checked={form.status === "Active"}
                  onChange={handleChange}
                />{" "}
                Active
              </label>
              <label>
                <input
                  type="radio"
                  name="status"
                  value="Disable"
                  checked={form.status === "Disable"}
                  onChange={handleChange}
                />{" "}
                Disable
              </label>
            </div>
          </div>

          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={() => setSelectedQR(null)}
              className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
