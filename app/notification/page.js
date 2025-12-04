"use client";

import React, { useState, useEffect } from "react";
import { realtimeDb } from "@/lib/firebase";
import { ref, push, onValue, remove, update } from "firebase/database";
import { IoMdNotificationsOutline } from "react-icons/io";

const Notification = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [imgUrl, setImgUrl] = useState("");
  const [message, setMessage] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [editId, setEditId] = useState(null);

  // Fetch notifications
  useEffect(() => {
    const notificationsRef = ref(realtimeDb, "notifications");

    onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const items = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setNotifications(items.reverse());
      } else {
        setNotifications([]);
      }
    });
  }, []);

  // Fetch Users
  useEffect(() => {
    const usersRef = ref(realtimeDb, "Users");

    onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setUsers(list);
      }
    });
  }, []);

  // Filter only users that have a valid username
  const filteredUsers = users.filter(
    (u) => u.username && u.username.trim() !== ""
  );

  // Add / Update Notification
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!message && !imgUrl) return;

    if (editId) {
      const updateRef = ref(realtimeDb, `notifications/${editId}`);
      update(updateRef, {
        imgUrl: imgUrl,
        message: message,
        username: selectedUser,
        createdAt: Date.now(),
      });
      setEditId(null);
    } else {
      const notificationsRef = ref(realtimeDb, "notifications");
      push(notificationsRef, {
        imgUrl: imgUrl,
        message: message,
        username: selectedUser,
        createdAt: Date.now(),
      });
    }

    setImgUrl("");
    setMessage("");
    setSelectedUser("");
  };

  const handleDelete = (id) => {
    const deleteRef = ref(realtimeDb, `notifications/${id}`);
    remove(deleteRef);
  };

  const handleEdit = (item) => {
    setImgUrl(item.imgUrl);
    setMessage(item.message);
    setSelectedUser(item.username || "");
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
          className="border rounded-lg p-3 w-full"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        <input
          type="text"
          placeholder="Enter Image URL"
          className="border rounded-lg p-3 w-full"
          value={imgUrl}
          onChange={(e) => setImgUrl(e.target.value)}
        />

        {/* Username Dropdown */}
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="w-full p-3 border rounded-lg"
        >
          <option value="">Select User</option>
          {filteredUsers.map((u) => (
            <option key={u.id} value={u.username}>
              {u.username}
            </option>
          ))}
        </select>

        <button className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-3 rounded-lg transition">
          {editId ? "Update" : "Submit"}
        </button>
      </form>

      {/* Display Notifications */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {notifications.map((item) => (
          <div
            key={item.id}
            className="bg-white shadow-lg rounded-lg overflow-hidden hover:scale-105 transition"
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
                <p className="text-gray-800 text-lg font-medium">
                  {item.message}
                </p>
              )}

              {item.username && (
                <p className="text-sm text-gray-600">
                  Posted by:{" "}
                  <span className="font-semibold">{item.username}</span>
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => handleEdit(item)}
                  className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
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
