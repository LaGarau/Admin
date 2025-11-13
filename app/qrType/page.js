"use client";
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, push, onValue, remove } from "firebase/database";

export default function AddQrCategoryPage() {
  const [form, setForm] = useState({
    name: "",
    description: "",
  });
  const [qrType, setQrType] = useState([]);
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
    const isDuplicate = qrType.some(
      (cat) => cat.name.toLowerCase().trim() === trimmedName
    );

    if (isDuplicate) {
      setMessage("This Qr type  already exists!");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    try {
      const timestamp = Date.now();
      await push(ref(db, "QrCategory"), {
        name: form.name.trim(),
        description: form.description.trim(),
        timestamp,
      });

      setMessage("Qr type added successfully!");
      setForm({ name: "", description: "" });
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setMessage("Error in adding Qr Type location.");
    }
  };

  // Fetch categories
  useEffect(() => {
    const categoryRef = ref(db, "QrCategory");
    onValue(categoryRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setQrType(list);
      } else {
        setQrType([]);
      }
    });
  }, []);

  // Delete category
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this category?"
    );
    if (confirmDelete) {
      try {
        await remove(ref(db, `QrCategory/${id}`));
        setMessage("Data deleted successfully!");
        setTimeout(() => setMessage(""), 3000);
      } catch (err) {
        console.error(err);
        setMessage("Error deleting.");
      }
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-center text-3xl font-bold mb-6">Add Qr Type</h1>

      {/* Add Location Form */}
      <form
        onSubmit={handleSubmit}
        className="max-w-md mx-auto bg-white shadow-lg rounded-xl p-6 space-y-4 mb-10"
      >
        <div>
          <label className="font-semibold block mb-1">name</label>
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
          Add Data
        </button>
        {message && (
          <p className="text-center text-green-600 font-semibold mb-4">
            {message}
          </p>
        )}
      </form>

      
    </div>
  );
}
