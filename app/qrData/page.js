"use client";

import React, { useState, useEffect } from "react";
import { FaEdit, FaTrashAlt } from "react-icons/fa";
import { db } from "../firebase"; // Firebase database instance
import {
  ref,
  onValue,
  update,
  remove,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";
import QRCode from "qrcode";
import EditQrModal from "@/components/EditQrModel";
import QrPopupModal from "@/components/QrPopupModel";

export default function QrData() {
  // -------------------- State --------------------
  const [qrList, setQrList] = useState([]); // All QR codes
  const [selectedQR, setSelectedQR] = useState(null); // QR selected for edit
  const [categories, setCategories] = useState([]); // List of locations/categories
  const [qrType, setQrType] = useState([]); // List of locations/categories
  const [selectedLocation, setSelectedLocation] = useState(""); // Filter by location
  const [message, setMessage] = useState(""); // Success/error messages
  const [qrDataToShow, setQrDataToShow] = useState(null); // QR data to display in modal
  const [qrTypes, setQrTypes] = useState([]); // type dropdown
  const [form, setForm] = useState({
    name: "",
    latitude: "",
    longitude: "",
    type: "",
    points: "",
    location: "",
    picture: "",
    description: "",
    status: "Active",
  });

  /// ----------------- Fetch QR Category form the firesbase
  useEffect(() => {
    const qrTypeRef = ref(db, "QrType"); // Make sure this is the correct path in your Firebase
    const unsubscribe = onValue(qrTypeRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const typeArray = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setQrType(typeArray);
      } else {
        setQrType([]);
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

  // -------------------- Fetch Categories from Firebase --------------------
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

  // -------------------- Fetch QR List --------------------
  useEffect(() => {
    let qrQuery;
    if (selectedLocation) {
      // Filter by location if selected
      qrQuery = query(
        ref(db, "QR-Data"),
        orderByChild("location"),
        equalTo(selectedLocation)
      );
    } else {
      qrQuery = ref(db, "QR-Data");
    }

    const unsubscribe = onValue(qrQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const qrArray = Object.keys(data)
          .map((key) => ({ id: key, ...data[key] }))
          .sort((a, b) => b.timestamp - a.timestamp); // Sort by latest
        setQrList(qrArray);
      } else {
        setQrList([]);
      }
    });

    return () => unsubscribe();
  }, [selectedLocation]);

  // -------------------- Handle Form Input --------------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    let updatedForm = { ...form, [name]: value };
    if (name === "latitude" || name === "longitude") {
      // Update location string automatically
      updatedForm.location = `${updatedForm.latitude}, ${updatedForm.longitude}`;
    }
    setForm(updatedForm);
  };

  // -------------------- Edit QR --------------------
  const handleEditClick = (qr) => {
    setSelectedQR(qr);
    setForm(qr); // Pre-fill form with selected QR data
  };

  // -------------------- Update QR in Firebase --------------------
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedQR) return;
    try {
      const qrRef = ref(db, `QR-Data/${selectedQR.id}`);
      await update(qrRef, form);
      setMessage("QR updated successfully!");
      setTimeout(() => setMessage(""), 3000); // Clear message after 3s
      setSelectedQR(null); // Close edit form
    } catch (error) {
      console.error(error);
      setMessage("Error updating QR.");
    }
  };

  // -------------------- Delete QR --------------------
  const handleDelete = async (qrId) => {
    if (!window.confirm("Are you sure you want to delete this QR?")) return;
    try {
      await remove(ref(db, `QR-Data/${qrId}`));
      setQrList((prev) => prev.filter((qr) => qr.id !== qrId));
      setMessage("QR deleted successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error(error);
      setMessage("Error deleting QR.");
    }
  };

  // --------------------  QR with redirect link only --------------------
  const handleGenerateQR = (qr) => {
    //  Generating direct redirect link
    // const baseURL = "https://www.ghumanteyuwa.com/";

    // Qr name
    const name = (qr.name || qr.location).toLowerCase().replace(/\s+/g, "_");

    // qr location
    // const location = (selectedLocation || qr.location)
    // const location = (selectedLocation || qr.name)
    const location = qr.name.toLowerCase().replace(/\s+/g, "_");
    const points = qr.points || 0;
    // const finalURL = `${baseURL}${location.slice(0, 4)}-${name.slice(0,4)}${points}`;
    const finalURL = `${location},${points}`;

    //  Set QR data to display
    setQrDataToShow(finalURL);

    //  Keep selectedQR for download filename use
    setSelectedQR({
      ...qr,
      locationName: selectedLocation || qr.location,
    });
  };

  // -------------------- Download QR as PNG --------------------
  const downloadQR = () => {
    const canvas = document.querySelector("canvas");
    if (!canvas || !selectedQR) return;

    const image = canvas.toDataURL("image/png");
    const link = document.createElement("a");

    const location = selectedQR.locationName
      ? selectedQR.locationName.toLowerCase().replace(/\s+/g, "_")
      : "unknown";
    const name = selectedQR.name
      ? selectedQR.name.toLowerCase().replace(/\s+/g, "_")
      : "qr";

    link.href = image;
    link.download = `${location}_${name}.png`;
    link.click();

    // Close the QR popup and clear selected QR after download
    setQrDataToShow(null);
    setSelectedQR(null);
  };

  //----- generate all qr
  const handleGenerateAll = async () => {
    if (!qrList.length) return;

    // Filter QR list by selectedLocation
    const filteredQRs = selectedLocation
      ? qrList.filter((qr) => qr.location === selectedLocation)
      : qrList;

    for (const qr of filteredQRs) {
      try {
        // const baseURL = "https://www.ghumanteyuwa.com/";
        const name = (qr.name || qr.location)
          .toLowerCase()
          .replace(/\s+/g, "_");
        const location = (qr.location || "_")
          .toLowerCase()
          .replace(/\s+/g, "_");
        const points = qr.points || 0;
        const finalURL = `${qr.name},${points}`;

        // Generate QR code as data URL
        const imageUrl = await QRCode.toDataURL(finalURL, { width: 800 });

        // Download automatically
        const link = document.createElement("a");
        link.href = imageUrl;
        link.download = `${qr.name}_${name}.png`;
        link.click();
      } catch (error) {
        console.error("Error generating QR for", qr.name, error);
      }
    }
  };




  // -------------------- Toggle All QR Status (Active <-> Deactive) --------------------
const handleToggleAllStatus = async () => {
  if (!qrList.length) return;

  const filteredQRs = selectedLocation
    ? qrList.filter((qr) => qr.location === selectedLocation)
    : qrList;

  const confirmChange = window.confirm(
    "Are you sure you want to toggle the status of all listed QR codes?"
  );
  if (!confirmChange) return;

  try {
    // Decide new target status ONE TIME
    const activeCount = filteredQRs.filter(qr => qr.status === "Active").length;
    const targetStatus = activeCount > filteredQRs.length / 2 ? "Deactive" : "Active";

    const updates = {};
    
    filteredQRs.forEach((qr) => {
      updates[`QR-Data/${qr.id}/status`] = targetStatus;
    });

    await update(ref(db), updates); // atomic update

    setMessage(`All QR statuses updated to ${targetStatus}!`);
    setTimeout(() => setMessage(""), 3000);

  } catch (error) {
    console.error("Bulk update error:", error);
    setMessage("Error updating QR statuses.");
  }
};























  // -------------------- Render UI --------------------
  return (
    <div className="p-8 relative">
      <h1 className="text-center text-3xl font-bold mb-6">QR-Code List</h1>

      {/* Message for success/error */}
      {message && <p className="text-center text-green-600 mb-4">{message}</p>}

      {/* -------------------- Location Filter -------------------- */}
      <div className="mb-6 flex justify-center items-center gap-4">
        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="p-2 rounded bg-slate-100 focus:ring-2 focus:ring-blue-400 outline-none"
        >
          <option value="">-- All Locations --</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>

        <button
          onClick={handleGenerateAll}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Generate All Qr
        </button>
        <button
          onClick={handleToggleAllStatus}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-slate-700"
        >
          Switch Status
        </button>
      </div>

      {/* -------------------- QR List -------------------- */}
      {qrList.length === 0 ? (
        <p className="text-center text-gray-600">No QR data found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {qrList.map((qr) => (
            <div
              key={qr.id}
              className="relative bg-gray-800 text-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden"
              style={{
                backgroundImage: `url(${qr.picture})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {/*  dark overlay for readability */}
              <div className="absolute inset-0 bg-black/70"></div>

              {/* Card Content placed above the overlay */}
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-2">{qr.name}</h3>
                <p className="text-gray-200 mb-1">
                  <strong>Lat, Long:</strong> {qr.latitude}, {qr.longitude}
                </p>
                <p className="text-gray-200 mb-1">
                  <strong>Type:</strong> {qr.type}
                </p>
                <p className="text-gray-200 mb-1">
                  <strong>Points:</strong> {qr.points}
                </p>
                <p className="text-gray-200 mb-1">
                  <strong>Location:</strong> {qr.location}
                </p>
                <p className="text-gray-200 mb-1">
                  <strong>Description:</strong> {qr.description}
                </p>
                <p className="text-gray-200">
                  <strong>Status:</strong>{" "}
                  <span
                    className={`${
                      qr.status === "Active" ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {qr.status}
                  </span>
                </p>

                {/* Buttons */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleEditClick(qr)}
                    className="px-4 py-2 bg-blue-600 bg-opacity-80 text-white rounded-lg hover:bg-opacity-100 flex items-center gap-2"
                  >
                    <FaEdit /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(qr.id)}
                    className="px-4 py-2 bg-red-600 bg-opacity-80 text-white rounded-lg hover:bg-opacity-100 flex items-center gap-2"
                  >
                    <FaTrashAlt /> Delete
                  </button>
                  <button
                    onClick={() => handleGenerateQR(qr)}
                    className="px-4 py-2 bg-green-600 bg-opacity-80 text-white rounded-lg hover:bg-opacity-100"
                  >
                    Generate QR
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* -------------------- Edit Modal as Popup -------------------- */}
      {selectedQR && !qrDataToShow && (
        <EditQrModal
          selectedQR={selectedQR}
          form={form}
          handleChange={handleChange}
          handleUpdate={handleUpdate}
          setSelectedQR={setSelectedQR}
          categories={categories}
          qrType={qrTypes}
          message={message}
        />
      )}

      {/* -------------------- QR Popup Modal -------------------- */}
      {qrDataToShow && (
        <QrPopupModal
          qrDataToShow={qrDataToShow}
          setQrDataToShow={setQrDataToShow}
          setSelectedQR={setSelectedQR}
          downloadQR={downloadQR}
        />
      )}
    </div>
  );
}
