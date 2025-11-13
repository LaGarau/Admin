"use client";
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { ref, onValue, remove, update } from "firebase/database";

export default function ViewCategoryPage() {
  const [categories, setCategories] = useState([]);
  const [editCategory, setEditCategory] = useState(null);
  const [message, setMessage] = useState("");

  // Fetch categories
  useEffect(() => {
    const categoryRef = ref(db, "Categories");
    onValue(categoryRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setCategories(list);
      } else {
        setCategories([]);
      }
    });
  }, []);

  // Delete category
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this category?");
    if (confirmDelete) {
      try {
        await remove(ref(db, `Categories/${id}`));
        setMessage("Category deleted successfully!");
        setTimeout(() => setMessage(""), 3000);
      } catch (err) {
        console.error(err);
        setMessage("Error deleting category.");
      }
    }
  };

  // Open edit modal
  const handleEdit = (category) => {
    setEditCategory(category);
  };

  // Update category
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editCategory.name || !editCategory.description) {
      setMessage("Please fill all fields before saving.");
      return;
    }

    try {
      await update(ref(db, `Categories/${editCategory.id}`), {
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
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-center text-3xl font-bold mb-6">Manage Categories</h1>

      {message && (
        <p className="text-center text-green-600 font-semibold mb-4">{message}</p>
      )}

      {categories.length === 0 ? (
        <p className="text-center text-gray-500">No categories found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition duration-300"
            >
              <h3 className="text-lg font-bold text-gray-800 mb-2">{cat.name}</h3>
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
                    setEditCategory({ ...editCategory, name: e.target.value })
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
  );
}
