"use client";

import React, { useState, useEffect, useRef } from "react";
import { realtimeDb } from "@/lib/firebase";
import { ref, push, onValue, onChildAdded, remove, update, get } from "firebase/database";
import { IoMdNotificationsOutline } from "react-icons/io";

const Notification = () => {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [imgUrl, setImgUrl] = useState("");
  const [message, setMessage] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [editId, setEditId] = useState(null);
  const [prizeCodes, setPrizeCodes] = useState([]);
  const [scannedUsers, setScannedUsers] = useState([]);
  const processingRef = useRef(new Set());

  // --- FETCH USERS ---
  useEffect(() => {
    const usersRef = ref(realtimeDb, "Users");
    onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUsers(Object.keys(data).map((key) => ({ id: key, ...data[key] })));
      }
    });
  }, []);

  // --- FETCH PRIZE CODES ---
  useEffect(() => {
    const prizeRef = ref(realtimeDb, "PrizeCodes");
    onValue(prizeRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setPrizeCodes(
          Object.keys(data).map((key) => ({ id: key, ...data[key] }))
        );
      }
    });
  }, []);

  // --- FETCH SCANNED USERS (only those who scanned) ---
  useEffect(() => {
    const scannedRef = ref(realtimeDb, "scannedQRCodes");
    onValue(scannedRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setScannedUsers(Object.keys(data).map((key) => ({ id: key, ...data[key] })));
      } else {
        setScannedUsers([]);
      }
    });
  }, []);

  // --- FETCH NOTIFICATIONS ---
  useEffect(() => {
    const notificationsRef = ref(realtimeDb, "notifications");
    onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setNotifications(
          Object.keys(data).map((key) => ({ id: key, ...data[key] })).reverse()
        );
      }
    });
  }, []);

  // --- LISTEN FOR NEW SCANS AND AUTO ASSIGN PRIZES ---
  useEffect(() => {
    const scannedRef = ref(realtimeDb, "scannedQRCodes");

    const unsubscribe = onChildAdded(scannedRef, async (snapshot) => {
      const scanId = snapshot.key;
      const scan = snapshot.val();

      // Skip if already processed or currently processing
      if (scan.processed || processingRef.current.has(scanId)) {
        return;
      }

      // Mark as processing
      processingRef.current.add(scanId);

      try {
        console.log("Processing new scan:", scanId, scan);

        // Get username
        let username = scan.username;
        if (!username && scan.userId) {
          const userSnap = await get(ref(realtimeDb, `Users/${scan.userId}`));
          username = userSnap.val()?.username || "Unknown";
        }

        // Check if user already has a prize
        const userStatusSnap = await get(ref(realtimeDb, `UsersWinningStatus/${scan.userId}`));
        const userStatus = userStatusSnap.val();

        if (userStatus?.won) {
          console.log(`User ${username} already won: ${userStatus.prizeCode}`);
          await sendNotification(username, scan.qrName, userStatus.prizeCode, true);
          await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), {
            prizeCode: userStatus.prizeCode,
            processed: true,
          });
          processingRef.current.delete(scanId);
          return;
        }

        // Get fresh prize codes data
        const prizeSnapshot = await get(ref(realtimeDb, "PrizeCodes"));
        const prizeData = prizeSnapshot.val();

        if (!prizeData) {
          console.log("No prizes available in database");
          await sendNotification(username, scan.qrName, null, false);
          await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), { processed: true });
          processingRef.current.delete(scanId);
          return;
        }

        // Filter for unused prizes matching the QR
        const allPrizes = Object.keys(prizeData).map((key) => ({
          id: key,
          ...prizeData[key],
        }));

        const availablePrizes = allPrizes.filter(
          (p) => !p.used && p.qrId === scan.qrId && p.qrName === scan.qrName
        );

        console.log(`Found ${availablePrizes.length} available prizes for ${scan.qrName}`);

        if (availablePrizes.length === 0) {
          console.log("No prizes available");
          await sendNotification(username, scan.qrName, null, false);
          await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), { processed: true });
          processingRef.current.delete(scanId);
          return;
        }

        // Select the first available prize
        const selectedPrize = availablePrizes[0];
        console.log(`Assigning prize ${selectedPrize.code} to ${username}`);

        // Update prize as used
        await update(ref(realtimeDb, `PrizeCodes/${selectedPrize.id}`), {
          used: true,
          assignedTo: scan.userId,
          assignedToUsername: username,
          assignedAt: Date.now(),
        });

        // Store in PrizeStatus
        await push(ref(realtimeDb, "PrizeStatus"), {
          userId: scan.userId,
          username,
          prizeCode: selectedPrize.code,
          prizeCodeId: selectedPrize.id,
          qrId: selectedPrize.qrId,
          qrName: selectedPrize.qrName,
          assignedAt: new Date().toISOString(),
        });

        // Update user winning status
        await update(ref(realtimeDb, `UsersWinningStatus/${scan.userId}`), {
          won: true,
          prizeCode: selectedPrize.code,
          prizeId: selectedPrize.id,
          qrId: selectedPrize.qrId,
          qrName: selectedPrize.qrName,
          wonAt: Date.now(),
        });

        // Update the scan record
        await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), {
          prizeCode: selectedPrize.code,
          processed: true,
          assignedAt: Date.now(),
        });

        // Send notification
        await sendNotification(username, scan.qrName, selectedPrize.code, false);

        console.log(`✅ Successfully assigned ${selectedPrize.code} to ${username}`);
      } catch (error) {
        console.error("Error processing scan:", error);
      } finally {
        processingRef.current.delete(scanId);
      }
    });

    return () => unsubscribe();
  }, []);

  const sendNotification = async (username, qrName, prizeCode, alreadyWon) => {
    const payload = {
      message: prizeCode
        ? `🎉 ${username} scanned ${qrName} — Congratulations! Prize Code: ${prizeCode}`
        : alreadyWon
        ? `${username} scanned ${qrName} — You've already won a prize!`
        : `${username} scanned ${qrName} — Sorry, no prizes available.`,
      username,
      prizeCode: prizeCode || "",
      qrName,
      createdAt: Date.now(),
      imgUrl: "",
    };
    await push(ref(realtimeDb, "notifications"), payload);
  };

  // --- MANUAL NOTIFICATION HANDLERS ---
  const filteredUsers = users.filter((u) => u.username?.trim() !== "");

  const handleSubmit = () => {
    if (!message && !imgUrl) return;
    if (!selectedUserId) return alert("Please select a user!");
    const selectedUser = users.find((u) => u.id === selectedUserId);
    const payload = {
      imgUrl,
      message,
      userId: selectedUserId,
      username: selectedUser.username,
      createdAt: Date.now(),
    };
    if (editId) {
      update(ref(realtimeDb, `notifications/${editId}`), payload);
      setEditId(null);
    } else {
      push(ref(realtimeDb, "notifications"), payload);
    }
    setMessage("");
    setImgUrl("");
    setSelectedUserId("");
  };

  const handleEdit = (item) => {
    setMessage(item.message);
    setImgUrl(item.imgUrl);
    setSelectedUserId(item.userId || "");
    setEditId(item.id);
  };

  const handleDelete = (id) => remove(ref(realtimeDb, `notifications/${id}`));

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Notification Form */}
      <div className="bg-white shadow-md rounded-lg p-6 space-y-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <IoMdNotificationsOutline />
          {editId ? "Edit Notification" : "Add Notification"}
        </h2>

        <input
          type="text"
          placeholder="Message"
          className="border p-3 w-full rounded-lg"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <input
          type="text"
          placeholder="Image URL"
          className="border p-3 w-full rounded-lg"
          value={imgUrl}
          onChange={(e) => setImgUrl(e.target.value)}
        />
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="border p-3 w-full rounded-lg"
        >
          <option value="">Select User</option>
          {filteredUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.username}
            </option>
          ))}
        </select>

        <button
          onClick={handleSubmit}
          className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700"
        >
          {editId ? "Update" : "Submit"}
        </button>
      </div>

      {/* Scanned Users / Assigned Prizes */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">
          Scanned Users ({scannedUsers.length})
        </h3>
        {scannedUsers.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No QR codes scanned yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {scannedUsers.map((scan) => {
              const username =
                users.find((u) => u.id === scan.userId)?.username ||
                scan.username ||
                "Unknown";
              return (
                <div
                  key={scan.id}
                  className="bg-white shadow-lg rounded-lg p-4 space-y-2"
                >
                  <p className="text-gray-800 font-medium text-lg">{username}</p>
                  <p className="text-gray-600">
                    Scanned QR:{" "}
                    <span className="font-semibold">{scan.qrName || "Unknown"}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Time:{" "}
                    {scan.scannedAt
                      ? new Date(scan.scannedAt).toLocaleString()
                      : "N/A"}
                  </p>
                  {scan.prizeCode ? (
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-xl text-center shadow-md mt-2">
                      <p className="text-sm font-semibold mb-1">🎉 PRIZE CODE</p>
                      <p className="text-3xl font-bold font-mono tracking-wider">
                        {scan.prizeCode}
                      </p>
                    </div>
                  ) : scan.processed ? (
                    <div className="bg-gray-400 text-white p-4 rounded-lg text-center">
                      <p className="text-sm">No prize available</p>
                    </div>
                  ) : (
                    <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 p-4 rounded-lg text-center">
                      <p className="text-sm font-semibold">⏳ Processing...</p>
                    </div>
                  )}
                  <div className="flex justify-end mt-2">
                    <button
                      className="bg-red-500 px-3 py-1 rounded text-white hover:bg-red-600"
                      onClick={() =>
                        remove(ref(realtimeDb, `scannedQRCodes/${scan.id}`))
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">
          Notifications ({notifications.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {notifications.map((item) => {
            const date = new Date(item.createdAt);
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
                  <p className="text-gray-800 text-lg font-medium">{item.message}</p>
                  {item.username && (
                    <p className="text-sm text-gray-600">
                      User: <span className="font-semibold">{item.username}</span>
                    </p>
                  )}
                  {item.prizeCode && (
                    <div className="bg-green-500 text-white p-6 rounded-xl shadow-2xl text-center mt-2">
                      <p className="text-2xl font-bold mb-2">CONGRATULATIONS!</p>
                      <p className="text-4xl font-mono tracking-wider">
                        {item.prizeCode}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Sent at: {date.toLocaleString()}
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="bg-yellow-400 px-3 py-1 rounded text-white hover:bg-yellow-500"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="bg-red-500 px-3 py-1 rounded text-white hover:bg-red-600"
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
    </div>
  );
};

export default Notification;