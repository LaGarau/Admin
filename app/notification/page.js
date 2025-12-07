"use client";
import React, { useState, useEffect, useRef } from "react";
import { realtimeDb } from "@/lib/firebase";
import { ref, push, onValue, onChildAdded, remove, update, get } from "firebase/database";
import { IoMdNotificationsOutline } from "react-icons/io";

const Notification = () => {
  const [users, setUsers] = useState([]);
  const [prizeCodes, setPrizeCodes] = useState([]);
  const [scannedUsers, setScannedUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const processingRef = useRef(new Set());
  const initialLoadRef = useRef(true);

  // --- 1. REAL-TIME DATA SYNC ---
  useEffect(() => {
    // Sync Users [cite: 607]
    onValue(ref(realtimeDb, "Users"), (snap) => {
      const data = snap.val();
      if (data) setUsers(Object.keys(data).map(key => ({ id: key, ...data[key] })));
    });

    // Sync Prize Codes [cite: 608]
    onValue(ref(realtimeDb, "PrizeCodes"), (snap) => {
      const data = snap.val();
      if (data) setPrizeCodes(Object.keys(data).map(key => ({ id: key, ...data[key] })));
    });

    // Sync Scans 
    onValue(ref(realtimeDb, "scannedQRCodes"), (snap) => {
      const data = snap.val();
      setScannedUsers(data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : []);
    });

    // Sync Notifications 
    onValue(ref(realtimeDb, "notifications"), (snap) => {
      const data = snap.val();
      if (data) setNotifications(Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse());
    });

    const timer = setTimeout(() => { initialLoadRef.current = false; }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // --- 2. PRIZE CLAIM HANDLER ---
  const handleClaimPrize = async (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return alert("User not found.");

    // Filter unique scans for this user 
    const userScans = scannedUsers.filter(s => s.userId === userId);
    const uniqueScans = new Set(userScans.map(s => s.qrName));

    if (uniqueScans.size < 8) {
      return alert(`Player progress: ${uniqueScans.size}/8. Keep scanning!`);
    }

    try {
      // Final Check: Ensure player hasn't already won 
      const winningStatusSnap = await get(ref(realtimeDb, `UsersWinningStatus/${userId}`));
      if (winningStatusSnap.val()?.won) {
        return alert("Player has already claimed their prize.");
      }

      // Check Prize Availability [cite: 624, 627]
      const availablePrizes = prizeCodes.filter(p => !p.used);
      if (availablePrizes.length === 0) {
        return alert("No prize codes remaining in the system.");
      }

      const selectedPrize = availablePrizes[0];

      // Atomic Update: Mark prize used and update user [cite: 645, 647]
      await update(ref(realtimeDb, `PrizeCodes/${selectedPrize.id}`), {
        used: true,
        assignedTo: userId,
        assignedAt: Date.now()
      });

      await update(ref(realtimeDb, `UsersWinningStatus/${userId}`), {
        won: true,
        prizeCode: selectedPrize.code,
        wonAt: Date.now()
      });

      // Log Success Notification [cite: 664]
      await push(ref(realtimeDb, "notifications"), {
        message: `🎉 Success! ${user.username} scanned all 8 QRs and won: ${selectedPrize.code}`,
        username: user.username,
        prizeCode: selectedPrize.code,
        status: "success",
        createdAt: Date.now()
      });

      alert(`Prize claimed for ${user.username}!`);
    } catch (error) {
      console.error("Claim error:", error);
    }
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
            return (
              <div key={u.id} className="flex justify-between items-center p-3 border rounded">
                <div>
                  <p className="font-medium">{u.username}</p>
                  <p className="text-xs text-gray-500">Unique codes: {count}/8</p>
                </div>
                <button 
                  onClick={() => handleClaimPrize(u.id)}
                  disabled={count < 8}
                  className={`px-4 py-2 rounded text-white text-sm ${count >= 8 ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'}`}
                >
                  {count >= 8 ? "Assign Prize" : "Locked"}
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
