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
  const [debugLogs, setDebugLogs] = useState([]);
  const [showDebug, setShowDebug] = useState(true);

  const processingRef = useRef(new Set());

  const addDebugLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [{
      id: Date.now() + Math.random(),
      message,
      type,
      timestamp
    }, ...prev].slice(0, 50)); // Keep last 50 logs
  };

  // ----------------------------------------------------
  // 1) SYNC REALTIME FIREBASE DATA
  // ----------------------------------------------------
  useEffect(() => {
    addDebugLog("🔄 Starting Firebase listeners...", "info");
    
    onValue(ref(realtimeDb, "Users"), (snap) => {
      const data = snap.val();
      if (data) {
        const userList = Object.keys(data).map(id => ({ id, ...data[id] }));
        setUsers(userList);
        addDebugLog(`📊 Loaded ${userList.length} users`, "success");
      }
    });

    onValue(ref(realtimeDb, "PrizeCodes"), (snap) => {
      const data = snap.val();
      if (data) {
        const prizes = Object.keys(data).map(id => ({ id, ...data[id] }));
        setPrizeCodes(prizes);
        const available = prizes.filter(p => !p.used).length;
        addDebugLog(`🎁 Loaded ${prizes.length} prizes (${available} available)`, "success");
      }
    });

    onValue(ref(realtimeDb, "scannedQRCodes"), (snap) => {
      const data = snap.val();
      const scans = data ? Object.keys(data).map(id => ({ id, ...data[id] })) : [];
      setScannedUsers(scans);
      addDebugLog(`📱 Loaded ${scans.length} total scans`, "info");
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
      addDebugLog(`🔔 New scan detected: ${scan.qrName} by user ${userId}`, "info");

      // Prevent double-trigger
      if (processingRef.current.has(userId)) {
        addDebugLog(`⏸️ User ${userId} already being processed, skipping...`, "warning");
        return;
      }
      processingRef.current.add(userId);

      // Get all scans again
      const scansSnap = await get(scanRef);
      const allScans = scansSnap.val() || {};
      const userScans = Object.values(allScans).filter(s => s.userId === userId);

      const uniqueCount = new Set(userScans.map(s => s.qrName)).size;
      addDebugLog(`📊 User ${userId} has ${uniqueCount} unique scans`, "info");

      if (uniqueCount === 8) {
        addDebugLog(`🎯 User ${userId} reached 8 scans! Auto-assigning prize...`, "success");
        await handleClaimPrize(userId);
      } else {
        addDebugLog(`⏳ User ${userId} needs ${8 - uniqueCount} more unique scans`, "info");
      }

      processingRef.current.delete(userId);
    });
  }, [prizeCodes, users]);

  // ----------------------------------------------------
  // 3) CLAIM PRIZE FUNCTION (AUTO + MANUAL)
  // ----------------------------------------------------
  const handleClaimPrize = async (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) {
      addDebugLog(`❌ User ${userId} not found`, "error");
      return;
    }

    addDebugLog(`🎁 Starting prize assignment for ${user.username}...`, "info");

    try {
      // Has the user already won?
      addDebugLog(`🔍 Checking if ${user.username} already won...`, "info");
      const winSnap = await get(ref(realtimeDb, `UsersWinningStatus/${userId}`));
      if (winSnap.val()?.won) {
        addDebugLog(`⚠️ ${user.username} already won a prize!`, "warning");
        return;
      }

      const available = prizeCodes.filter(p => !p.used);
      addDebugLog(`📦 Found ${available.length} available prizes`, "info");
      
      if (available.length === 0) {
        addDebugLog(`❌ No prizes available!`, "error");
        return;
      }

      // RANDOM PRIZE
      const randomIndex = Math.floor(Math.random() * available.length);
      const selectedPrize = available[randomIndex];
      addDebugLog(`🎲 Randomly selected prize #${randomIndex + 1}: ${selectedPrize.code}`, "success");

      // Mark prize as used
      addDebugLog(`✏️ Marking prize ${selectedPrize.code} as used...`, "info");
      await update(ref(realtimeDb, `PrizeCodes/${selectedPrize.id}`), {
        used: true,
        assignedTo: userId,
        assignedAt: Date.now(),
      });


      // Mark user as winner
      addDebugLog(`🏆 Marking ${user.username} as winner...`, "info");
      await update(ref(realtimeDb, `UsersWinningStatus/${userId}`), {
        won: true,
        prizeCode: selectedPrize.code,
        wonAt: Date.now(),
      });

      // Log notification
      await push(ref(realtimeDb, "notifications"), {
        message: `🎉 ${user.username} completed all scans and won: ${selectedPrize.code}`,
        username: user.username,
        prizeCode: selectedPrize.code,
        status: "success",
        createdAt: Date.now(),
      });

      addDebugLog(`✅ Successfully assigned ${selectedPrize.code} to ${user.username}!`, "success");

    } catch (err) {
      addDebugLog(`❌ Prize assignment error: ${err.message}`, "error");
      console.log("Prize error:", err);
    }
  };

  // ----------------------------------------------------
  // 4) UI
  // ----------------------------------------------------
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <IoMdNotificationsOutline /> QR Competition Dashboard
        </h2>
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
        >
          {showDebug ? "Hide" : "Show"} Debug Panel
        </button>
      </div>

      {/* DEBUG PANEL */}
      {showDebug && (
        <div className="bg-gray-900 text-white rounded-lg p-4 font-mono text-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-lg">🔧 Debug Console</h3>
            <button
              onClick={() => setDebugLogs([])}
              className="px-3 py-1 bg-red-600 rounded text-xs hover:bg-red-500"
            >
              Clear Logs
            </button>
          </div>
          
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {debugLogs.length === 0 ? (
              <p className="text-gray-400">No logs yet...</p>
            ) : (
              debugLogs.map(log => (
                <div
                  key={log.id}
                  className={`p-2 rounded ${
                    log.type === "success"
                      ? "bg-green-900/30 text-green-300"
                      : log.type === "error"
                      ? "bg-red-900/30 text-red-300"
                      : log.type === "warning"
                      ? "bg-yellow-900/30 text-yellow-300"
                      : "bg-blue-900/30 text-blue-300"
                  }`}
                >
                  <span className="text-gray-400 text-xs">[{log.timestamp}]</span>{" "}
                  {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-semibold">Total Users</p>
          <p className="text-3xl font-bold text-blue-800">{users.length}</p>
        </div>
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-semibold">Available Prizes</p>
          <p className="text-3xl font-bold text-green-800">
            {prizeCodes.filter(p => !p.used).length}
          </p>
        </div>
        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-600 font-semibold">Total Scans</p>
          <p className="text-3xl font-bold text-purple-800">{scannedUsers.length}</p>
        </div>
      </div>

      {/* PLAYER PROGRESS */}
      <div className="bg-white shadow rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Player Progress</h3>

        {users.map((u) => {
          const userScans = scannedUsers.filter(s => s.userId === u.id);
          const uniqueScans = new Set(userScans.map(s => s.qrName));
          const count = uniqueScans.size;
          const scanList = Array.from(uniqueScans);

          return (
            <div key={u.id} className="mb-4 p-4 border rounded-lg bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <p className="font-bold text-lg">{u.username}</p>
                  <p className="text-sm text-gray-600">User ID: {u.id}</p>
                  
                  {/* Progress Bar */}
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold">{count}/8 unique scans</span>
                      <span className="text-gray-500">{Math.round((count / 8) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          count >= 8 ? "bg-green-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${Math.min((count / 8) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Scanned QR Codes */}
                  {scanList.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Scanned Codes:</p>
                      <div className="flex flex-wrap gap-1">
                        {scanList.map((qr, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                          >
                            {qr}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    addDebugLog(`🖱️ Manual prize claim triggered for ${u.username}`, "info");
                    handleClaimPrize(u.id);
                  }}
                  disabled={count < 8}
                  className={`ml-4 px-6 py-3 rounded-lg font-semibold text-white transition-all ${
                    count >= 8
                      ? "bg-green-600 hover:bg-green-700 cursor-pointer"
                      : "bg-gray-300 cursor-not-allowed"
                  }`}
                >
                  {count >= 8 ? "Assign Prize" : `${8 - count} more needed`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* NOTIFICATION LOG */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">🏆 Live Wins</h3>

        {notifications.filter(n => n.status === "success").length === 0 ? (
          <p className="text-gray-500 text-sm">No winners yet...</p>
        ) : (
          notifications
            .filter(n => n.status === "success")
            .slice(0, 10)
            .map(n => (
              <div key={n.id} className="text-sm border-b py-2 flex justify-between">
                <span>
                  <strong className="text-green-700">{n.username}</strong>:{" "}
                  <span className="font-mono bg-yellow-100 px-2 py-0.5 rounded">
                    {n.prizeCode}
                  </span>
                </span>
                <span className="text-gray-500">
                  {new Date(n.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))
        )}
      </div>
    </div>
  );
};

export default Notification;
