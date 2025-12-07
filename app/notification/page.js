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

  // 1. FETCH DATABASE VALUES
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


  // 2. AUTO TRACK SCANS (NO PRIZE)
  useEffect(() => {
    const scannedRef = ref(realtimeDb, "scannedQRCodes");
    const unsub = onChildAdded(scannedRef, async (snapshot) => {
      if (initialLoadRef.current) return;

      const scanId = snapshot.key;
      const scan = snapshot.val();

      if (scan.processed || processingRef.current.has(scanId)) return;
      processingRef.current.add(scanId);

      try {
        await update(ref(realtimeDb, scannedQRCodes/${scanId}), {
          processed: true,
          status: "tracked",
        });
      } finally {
        processingRef.current.delete(scanId);
      }
    });

    const t = setTimeout(() => { initialLoadRef.current = false; }, 2000);
    return () => { unsub(); clearTimeout(t); };
  }, []);


  // 3. CLAIM PRIZE FUNCTION (FIXED DUPLICATE ISSUE)
  const handleClaimPrize = async (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return alert("User not found");

    // Get user scans
    const userScans = scannedUsers.filter(s => s.userId === userId);
    const uniqueScanNames = new Set(userScans.map(s => s.qrName));
    if (uniqueScanNames.size < 8) {
      return alert(User has only scanned ${uniqueScanNames.size}/8 items);
    }

    // Check winning status (already won?)
    const winSnap = await get(ref(realtimeDb, UsersWinningStatus/${userId}));
    if (winSnap.val()?.won) return alert("User already claimed prize!");

    // Select available prize
    const available = prizeCodes.filter(p => !p.used);
    if (available.length === 0) return alert("No prizes left!");
    const prize = available[0];

    try {
      // Mark prize used
      await update(ref(realtimeDb, PrizeCodes/${prize.id}), {
        used: true,
        assignedTo: userId,
        assignedAt: Date.now()
      });

      // Set win status
      await update(ref(realtimeDb, UsersWinningStatus/${userId}), {
        won: true,
        prizeCode: prize.code,
        wonAt: Date.now()
      });

      // ----- CHECK IF NOTIFICATION EXISTS -----
      const notifSnap = await get(ref(realtimeDb, "notifications"));
      if (notifSnap.exists()) {
        const notifData = notifSnap.val();
        const exists = Object.values(notifData).some(n =>
          n.username === user.username && n.prizeCode === prize.code
        );
        if (exists) {
          console.log("Notification prevented duplicate push");
          return alert("Prize already recorded earlier!");
        }
      }

      // ----- PUSH SINGLE NOTIFICATION -----
      await push(ref(realtimeDb, "notifications"), {
        message: 🎉 ${user.username} scanned Kathmandu Guest House — Congratulations! Prize Code: ${prize.code},
        username: user.username,
        prizeCode: prize.code,
        status: "success",
        createdAt: Date.now(),
        claimed: true,
        claimedAt: Date.now()
      });

      alert("Prize successfully claimed!");

    } catch (err) {
      console.error(err);
    }
  };


  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h2 className="text-3xl font-bold flex items-center gap-2">
        <IoMdNotificationsOutline /> QR Prize Manager
      </h2>

      {/* PROGRESS LIST */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Players Progress (Need 8 Scans)</h3>
        <div className="grid gap-4">
          {users.map(user => {
            const scanCount = new Set(scannedUsers.filter(s => s.userId === user.id).map(s => s.qrName)).size;
            return (
              <div key={user.id} className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="font-bold text-lg">{user.username}</p>
                  <p className="text-sm text-gray-500">
                    Unique Scans: {scanCount} / 8
                  </p>
                </div>
                <button
                  onClick={() => handleClaimPrize(user.id)}
                  disabled={scanCount < 8}
                  className={px-4 py-2 rounded-lg text-white ${scanCount >= 8 ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 cursor-not-allowed"}}
                >
                  {scanCount >= 8 ? "Claim Prize" : "Locked"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* LIVE NOTIFICATIONS */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Latest Notifications</h3>
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
