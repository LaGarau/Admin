"use client";
import React, { useState, useEffect, useRef } from "react";
import { realtimeDb } from "@/lib/firebase";
import { ref, push, onValue, onChildAdded, update, get } from "firebase/database";
import { IoMdNotificationsOutline } from "react-icons/io";

const Notification = () => {
  const [users, setUsers] = useState([]);
  const [prizeCodes, setPrizeCodes] = useState([]);
  const [scannedUsers, setScannedUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const processingRef = useRef(new Set());

  // ----------------------------------------------------
  // 1) SYNC REALTIME FIREBASE DATA
  // ----------------------------------------------------
  useEffect(() => {
    onValue(ref(realtimeDb, "Users"), (snap) => {
      const data = snap.val();
      if (data) setUsers(Object.keys(data).map(id => ({ id, ...data[id] })));
    });

    onValue(ref(realtimeDb, "PrizeCodes"), (snap) => {
      const data = snap.val();
      if (data) setPrizeCodes(Object.keys(data).map(id => ({ id, ...data[id] })));
    });

    onValue(ref(realtimeDb, "scannedQRCodes"), (snap) => {
      const data = snap.val();
      setScannedUsers(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });

    onValue(ref(realtimeDb, "notifications"), (snap) => {
      const data = snap.val();
      if (data)
        setNotifications(Object.keys(data).map(id => ({ id, ...data[id] })).reverse());
    });
  }, []);

  // ----------------------------------------------------
  // 2) AUTO TRIGGER PRIZE WHEN USER REACHES 8 SCANS
  // ----------------------------------------------------
  useEffect(() => {
    const scanRef = ref(realtimeDb, "scannedQRCodes");

    onChildAdded(scanRef, async (snap) => {
      const scan = snap.val();
      if (!scan?.userId || !scan?.qrName) return;

      const userId = scan.userId;

      // Prevent double-trigger
      if (processingRef.current.has(userId)) return;
      processingRef.current.add(userId);

      // Get all scans again
      const scansSnap = await get(scanRef);
      const allScans = scansSnap.val() || {};
      const userScans = Object.values(allScans).filter(s => s.userId === userId);

      const uniqueCount = new Set(userScans.map(s => s.qrName)).size;

      if (uniqueCount === 8) {
        await handleClaimPrize(userId);
      }

      processingRef.current.delete(userId);
    });
  }, [prizeCodes, users]);

  // ----------------------------------------------------
  // 3) CLAIM PRIZE FUNCTION (AUTO + MANUAL)
  // ----------------------------------------------------
  const handleClaimPrize = async (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    try {
      // Has the user already won?
      const winSnap = await get(ref(realtimeDb, UsersWinningStatus/${userId}));
      if (winSnap.val()?.won) return;

      const available = prizeCodes.filter(p => !p.used);
      if (available.length === 0) return;

      // RANDOM PRIZE
      const randomIndex = Math.floor(Math.random() * available.length);
      const selectedPrize = available[randomIndex];

      // Mark prize as used
      await update(ref(realtimeDb, PrizeCodes/${selectedPrize.id}), {
        used: true,
        assignedTo: userId,
        assignedAt: Date.now(),
      });

      // Mark user as winner
      await update(ref(realtimeDb, UsersWinningStatus/${userId}), {
        won: true,
        prizeCode: selectedPrize.code,
        wonAt: Date.now(),
      });

      // Log notification
      await push(ref(realtimeDb, "notifications"), {
        message: 🎉 ${user.username} completed all scans and won: ${selectedPrize.code},
        username: user.username,
        prizeCode: selectedPrize.code,
        status: "success",
        createdAt: Date.now(),
      });

    } catch (err) {
      console.log("Prize error:", err);
    }
  };

  // ----------------------------------------------------
  // 4) UI
  // ----------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <IoMdNotificationsOutline /> QR Competition Dashboard
      </h2>

      {/* PLAYER PROGRESS */}
      <div className="bg-white shadow rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Player Progress</h3>

        {users.map((u) => {
          const count = new Set(
            scannedUsers.filter(s => s.userId === u.id).map(s => s.qrName)
          ).size;

          return (
            <div key={u.id} className="flex justify-between items-center p-3 border rounded">
              <div>
                <p className="font-medium">{u.username}</p>
                <p className="text-xs text-gray-500">{count}/8 unique scans</p>
              </div>

              <button
                onClick={() => handleClaimPrize(u.id)}
                disabled={count < 8}
                className={`px-4 py-2 rounded text-white text-sm ${
                  count >= 8 ? "bg-green-600" : "bg-gray-300 cursor-not-allowed"
                }`}
              >
                {count >= 8 ? "Assign Prize" : "Locked"}
              </button>
            </div>
          );
        })}
      </div>

      {/* NOTIFICATION LOG */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Live Wins</h3>

        {notifications
          .filter(n => n.status === "success")
          .slice(0, 5)
          .map(n => (
            <div key={n.id} className="text-sm border-b py-2">
              <strong>{n.username}</strong>: {n.prizeCode} —{" "}
              {new Date(n.createdAt).toLocaleTimeString()}
            </div>
          ))}
      </div>
    </div>
  );
};

export default Notification;
