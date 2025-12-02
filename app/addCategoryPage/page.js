"use client";
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, push, onValue, remove, update } from "firebase/database";

export default function AddCategoryPage() {
  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  const [categories, setCategories] = useState([]);
  const [message, setMessage] = useState("");

  const [editCategory, setEditCategory] = useState(null);

  // Handle input change
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = form.name.trim().toLowerCase();
    if (!trimmedName || !form.description.trim()) {
      setMessage("Please fill all fields.");
      return;
    }

    // Check duplicate
    const isDuplicate = categories.some(
      (cat) => cat.name.toLowerCase().trim() === trimmedName
    );

    if (isDuplicate) {
      setMessage("This location already exists!");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    try {
      await push(ref(db, "Categories"), {
        name: form.name.trim(),
        description: form.description.trim(),
        timestamp: Date.now(),
      });

      setMessage("Location added successfully!");
      setForm({ name: "", description: "" });
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setMessage("Error adding location.");
    }
  };

  // Fetch categories
  useEffect(() => {
  const categoryRef = ref(db, "Categories");
  onValue(categoryRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const list = Object.keys(data)
        .map((key) => ({
          id: key,
          ...data[key],
        }))
        .sort((a, b) => b.timestamp - a.timestamp); // Show latest first

      setCategories(list);
    } else {
      setCategories([]);
    }
  });
}, []);


  // Delete category
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Delete this category?");
    if (confirmDelete) {
      try {
        await remove(ref(db, `Categories/${id}`));
        setMessage("Category deleted!");
        setTimeout(() => setMessage(""), 3000);
      } catch (err) {
        console.error(err);
        setMessage("Error deleting.");
      }
    }
  };

  // Update category
  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!editCategory.name.trim() || !editCategory.description.trim()) {
      setMessage("All fields required.");
      return;
    }

    try {
      await update(ref(db, `Categories/${editCategory.id}`), {
        name: editCategory.name,
        description: editCategory.description,
      });

      setMessage("Category updated!");
      setEditCategory(null);
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setMessage("Error updating.");
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-center text-3xl font-bold mb-6">Add Location</h1>

      {/* Add Form */}
      <form
        onSubmit={handleSubmit}
        className="max-w-md mx-auto bg-white shadow-lg rounded-xl  p-6 space-y-4 mb-10"
      >
        <div>
          <label className="font-semibold block mb-1 ">Location Name</label>
          <input
            type="text"
            name="name"
            placeholder="Enter location name"
            value={form.name}
            onChange={handleChange}
            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
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
          ></textarea>
        </div>

        <button
          type="submit"
          className="w-full bg-slate-800 text-white py-2 rounded-lg hover:bg-slate-700"
        >
          Add Location
        </button>

        {message && (
          <p className="text-center text-green-600 font-semibold mt-2">{message}</p>
        )}
      </form>

      {/* Category List */}
      <h2 className="text-2xl font-bold mb-4 text-center">Existing Locations</h2>

      {categories.length === 0 ? (
        <p className="text-center text-gray-500">No locations found.</p>
      ) : (
        <div className="grid mb-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition"
            >
              <h3 className="text-lg font-bold mb-2">{cat.name}</h3>
              <p className="text-gray-600 mb-4">{cat.description}</p>

              <div className="flex gap-3">
                <button
                  onClick={() => setEditCategory(cat)}
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
        <div className="fixed inset-0 bg-gray-500 bg-opacity-40 flex justify-center items-center">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Edit Category</h2>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Name</label>
                <input
                  type="text"
                  value={editCategory.name}
                  onChange={(e) =>
                    setEditCategory({ ...editCategory, name: e.target.value })
                  }
                  className="w-full border p-2 rounded"
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
                  className="w-full border p-2 rounded"
                  rows="3"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setEditCategory(null)}
                  className="bg-gray-400 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
