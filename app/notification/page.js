"use client";

import React, { useState, useEffect } from "react";
import { realtimeDb } from "@/lib/firebase";
import { ref, push, onValue, remove, update } from "firebase/database";
import { IoMdNotificationsOutline } from "react-icons/io";

const Notification = () => {
  const [imgUrl, setImgUrl] = useState("");
  const [message, setMessage] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [editId, setEditId] = useState(null); // Track editing

  useEffect(() => {
    const notificationsRef = ref(realtimeDb, "notifications");

    onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Store each item with its Firebase key for edit/delete
        const items = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setNotifications(items.reverse()); // newest first
      } else {
        setNotifications([]);
      }
    });
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!imgUrl && !message) return;

    if (editId) {
      // Editing existing notification
      const updateRef = ref(realtimeDb, `notifications/${editId}`);
      update(updateRef, {
        imgUrl: imgUrl || "",
        message: message || "",
        createdAt: Date.now(),
      });
      setEditId(null);
    } else {
      // Adding new notification
      const notificationsRef = ref(realtimeDb, "notifications");
      push(notificationsRef, {
        imgUrl: imgUrl || "",
        message: message || "",
        createdAt: Date.now(),
      });
    }

    setImgUrl("");
    setMessage("");
  };

  const handleDelete = (id) => {
    const deleteRef = ref(realtimeDb, `notifications/${id}`);
    remove(deleteRef);
  };

  const handleEdit = (item) => {
    setImgUrl(item.imgUrl);
    setMessage(item.message);
    setEditId(item.id);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Input Form */}
      <form
        className="bg-white shadow-md w-full rounded-lg p-6 space-y-4"
        onSubmit={handleSubmit}
      >
        <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
          <IoMdNotificationsOutline />
          {editId ? "Edit Notification" : "Add Notification"}
        </h2>

        <input
          type="text"
          placeholder="Enter Message"
          className="border rounded-lg p-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <h5 className="text-center text-gray-500">Or</h5>
        <input
          type="text"
          placeholder="Enter Image URL"
          className="border rounded-lg p-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={imgUrl}
          onChange={(e) => setImgUrl(e.target.value)}
        />

        <button className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-3 rounded-lg transition duration-300">
          {editId ? "Update" : "Submit"}
        </button>
      </form>

      {/* Display notifications */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {notifications.map((item) => (
          <div
            key={item.id}
            className="bg-white shadow-lg rounded-lg overflow-hidden transition transform hover:scale-105"
          >
            {item.imgUrl && (
              <img
                src={item.imgUrl}
                alt="notification"
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-4 space-y-2">
              {item.message && (
                <p className="text-gray-800 text-lg font-medium">{item.message}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => handleEdit(item)}
                  className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notification;
