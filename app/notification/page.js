"use client";
import React, { useState, useEffect, useRef } from "react";
import { realtimeDb } from "@/lib/firebase";
import { ref, push, onValue, update, get } from "firebase/database";
import { IoMdNotificationsOutline } from "react-icons/io";

const Notification = () => {
  const [users, setUsers] = useState([]);
  const [prizeCodes, setPrizeCodes] = useState([]);
  const [scannedUsers, setScannedUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const processingRef = useRef(new Set());

  // --- 1. REAL-TIME DATA SYNC ---
  useEffect(() => {
    onValue(ref(realtimeDb, "Users"), (snap) => {
      const data = snap.val();
      if (data) setUsers(Object.keys(data).map(key => ({ id: key, ...data[key] })));
    });

    onValue(ref(realtimeDb, "PrizeCodes"), (snap) => {
      const data = snap.val();
      if (data) setPrizeCodes(Object.keys(data).map(key => ({ id: key, ...data[key] })));
    });

    onValue(ref(realtimeDb, "scannedQRCodes"), (snap) => {
      const data = snap.val();
      setScannedUsers(data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : []);
    });

    onValue(ref(realtimeDb, "notifications"), (snap) => {
      const data = snap.val();
      if (data) setNotifications(Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse());
    });
  }, []);

  // --- 2. PRIZE ASSIGNMENT LOGIC ---
  const assignPrizeToUser = async (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    // Get available prizes
    const availablePrizes = prizeCodes.filter(p => !p.used);
    if (availablePrizes.length === 0) {
      await push(ref(realtimeDb, "notifications"), {
        message: ⚠️ ${user.username} qualified but no prizes left!,
        username: user.username,
        status: "error",
        createdAt: Date.now()
      });
      processingRef.current.delete(userId);
      return;
    }

    const selectedPrize = availablePrizes[0];

    try {
      // Mark prize as used
      await update(ref(realtimeDb, PrizeCodes/${selectedPrize.id}), {
        used: true,
        assignedTo: userId,
        assignedAt: Date.now()
      });

      // Update user winning status
      await update(ref(realtimeDb, UsersWinningStatus/${userId}), {
        won: true,
        prizeCode: selectedPrize.code,
        wonAt: Date.now()
      });

      // Log success
      await push(ref(realtimeDb, "notifications"), {
        message: 🎉 ${user.username} won: ${selectedPrize.code},
        username: user.username,
        prizeCode: selectedPrize.code,
        status: "success",
        createdAt: Date.now()
      });

      console.log(Prize auto-assigned to ${user.username});
    } catch (error) {
      console.error("Assignment failed:", error);
    } finally {
      processingRef.current.delete(userId);
    }
  };

  // --- 3. AUTO-DETECT PRIZE ELIGIBILITY ---
  useEffect(() => {
    if (users.length === 0 || scannedUsers.length === 0) return;

    users.forEach(async (user) => {
      // Skip if already processing this user
      if (processingRef.current.has(user.id)) return;

      // Count unique scans for this user
      const userScans = scannedUsers.filter(s => s.userId === user.id);
      const uniqueScans = new Set(userScans.map(s => s.qrName)).size;

      // Generate random target between 8-10
      const requiredScans = Math.floor(Math.random() * 3) + 8;

      // Check if eligible AND not already won
      if (uniqueScans >= requiredScans) {
        try {
          processingRef.current.add(user.id);

          // Double-check winning status with backticks
          const statusSnap = await get(ref(realtimeDb, UsersWinningStatus/${user.id}));
          
          if (statusSnap.val()?.won) {
            processingRef.current.delete(user.id);
            return;
          }

          // Assign prize automatically
          await assignPrizeToUser(user.id);
        } catch (error) {
          console.error("Auto-assign error:", error);
          processingRef.current.delete(user.id);
        }
      }
    });
  }, [scannedUsers, users, assignPrizeToUser]);

  // --- 4. MANUAL CLAIM (BACKUP) ---
  const handleManualClaim = async (userId) => {
    if (processingRef.current.has(userId)) {
      return alert("Already processing this user...");
    }
    await assignPrizeToUser(userId);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <IoMdNotificationsOutline /> QR Competition Dashboard
      </h2>

      {/* Progress Monitor */}
      <div className="bg-white shadow rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Player Progress</h3>
        <div className="space-y-3">
          {users.map(u => {
            const count = new Set(scannedUsers.filter(s => s.userId === u.id).map(s => s.qrName)).size;
            const wonStatus = notifications.find(n => n.username === u.username && n.status === "success");
            
            return (
              <div key={u.id} className="flex justify-between items-center p-3 border rounded">
                <div>
                  <p className="font-medium">{u.username}</p>
                  <p className="text-xs text-gray-500">Unique codes: {count}/8-10</p>
                  {wonStatus && <p className="text-xs text-green-600">✓ Won: {wonStatus.prizeCode}</p>}
                </div>
                <button 
                  onClick={() => handleManualClaim(u.id)}
                  disabled={count < 8 || wonStatus}
                  className={`px-4 py-2 rounded text-white text-sm ${
                    wonStatus ? 'bg-gray-400' : 
                    count >= 8 ? 'bg-green-600 hover:bg-green-700' : 
                    'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  {wonStatus ? "Prize Claimed" : count >= 8 ? "Force Assign" : "Locked"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Log Section */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Live Wins</h3>
        {notifications.filter(n => n.status === "success").slice(0, 5).map(n => (
          <div key={n.id} className="text-sm border-b py-2">
            <strong>{n.username}:</strong> {n.prizeCode} ({new Date(n.createdAt).toLocaleTimeString()})
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notification;
