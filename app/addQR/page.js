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
    prize: "",
    externalLink: "",
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

  // const handleSubmit = async (e) => {
  //   e.preventDefault();

  //   if (!form.name || !form.location || !form.type) {
  //     setMessage(" Please fill all required fields.");
  //     return;
  //   }

  //   try {
  //     const timestamp = Date.now();

  //     // 1Add QR code
  //     const qrRef = await push(ref(db, "QR-Data"), { ...form, timestamp });

  //     // 2 Generate prize codes if prize count > 0
  //     if (form.prize && form.prize > 0) {
  //       const prizeCodesRef = ref(db, "PrizeCodes");
  //       for (let i = 0; i < form.prize; i++) {
  //         const code = `${form.name.replace(/\s+/g, "-")}-${Date.now()}-${
  //           i + 1
  //         }`;
  //         await push(prizeCodesRef, {
  //           qrId: qrRef.key,
  //           qrName: form.name,
  //           code,
  //           used: false, // mark if the prize has been claimed
  //         });
  //       }
  //     }

  //     setMessage("QR Code added successfully!");
  //     setForm({
  //       name: "",
  //       latitude: "",
  //       longitude: "",
  //       location: "",
  //       type: "",
  //       prize: "",
  //       externalLink: "",
  //       points: "",
  //       picture: "",
  //       description: "",
  //       status: "Active",
  //     });
  //     setTimeout(() => setMessage(""), 3000);
  //   } catch (err) {
  //     console.error(err);
  //     setMessage("Error adding QR code.");
  //   }
  // };



  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!form.name || !form.location || !form.type) {
    setMessage("Please fill all required fields.");
    return;
  }

  try {
    const timestamp = Date.now();

    // 1. Add QR code
    const qrRef = await push(ref(db, "QR-Data"), { ...form, timestamp });

    // 2. Generate prize codes if prize count > 0
    if (form.prize && form.prize > 0) {
      const prizeCodesRef = ref(db, "PrizeCodes");
      for (let i = 0; i < form.prize; i++) {
        // Generate a random 4-digit number
        const random4Digit = Math.floor(1000 + Math.random() * 9000);
        const code = `${form.name.replace(/\s+/g, "-")}-${random4Digit}`;

        await push(prizeCodesRef, {
          qrId: qrRef.key,
          qrName: form.name,
          code,
          used: false, // mark if the prize has been claimed
        });
      }
    }

    setMessage("QR Code added successfully!");
    setForm({
      name: "",
      latitude: "",
      longitude: "",
      location: "",
      type: "",
      prize: "",
      externalLink: "",
      socialMediaLink: "",
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
    <div className="p-3 md:p-8 mb-10 min-h-screen">
      <div className=" items-center flex gap-7">
        <img src="mascot-with-qr.jpg" alt="img" />
        <div>
          <h1 className="text-3xl font-bold  ">
            Generate <span className="text-[#FF0000]">QR</span>
          </h1>
          <span className="opacity-80">
            Create QR codes for locations,sponsors, or hidden spots.
          </span>
        </div>
      </div>

      {message && (
        <p className="mb-4 text-green-600 text-center font-semibold">
          {message}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="max-w-xl mt-10  bg-[#F5F7FA] p-6 rounded-xl shadow space-y-4"
      >
        {/* QR Name */}
        <div>
          <label className="font-semibold">QR Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Enter the Qr Code Name"
            className="w-full p-2 mt-1 rounded-xl 
           px-2 md:px-5 placeholder:text-[#718EBF] text-blue-500 border-slate-500  border-2 focus:ring-2 focus:ring-blue-400 outline-none"
            required
          />
        </div>

        {/* Latitude & Longitude */}
        <div className=" flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-1/2">
            <label className="font-semibold">Latitude</label>
            <input
              type="text"
              name="latitude"
              value={form.latitude}
              placeholder="Enter the Latitude"
              onChange={handleChange}
              className="w-full p-2 mt-1 rounded-xl px-2 md:px-5 border-slate-500 placeholder:text-[#718EBF] text-blue-500 border-2 focus:ring-2 focus:ring-blue-400 outline-none"
            />
          </div>
          <div className="w-full md:w-1/2">
            <label className="font-semibold">Longitude</label>
            <input
              type="text"
              name="longitude"
              value={form.longitude}
              placeholder="Enter the Longitude"
              onChange={handleChange}
              className="w-full p-2 mt-1 rounded-xl px-2 md:px-5 border-2 placeholder:text-[#718EBF] border-slate-500  text-blue-500  focus:ring-2 focus:ring-blue-400 outline-none"
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
            className="w-full p-2 mt-1 rounded-xl px-2 md:px-5 border-slate-500 placeholder:text-[#718EBF]  text-[#718EBF] border-2 focus:ring-2 focus:ring-blue-400 outline-none"
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
              className="w-full p-2 mt-1 rounded-xl px-2 md:px-5 border-slate-500  placeholder:text-[#718EBF]  text-[#718EBF] border-2 focus:ring-2 focus:ring-blue-400 outline-none"
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
            <label className="font-semibold">Points Allocated</label>
            <input
              type="number"
              name="points"
              value={form.points}
              placeholder="Ente the Allocated Points"
              onChange={handleChange}
              min={1}
              className="w-full p-2 mt-1 rounded-xl px-2 md:px-5 border-slate-500 placeholder:text-[#718EBF]  text-blue-500 border-2 focus:ring-2 focus:ring-blue-400 outline-none"
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
            placeholder="Enter the Url of the image"
            className="w-full p-2 mt-1 rounded-xl px-2 md:px-5 border-slate-500  placeholder:text-[#718EBF] text-blue-500 border-2 focus:ring-2 focus:ring-blue-400 outline-none"
          />
        </div>

        {/* Description */}
        <div>
          <label className="font-semibold">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Enter the description"
            rows="3"
            className="w-full p-2 mt-1 rounded-xl px-2 md:px-5 border-slate-500 placeholder:text-[#718EBF] text-blue-500 border-2 focus:ring-2 focus:ring-blue-400 outline-none"
          />
        </div>

        {/* ----- Prize count ---------- */}
        <div className="w-full">
          <label className="font-semibold">Prize Count</label>
          <input
            type="number"
            name="prize"
            value={form.prize}
            placeholder="Ente the Allocated Points"
            onChange={handleChange}
            min={1}
            className="w-full p-2 mt-1 rounded-xl px-2 md:px-5 border-slate-500 placeholder:text-[#718EBF]  text-blue-500 border-2 focus:ring-2 focus:ring-blue-400 outline-none"
          />
        </div>

        {/* ------------ External link------------- */}
        <div>
          <label className="font-semibold">External Link</label>
          <input
            type="url"
            name="externalLink"
            value={form.externalLink}
            onChange={handleChange}
            placeholder="Enter the Url of the image"
            className="w-full p-2 mt-1 rounded-xl px-2 md:px-5 border-slate-500  placeholder:text-[#718EBF] text-blue-500 border-2 focus:ring-2 focus:ring-blue-400 outline-none"
          />
        </div>
        <div>
          <label className="font-semibold">SocialMedia Link</label>
          <input
            type="url"
            name="socialMediaLink"
            value={form.socialMediaLink}
            onChange={handleChange}
            placeholder="Enter the Url of the image"
            className="w-full p-2 mt-1 rounded-xl px-2 md:px-5 border-slate-500  placeholder:text-[#718EBF] text-blue-500 border-2 focus:ring-2 focus:ring-blue-400 outline-none"
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
          className="bg-[#FF0000] text-white px-6 py-2 rounded-lg hover:bg-[#eb0909] cursor-pointer transition-colors"
        >
          Generate QR Code
        </button>
      </form>
    </div>
  );
}
