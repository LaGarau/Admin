"use client";
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, push, onValue, remove, update } from "firebase/database";

export default function AddQrCategoryPage() {
  // States
  const [qrCategories, setQrCategories] = useState([]);
  const [editCategory, setEditCategory] = useState(null);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  // Fetch categories
  useEffect(() => {
  const categoryRef = ref(db, "QrCategory");
  onValue(categoryRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const list = Object.keys(data)
        .map((key) => ({
          id: key,
          ...data[key],
        }))
        .sort((a, b) => b.timestamp - a.timestamp); // newest first

      setQrCategories(list);
    } else {
      setQrCategories([]);
    }
  });
}, []);


  // Handle input change
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Add new QR type
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.description.trim()) {
      setMessage("Please fill all fields.");
      return;
    }

    try {
      await push(ref(db, "QrCategory"), {
        name: form.name.trim(),
        description: form.description.trim(),
        timestamp: Date.now(),
      });

      setMessage("QR type added successfully!");
      setForm({ name: "", description: "" });

      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setMessage("Error adding QR type.");
    }
  };

  // Delete category
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this category?"
    );

    if (confirmDelete) {
      try {
        await remove(ref(db, `QrCategory/${id}`));
        setMessage("Category deleted successfully!");
        setTimeout(() => setMessage(""), 3000);
      } catch (err) {
        console.error(err);
        setMessage("Error deleting category.");
      }
    }
  };

  // Open modal for edit
  const handleEdit = (category) => {
    setEditCategory(category);
  };

  // Update category
  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!editCategory.name || !editCategory.description) {
      setMessage(" Please fill all fields before saving.");
      return;
    }

    try {
      await update(ref(db, `QrCategory/${editCategory.id}`), {
        name: editCategory.name,
        description: editCategory.description,
      });

      setMessage("Category updated successfully!");
      setEditCategory(null);

      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setMessage("Error updating category.");
    }
  };

  return (
    <>
      {/* Add QR Type */}
      <div className="p-8  bg-gray-50 h-fit">
        <h1 className="text-center text-3xl font-bold mb-6">Add QR Type</h1>

        <form
          onSubmit={handleSubmit}
          className="max-w-md mx-auto bg-white shadow-lg rounded-xl p-6 space-y-4 mb-10"
        >
          <div>
            <label className="font-semibold block mb-1">Name</label>
            <input
              type="text"
              name="name"
              placeholder="Enter QR type name"
              value={form.name}
              onChange={handleChange}
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="font-semibold block mb-1">Description</label>
            <textarea
              name="description"
              placeholder="Enter description"
              value={form.description}
              onChange={handleChange}
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
              rows="3"
              required
            ></textarea>
          </div>

          <button
            type="submit"
            className="w-full bg-slate-800 text-white py-2 rounded-lg hover:bg-slate-700"
          >
            Add Data
          </button>

          {message && (
            <p className="text-center text-green-600 font-semibold mb-4">
              {message}
            </p>
          )}
        </form>
      </div>

      {/* Display Categories */}
      <div className="p-8 bg-gray-50 pb-20 min-h-screen">
        <h1 className="text-center text-3xl font-bold mb-6">Manage Categories</h1>

        {message && (
          <p className="text-center text-green-600 font-semibold mb-4">
            {message}
          </p>
        )}

        {qrCategories.length === 0 ? (
          <p className="text-center text-gray-500">No categories found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {qrCategories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition duration-300"
              >
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  {cat.name}
                </h3>
                <p className="text-gray-600 mb-4">{cat.description}</p>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleEdit(cat)}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Modal */}
        {editCategory && (
          <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4">Edit Category</h2>

              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block font-semibold mb-1">Name</label>
                  <input
                    type="text"
                    value={editCategory.name}
                    onChange={(e) =>
                      setEditCategory({
                        ...editCategory,
                        name: e.target.value,
                      })
                    }
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Description</label>
                  <textarea
                    value={editCategory.description}
                    onChange={(e) =>
                      setEditCategory({
                        ...editCategory,
                        description: e.target.value,
                      })
                    }
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  ></textarea>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setEditCategory(null)}
                    className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
