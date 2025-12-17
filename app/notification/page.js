"use client";

// =====================================================
// Imports
// =====================================================
import React, { useState, useEffect, useRef } from "react";
import { IoMdNotificationsOutline } from "react-icons/io";
import { ref, push, onValue, onChildAdded, update, get, set, remove } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";

// =====================================================
// Component
// =====================================================
const Notification = () => {
  // ===================================================
  // State
  // ===================================================
  const [users, setUsers] = useState([]);
  const [prizeCodes, setPrizeCodes] = useState([]);
  const [scannedUsers, setScannedUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [prizeWon, setPrizeWon] = useState({});

  const [debugLogs, setDebugLogs] = useState([]);
  const [showDebug, setShowDebug] = useState(true);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [userToUndo, setUserToUndo] = useState(null);

  // ===================================================
  // Refs (race-condition & lifecycle guards)
  // ===================================================
  const processingRef = useRef(new Set());
  const processedScansRef = useRef(new Set());
  const initialLoadComplete = useRef(false);
  const outOfPrizesNotified = useRef(new Set());

  // ===================================================
  // Helpers
  // ===================================================
  const addDebugLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => ([
      { id: Date.now() + Math.random(), message, type, timestamp },
      ...prev,
    ].slice(0, 50)));
  };

  // ===================================================
  // 1. Initial Firebase Sync (Users, Prizes, Scans, Winners)
  // ===================================================
  useEffect(() => {
    addDebugLog("Starting Firebase listeners...");

    // Users
    onValue(ref(realtimeDb, "Users"), snap => {
      const data = snap.val();
      if (!data) return;
      const list = Object.keys(data).map(id => ({ id, ...data[id] }));
      setUsers(list);
      addDebugLog(`📊 Loaded ${list.length} users`, "success");
    });

    // Prize Codes
    onValue(ref(realtimeDb, "PrizeCodes"), snap => {
      const data = snap.val();
      if (!data) return;
      const prizes = Object.keys(data).map(id => ({ id, ...data[id] }));
      setPrizeCodes(prizes);
      const available = prizes.filter(p => !p.used).length;
      addDebugLog(`🎁 Loaded ${prizes.length} prizes (${available} available)`, "success");
    });

    // Scanned QR Codes
    onValue(ref(realtimeDb, "scannedQRCodes"), snap => {
      const data = snap.val();
      const scans = data ? Object.keys(data).map(id => ({ id, ...data[id] })) : [];
      setScannedUsers(scans);

      if (!initialLoadComplete.current) {
        scans.forEach(s => s.id && processedScansRef.current.add(s.id));
        initialLoadComplete.current = true;
        addDebugLog(`Initial load: ${scans.length} scans marked processed`, "info");
      }
    });

    // Notifications
    onValue(ref(realtimeDb, "notifications"), snap => {
      const data = snap.val();
      if (!data) return;
      setNotifications(Object.keys(data).map(id => ({ id, ...data[id] })).reverse());
    });

    // PrizeWon table
    onValue(ref(realtimeDb, "PrizeWon"), snap => {
      const data = snap.val() || {};
      setPrizeWon(data);
      const count = Object.keys(data).length;
      addDebugLog(`🏆 PrizeWon loaded (${count} winners)`, count ? "success" : "info");
    });
  }, []);

  // ===================================================
  // 2. Watch ONLY New Scans → Trigger on 8th unique scan
  // ===================================================
  useEffect(() => {
    if (!initialLoadComplete.current) return;

    const scanRef = ref(realtimeDb, "scannedQRCodes");

    const unsubscribe = onChildAdded(scanRef, async snap => {
      const scanId = snap.key;
      const scan = snap.val();
      if (!scan?.userId || !scan?.qrName) return;
      if (processedScansRef.current.has(scanId)) return;

      processedScansRef.current.add(scanId);
      const { userId } = scan;

      addDebugLog(`🆕 Scan: ${scan.qrName} by ${userId}`);

      if (prizeWon[userId]) {
        addDebugLog(`User ${userId} already won. Ignoring.`, "info");
        return;
      }

      try {
        const snapAll = await get(scanRef);
        const all = snapAll.val() || {};
        const userScans = Object.values(all).filter(s => s.userId === userId);
        const uniqueCount = new Set(userScans.map(s => s.qrName)).size;

        addDebugLog(`User ${userId}: ${uniqueCount}/8 scans`);

        if (uniqueCount === 8) {
          if (processingRef.current.has(userId)) return;
          processingRef.current.add(userId);
          await handleClaimPrize(userId);
          processingRef.current.delete(userId);
        }
      } catch (err) {
        addDebugLog(err.message, "error");
        processingRef.current.delete(userId);
      }
    });

    return () => unsubscribe();
  }, [prizeWon, users]);

  // ===================================================
  // 3. Claim Prize Logic
  // ===================================================
  const handleClaimPrize = async userId => {
    const user = users.find(u => u.id === userId);
    if (!user) return addDebugLog(`User ${userId} not found`, "error");

    try {
      const wonCheck = await get(ref(realtimeDb, `PrizeWon/${userId}`));
      if (wonCheck.exists()) return;

      const prizeSnap = await get(ref(realtimeDb, "PrizeCodes"));
      const wonSnap = await get(ref(realtimeDb, "PrizeWon"));

      const allPrizes = prizeSnap.val() || {};
      const won = wonSnap.val() || {};
      const used = new Set(Object.values(won).map(w => w.prizeCode));

      const available = Object.keys(allPrizes)
        .map(id => ({ id, ...allPrizes[id] }))
        .filter(p => !used.has(p.code));

      if (!available.length) {
        if (!outOfPrizesNotified.current.has(userId)) {
          outOfPrizesNotified.current.add(userId);
          await push(ref(realtimeDb, "notifications"), {
            message: `ALL PRIZES WON. ${user.username} completed 8 scans.`,
            username: user.username,
            prizeCode: "N/A",
            status: "out_of_prizes",
            createdAt: Date.now(),
          });
        }
        return;
      }

      const selected = available[Math.floor(Math.random() * available.length)];

      const scansSnap = await get(ref(realtimeDb, "scannedQRCodes"));
      const scans = scansSnap.val() || {};
      const userScans = Object.values(scans).filter(s => s.userId === userId);

      await set(ref(realtimeDb, `PrizeWon/${userId}`), {
        userId,
        username: user.username,
        prizeCode: selected.code,
        prizeId: selected.id,
        wonAt: Date.now(),
        scannedCodes: [...new Set(userScans.map(s => s.qrName))],
      });

      await update(ref(realtimeDb, `UsersWinningStatus/${userId}`), {
        won: true,
        prizeCode: selected.code,
        wonAt: Date.now(),
        username: user.username,
      });

      await push(ref(realtimeDb, "notifications"), {
        message: `${user.username} won ${selected.code}`,
        username: user.username,
        prizeCode: selected.code,
        status: "success",
        createdAt: Date.now(),
      });

      addDebugLog(`${user.username} won ${selected.code}`, "success");
    } catch (err) {
      addDebugLog(err.message, "error");
    }
  };

  // ===================================================
  // 4. Undo Winner
  // ===================================================
  const handleUndoWinner = async userId => {
    const data = prizeWon[userId];
    if (!data) return;

    await remove(ref(realtimeDb, `PrizeWon/${userId}`));
    await update(ref(realtimeDb, `UsersWinningStatus/${userId}`), {
      won: false,
      prizeCode: null,
      wonAt: null,
      undoneAt: Date.now(),
    });

    outOfPrizesNotified.current.delete(userId);

    await push(ref(realtimeDb, "notifications"), {
      message: `UNDO: ${data.username} (${data.prizeCode})`,
      username: data.username,
      prizeCode: data.prizeCode,
      status: "undo",
      createdAt: Date.now(),
    });

    setShowConfirmDialog(false);
    setUserToUndo(null);
  };

  // ===================================================
  // 5. UI
  // ===================================================
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <IoMdNotificationsOutline /> QR Competition Dashboard
        </h2>
        <button
          onClick={() => setShowDebug(v => !v)}
          className="px-4 py-2 bg-gray-800 text-white rounded"
        >
          {showDebug ? "Hide" : "Show"} Debug
        </button>
      </header>

      {/* Debug Panel */}
      {showDebug && (
        <div className="bg-gray-900 text-white rounded p-4 text-sm font-mono">
          {debugLogs.map(log => (
            <div key={log.id} className="opacity-90">[{log.timestamp}] {log.message}</div>
          ))}
        </div>
      )}

      {/* Winners */}
      <div className="bg-white rounded p-4">
        <h3 className="font-bold mb-2">Winners</h3>
        {Object.entries(prizeWon).map(([id, w]) => (
          <div key={id} className="flex justify-between border-b py-2">
            <span>{w.username} – {w.prizeCode}</span>
            <button
              onClick={() => { setUserToUndo({ ...w, userId: id }); setShowConfirmDialog(true); }}
              className="text-red-600"
            >Undo</button>
          </div>
        ))}
      </div>

      {/* Undo Dialog */}
      {showConfirmDialog && userToUndo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded">
            <p className="font-bold">Undo win for {userToUndo.username}?</p>
            <div className="flex gap-3 mt-4">
              <button onClick={() => handleUndoWinner(userToUndo.userId)} className="bg-red-600 text-white px-4 py-2 rounded">Undo</button>
              <button onClick={() => setShowConfirmDialog(false)} className="bg-gray-300 px-4 py-2 rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notification;
