"use client";
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, push, onValue, remove } from "firebase/database";

export default function AddCategoryPage() {
  const [form, setForm] = useState({
    name: "",
    description: "",
  });
  const [categories, setCategories] = useState([]);
  const [message, setMessage] = useState("");

  // Handle input change
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Submit form data
  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = form.name.trim().toLowerCase();

    if (!trimmedName || !form.description.trim()) {
      setMessage("Please fill all fields.");
      return;
    }

    //  Check for duplicate location name
    const isDuplicate = categories.some(
      (cat) => cat.name.toLowerCase().trim() === trimmedName
    );

    if (isDuplicate) {
      setMessage("This location already exists!");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    try {
      const timestamp = Date.now();
      await push(ref(db, "Categories"), {
        name: form.name.trim(),
        description: form.description.trim(),
        timestamp,
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
    const confirmDelete = window.confirm("Are you sure you want to delete this location?");
    if (confirmDelete) {
      try {
        await remove(ref(db, `Categories/${id}`));
        setMessage("Location deleted successfully!");
        setTimeout(() => setMessage(""), 3000);
      } catch (err) {
        console.error(err);
        setMessage("Error deleting location.");
      }
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-center text-3xl font-bold mb-6">Add Location</h1>

      

      {/* Add Location Form */}
      <form
        onSubmit={handleSubmit}
        className="max-w-md mx-auto bg-white shadow-lg rounded-xl p-6 space-y-4 mb-10"
      >
        <div>
          <label className="font-semibold block mb-1">Location Name</label>
          <input
            type="text"
            name="name"
            placeholder="Enter location name"
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
          Add Location
        </button>
        {message && (
        <p className="text-center text-green-600 font-semibold mb-4">{message}</p>
      )}
      </form>

    
      
    </div>
  );
}



