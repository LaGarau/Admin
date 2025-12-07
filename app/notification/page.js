"use client";
import React, { useState, useEffect, useRef } from "react";
import { realtimeDb } from "@/lib/firebase";
import {
  ref,
  push,
  onValue,
  onChildAdded,
  remove,
  update,
  get,
  runTransaction,
} from "firebase/database";
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
  const initialLoadRef = useRef(true);

  const SCANS_TO_WIN = 8;

  // --- FETCH USERS ---
  useEffect(() => {
    {
    const usersRef = ref(realtimeDb, "Users");
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUsers(Object.keys(data).map((key) => ({ id: key, ...data[key] })));
      } else {
        setUsers([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- FETCH PRIZE CODES ---
  useEffect(() => {
    const prizeRef = ref(realtimeDb, "PrizeCodes");
    const unsubscribe = onValue(prizeRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setPrizeCodes(Object.keys(data).map((key) => ({ id: key, ...data[key] })));
      } else {
        setPrizeCodes([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- FETCH SCANNED QRCODES ---
  useEffect(() => {
    const scannedRef = ref(realtimeDb, "scannedQRCodes");
    const unsubscribe = onValue(scannedRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setScannedUsers(Object.keys(data).map((key) => ({ id: key, ...data[key] })));
      } else {
        setScannedUsers([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- FETCH NOTIFICATIONS ---
  useEffect(() => {
    const notificationsRef = ref(realtimeDb, "notifications");
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setNotifications(list.reverse());
      } else {
        setNotifications([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- MAIN LOGIC: 8 SCANS = WIN ---
  useEffect(() => {
    const scannedRef = ref(realtimeDb, "scannedQRCodes");

    const unsubscribe = onChildAdded(scannedRef, async (snapshot) => {
      if (initialLoadRef.current) return;

      const scanId = snapshot.key;
      const scan = snapshot.val();

      // Skip if already processed or being processed
      if (scan.processed || processingRef.current.has(scanId)) return;

      processingRef.current.add(scanId);

      try {
        // Mark as processing
        await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), { processing: true });

        const userId = scan.userId;
        if (!userId) return;

        // Get username
        let username = scan.username;
        if (!username) {
          const userSnap = await get(ref(realtimeDb, `Users/${userId}`));
          username = userSnap.val()?.username || "Unknown User";
        }

        // === PREVENT DUPLICATE SCAN OF SAME QR BY SAME USER ===
        const allScansSnap = await get(ref(realtimeDb, "scannedQRCodes"));
        const allScans = allScansSnap.val() || {};

        const isDuplicate = Object.values(allScans).some(
          (s) => s.userId === userId && s.qrId === scan.qrId && s.id !== scanId
        );

        if (isDuplicate) {
          await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), {
            processed: true,
            duplicateScan: true,
          });
          await sendNotification(username, scan.qrName || "this QR", null, "duplicate");
          return;
        }

        // === COUNT UNIQUE VALID SCANS FOR THIS USER ===
        const validScans = Object.values(allScans).filter((s) => {
          return s.userId === userId && !s.duplicateScan && s.processed !== false;
        });

        const scanCount = validScans.length; // includes current scan

        // Mark current scan as valid
        await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), {
          processed: true,
          validScan: true,
          scanNumber: scanCount,
        });

        // Send progress notification
        if (scanCount < SCANS_TO_WIN) {
          await sendNotification(
            username,
            scan.qrName || "a QR code",
            scanCount,
            "progress"
          );
        }

        // === USER REACHED 8 SCANS → WIN PRIZE ===
        if (scanCount >= SCANS_TO_WIN) {
          const userStatusRef = ref(realtimeDb, `UsersWinningStatus/${userId}`);

          const transactionResult = await runTransaction(userStatusRef, (current) => {
            if (current?.won) return current; // already won → abort
            return {
              won: true,
              wonAt: Date.now(),
              totalScans: scanCount,
            };
          });

          if (!transactionResult.committed) {
            await sendNotification(username, "8 scans completed", "Already claimed prize!", "already_won");
            return;
          }

          // Find an available prize
          const prizeSnap = await get(ref(realtimeDb, "PrizeCodes"));
          const prizes = prizeSnap.val() || {};
          const availablePrizeEntry = Object.entries(prizes).find(([_, p]) => !p.used);

          if (!availablePrizeEntry) {
            await sendNotification(username, "8 scans completed!", "No prizes left", "no_prize");
            return;
          }

          const [prizeId, prizeData] = availablePrizeEntry;

          // Assign prize
          await update(ref(realtimeDb, `PrizeCodes/${prizeId}`), {
            used: true,
            assignedTo: userId,
            assignedToUsername: username,
            assignedAt: Date.now(),
          });

          await update(ref(realtimeDb, `UsersWinningStatus/${userId}`), {
            prizeCode: prizeData.code,
            prizeId,
            qrId: prizeData.qrId,
            qrName: prizeData.qrName,
          });

          await push(ref(realtimeDb, "PrizeStatus"), {
            userId,
            username,
            prizeCode: prizeData.code,
            scansCompleted: scanCount,
            wonAt: new Date().toISOString(),
          });

          // WINNER NOTIFICATION
          await sendNotification(username, "8 SCANS COMPLETED!", prizeData.code, "winner");
        }
      } catch (error) {
        console.error("Error processing scan:", error);
      } finally {
        processingRef.current.delete(scanId);
      }
    });

    // Start listening after 2 seconds
    setTimeout(() => {
      initialLoadRef.current = false;
      console.log("8-Scan Challenge Mode ACTIVE");
    }, 2000);

    return () => unsubscribe();
  }, []);

  // --- SEND NOTIFICATION ---
  const sendNotification = async (username, qrName, value, status) => {
    let message = "";

    switch (status) {
      case "progress":
        message = `${username} scanned ${qrName} → ${value}/${SCANS_TO_WIN} scans! Keep going!`;
        break;
      case "winner":
        message = `JACKPOT! ${username} completed ${SCANS_TO_WIN} scans and WON → Prize: ${value}`;
        break;
      case "duplicate":
        message = `${username} already scanned ${qrName} before. Try a different QR!`;
        break;
      case "already_won":
        message = `${username} completed 8 scans but already claimed a prize!`;
        break;
      case "no_prize":
        message = `${username} completed 8 scans! But no prizes left. Contact admin.`;
        break;
      default:
        message = `${username} scanned ${qrName}`;
    }

    await push(ref(realtimeDb, "notifications"), {
      message,
      username,
      prizeCode: status === "winner" ? value : "",
      qrName,
      status,
      createdAt: Date.now(),
      imgUrl: "",
    });
  };

  // --- MANUAL NOTIFICATION ---
  const filteredUsers = users.filter((u) => u.username?.trim());
  const handleSubmit = () => {
    if (!message && !imgUrl) return;
    if (!selectedUserId) return alert("Please select a user!");

    const user = users.find((u) => u.id === selectedUserId);
    const payload = {
      message: message || "Custom notification",
      imgUrl,
      username: user.username,
      userId: selectedUserId,
      createdAt: Date.now(),
      status: "manual",
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
    setMessage(item.message || "");
    setImgUrl(item.imgUrl || "");
    setSelectedUserId(item.userId || "");
    setEditId(item.id);
  };

  const handleDelete = (id) => remove(ref(realtimeDb, `notifications/${id}`));

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-8 rounded-2xl text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">8 SCAN CHALLENGE MODE</h1>
        <p className="text-xl">Users must scan 8 different QR codes to win a prize!</p>
      </div>

      {/* Manual Notification Form */}
      <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
          <IoMdNotificationsOutline className="text-3xl" />
          {editId ? "Edit" : "Send"} Manual Notification
        </h2>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Message (optional)"
            className="w-full p-3 border rounded-lg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <input
            type="text"
            placeholder="Image URL (optional)"
            className="w-full p-3 border rounded-lg"
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
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>
          <button
            onClick={handleSubmit}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg w-full"
          >
            {editId ? "Update" : "Send"} Notification
          </button>
        </div>
      </div>

      {/* Debug: Prize Codes */}
      <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6 mb-8">
        <h3 className="text-xl font-bold text-blue-900 mb-4">Prize Pool Status</h3>
        <p>Total: {prizeCodes.length} | Available: {prizeCodes.filter(p => !p.used).length}</p>
      </div>

      {/* Live Scan Activity */}
      <div className="mb-8">
        <h3 className="text-2xl font-bold mb-4">Live Scan Progress</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => {
            const userScans = scannedUsers.filter(
              (s) => s.userId === user.id && s.validScan && !s.duplicateScan
            );
            const count = userScans.length;
            const hasWon = prizeCodes.some(p => p.used && p.assignedTo === user.id);

            return (
              <div key={user.id} className="bg-white p-5 rounded-xl shadow">
                <p className="font-bold text-lg">{user.username}</p>
                <p className="text-3xl font-bold text-purple-600">{count}/8</p>
                <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                  <div
                    className="bg-purple-600 h-3 rounded-full transition-all"
                    style={{ width: `${(count / 8) * 100}%` }}
                  />
                </div>
                {hasWon && <p className="text-green-600 font-bold mt-2">WON PRIZE!</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Notifications List */}
      <div>
        <h3 className="text-2xl font-bold mb-4">Notifications ({notifications.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {notifications.map((item) => {
            const date = new Date(item.createdAt).toLocaleString();
            return (
              <div key={item.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:scale-105 transition">
                {item.imgUrl && (
                  <img src={item.imgUrl} alt="" className="w-full h-48 object-cover" />
                )}
                <div className="p-5">
                  <p className="font-medium text-lg">{item.message}</p>
                  <p className="text-sm text-gray-500 mt-2">Sent: {date}</p>
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={() => handleEdit(item)}
                      className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
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
