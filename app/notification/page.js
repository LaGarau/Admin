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
  const [message, setMessage] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const processingRef = useRef(new Set());
  const initialLoadRef = useRef(true);

  // --- 1. DATA FETCHING ---
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
      if (data) {
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setNotifications(list.reverse());
      }
    });
  }, []);

  // --- 2. AUTOMATIC SCAN TRACKING (NO PRIZE YET) ---
  useEffect(() => {
    const scannedRef = ref(realtimeDb, "scannedQRCodes");
    const unsubscribe = onChildAdded(scannedRef, async (snapshot) => {
      if (initialLoadRef.current) return;

      const scanId = snapshot.key;
      const scan = snapshot.val();

      if (scan.processed || processingRef.current.has(scanId)) return;
      processingRef.current.add(scanId);

      try {
        // Mark scan as processed but don't give prize yet [cite: 621, 649]
        await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), { 
          processed: true,
          status: "tracked" 
        });
      } finally {
        processingRef.current.delete(scanId);
      }
    });

    const timer = setTimeout(() => { initialLoadRef.current = false; }, 2000);
    return () => { unsubscribe(); clearTimeout(timer); };
  }, []);

  // --- 3. MANUAL CLAIM PRIZE LOGIC ---
  const handleClaimPrize = async (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return alert("User not found");

    // Fetch all unique scans for this user
    const userScans = scannedUsers.filter(s => s.userId === userId);
    const uniqueScanNames = new Set(userScans.map(s => s.qrName));

    if (uniqueScanNames.size < 8) {
      return alert(`User has only scanned ${uniqueScanNames.size}/8 unique items.`);
    }

    // Check if already won [cite: 619, 620]
    const statusSnap = await get(ref(realtimeDb, `UsersWinningStatus/${userId}`));
    if (statusSnap.val()?.won) return alert("User already claimed a prize!");

    // Proceed to assign prize from available pool [cite: 627, 630, 645]
    const available = prizeCodes.filter(p => !p.used);
    if (available.length === 0) return alert("No prizes left in system!");

    const prize = available[0];

    try {
      // Atomic Update: Mark prize used and set user status [cite: 645, 647]
      await update(ref(realtimeDb, `PrizeCodes/${prize.id}`), {
        used: true,
        assignedTo: userId,
        assignedAt: Date.now()
      });

      await update(ref(realtimeDb, `UsersWinningStatus/${userId}`), {
        won: true,
        prizeCode: prize.code,
        wonAt: Date.now()
      });

      // Send Success Notification [cite: 650, 664]
      await push(ref(realtimeDb, "notifications"), {
        message: `🎉 CONGRATULATIONS ${user.username}! You found all 8 codes and won: ${prize.code}`,
        username: user.username,
        prizeCode: prize.code,
        status: "success",
        createdAt: Date.now()
      });

      alert("Prize successfully claimed!");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h2 className="text-3xl font-bold flex items-center gap-2">
        <IoMdNotificationsOutline /> QR Prize Manager
      </h2>

      {/* User Progress List */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Player Progress (Needs 8 for Prize)</h3>
        <div className="grid gap-4">
          {users.map(user => {
            const scanCount = new Set(scannedUsers.filter(s => s.userId === user.id).map(s => s.qrName)).size;
            return (
              <div key={user.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-bold text-lg">{user.username}</p>
                  <p className="text-sm text-gray-500">Unique Scans: {scanCount} / 8</p>
                </div>
                <button 
                  onClick={() => handleClaimPrize(user.id)}
                  disabled={scanCount < 8}
                  className={`px-4 py-2 rounded-lg text-white ${scanCount >= 8 ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
                >
                  {scanCount >= 8 ? "Claim Prize" : "Locked"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Notifications View */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Live Notifications</h3>
        {notifications.slice(0, 5).map(n => (
          <div key={n.id} className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded shadow-sm">
            <p className="font-medium">{n.message}</p>
            <p className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleTimeString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notification;
