"use client";

import React, { useState, useEffect } from "react";
import { realtimeDb } from "@/lib/firebase";
import { ref, push, onValue, remove, update } from "firebase/database";
import { IoMdNotificationsOutline } from "react-icons/io";

const Notification = () => {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(""); // store user ID
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

  // Fetch users
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

  const filteredUsers = users.filter(
    (u) => u.username && u.username.trim() !== ""
  );

  // Add / Update Notification manually
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message && !imgUrl) return;
    if (!selectedUserId) {
      alert("Please select a user to send the notification!");
      return;
    }

    const selectedUserObj = users.find((u) => u.id === selectedUserId);

    if (editId) {
      const updateRef = ref(realtimeDb, `notifications/${editId}`);
      update(updateRef, {
        imgUrl,
        message,
        userId: selectedUserId,
        username: selectedUserObj.username,
        createdAt: Date.now(),
      });
      setEditId(null);
    } else {
      const notificationsRef = ref(realtimeDb, "notifications");
      push(notificationsRef, {
        imgUrl,
        message,
        userId: selectedUserId,
        username: selectedUserObj.username,
        createdAt: Date.now(),
      });
    }

    setImgUrl("");
    setMessage("");
    setSelectedUserId("");
  };

  const handleDelete = (id) => {
    const deleteRef = ref(realtimeDb, `notifications/${id}`);
    remove(deleteRef);
  };

  const handleEdit = (item) => {
    setImgUrl(item.imgUrl);
    setMessage(item.message);
    setSelectedUserId(item.userId || "");
    setEditId(item.id);
  };

  // Auto-send notification on new QR scan
  useEffect(() => {
    const scannedQRCodesRef = ref(realtimeDb, "scannedQRCodes");

    onValue(scannedQRCodesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const scans = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));

        scans.forEach((scan) => {
          // Check if notification already exists
          const exists = notifications.find(
            (n) =>
              n.userId === scan.userId &&
              n.message === `${scan.username} scanned ${scan.qrName}`
          );

          if (!exists) {
            const notificationsRef = ref(realtimeDb, "notifications");
            push(notificationsRef, {
              imgUrl: "", // optional image
              message: `${scan.username} scanned ${scan.qrName}`,
              userId: scan.userId,
              username: scan.username,
              createdAt: Date.now(),
            });
          }
        });
      }
    });
  }, []);



  

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Manual Notification Form */}{" "}
      <form
        className="bg-white shadow-md w-full rounded-lg p-6 space-y-4"
        onSubmit={handleSubmit}
      >
        {" "}
        <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
          {" "}
          <IoMdNotificationsOutline />
          {editId ? "Edit Notification" : "Add Notification"}{" "}
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
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="w-full p-3 border rounded-lg"
        >
          <option value="">Select User</option>
          {filteredUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.username}
            </option>
          ))}
        </select>
        <button className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-3 rounded-lg transition">
          {editId ? "Update" : "Submit"}
        </button>
      </form>
    
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {notifications.map((item) => {
          const date = new Date(item.createdAt);
          const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

          return (
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
                    Sent to:{" "}
                    <span className="font-semibold">{item.username}</span>
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  Sent at: {formattedDate}
                </p>
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
          );
        })}
      </div>
    </div>
  );
};

export default Notification;
