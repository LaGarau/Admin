"use client";
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, push, onValue } from "firebase/database";

export default function AddQrPage() {
  const [form, setForm] = useState({
    name: "",
    latitude: "",
    longitude: "",
    location: "",
    type: "", 
    points: "",
    picture: "",
    description: "",
    status: "Active",
  });

  const [categories, setCategories] = useState([]); // location dropdown
  const [qrTypes, setQrTypes] = useState([]); // type dropdown
  const [message, setMessage] = useState("");

  // Fetch location categories
  useEffect(() => {
    const categoriesRef = ref(db, "Categories");
    const unsubscribe = onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const catArray = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setCategories(catArray);
      } else {
        setCategories([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch QR types
  useEffect(() => {
    const qrTypeRef = ref(db, "QrCategory"); 
    const unsubscribe = onValue(qrTypeRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const typeArray = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setQrTypes(typeArray);
      } else {
        setQrTypes([]);
      }
    });
    return () => unsubscribe();
  }, []);



//----- handle change
  // const handleChange = (e) => {
  //   setForm({ ...form, [e.target.name]: e.target.value });
  // };

  //----- handle change
const handleChange = (e) => {
  const { name, value } = e.target;

  setForm({
    ...form,
    [name]: name === "points" ? parseInt(value || 0, 10) : value,
  });
};



  //------ handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.location || !form.type) {
      setMessage("⚠️ Please fill all required fields.");
      return;
    }

    try {
      const timestamp = Date.now();
      await push(ref(db, "QR-Data"), { ...form, timestamp });
      setMessage("QR Code added successfully!");
      setForm({
        name: "",
        latitude: "",
        longitude: "",
        location: "",
        type: "",
        points: "",
        picture: "",
        description: "",
        status: "Active",
      });
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setMessage("Error adding QR code.");
    }
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center">Add QR Code</h1>

      {message && (
        <p className="mb-4 text-green-600 text-center font-semibold">{message}</p>
      )}

      <form
        onSubmit={handleSubmit}
        className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow space-y-4"
      >
        {/* QR Name */}
        <div>
          <label className="font-semibold">QR Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full p-2 mt-1 rounded bg-slate-100 focus:ring-2 focus:ring-blue-400 outline-none"
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
              className="w-full p-2 mt-1 rounded bg-slate-100 focus:ring-2 focus:ring-blue-400 outline-none"
            />
          </div>
          <div className="w-1/2">
            <label className="font-semibold">Longitude</label>
            <input
              type="text"
              name="longitude"
              value={form.longitude}
              onChange={handleChange}
              className="w-full p-2 mt-1 rounded bg-slate-100 focus:ring-2 focus:ring-blue-400 outline-none"
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
            className="w-full p-2 mt-1 rounded bg-slate-100 focus:ring-2 focus:ring-blue-400 outline-none"
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
              className="w-full p-2 mt-1 rounded bg-slate-100 focus:ring-2 focus:ring-blue-400 outline-none"
              required
            >
              <option value="">-- Select QR Type --</option>
              {qrTypes.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-1/2">
            <label className="font-semibold">Points</label>
            <input
              type="number"
              name="points"
              value={form.points}
              onChange={handleChange}
              className="w-full p-2 mt-1 rounded bg-slate-100 focus:ring-2 focus:ring-blue-400 outline-none"
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
            className="w-full p-2 mt-1 rounded bg-slate-100 focus:ring-2 focus:ring-blue-400 outline-none"
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
            className="w-full p-2 mt-1 rounded bg-slate-100 focus:ring-2 focus:ring-blue-400 outline-none"
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

        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add QR Code
        </button>
      </form>
    </div>
  );
}
