"use client";
import React, { useState, useEffect, useRef } from "react";
import { realtimeDb } from "@/lib/firebase";
import { ref, push, onValue, onChildAdded, update, get, set, remove } from "firebase/database";
import { IoMdNotificationsOutline } from "react-icons/io";

const Notification = () => {
  const [users, setUsers] = useState([]);
  const [prizeCodes, setPrizeCodes] = useState([]);
  const [scannedUsers, setScannedUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [prizeWon, setPrizeWon] = useState({});
  const [debugLogs, setDebugLogs] = useState([]);
  const [showDebug, setShowDebug] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [userToUndo, setUserToUndo] = useState(null);

  const processingRef = useRef(new Set());

  const addDebugLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [{
      id: Date.now() + Math.random(),
      message,
      type,
      timestamp
    }, ...prev].slice(0, 50));
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

    onValue(ref(realtimeDb, "PrizeWon"), (snap) => {
      const data = snap.val();
      setPrizeWon(data || {});
      if (data) {
        const winnersCount = Object.keys(data).length;
        addDebugLog(`🏆 Loaded PrizeWon table: ${winnersCount} confirmed winners`, "success");
        
        // 🔥 NEW: Check for duplicate prizes
        const prizeCounts = {};
        Object.values(data).forEach(winner => {
          prizeCounts[winner.prizeCode] = (prizeCounts[winner.prizeCode] || 0) + 1;
        });
        const duplicates = Object.entries(prizeCounts).filter(([_, count]) => count > 1);
        if (duplicates.length > 0) {
          addDebugLog(`⚠️ DUPLICATE PRIZES DETECTED: ${duplicates.map(([code, count]) => `${code} (${count}x)`).join(', ')}`, "error");
        }
      } else {
        addDebugLog(`🏆 PrizeWon table is empty (no winners yet)`, "info");
      }
    });
  }, []);

  // ----------------------------------------------------
  // 2) AUTO TRIGGER PRIZE - CHECK PRIZEWON TABLE FIRST
  // ----------------------------------------------------
  useEffect(() => {
    const scanRef = ref(realtimeDb, "scannedQRCodes");

    onChildAdded(scanRef, async (snap) => {
      const scan = snap.val();
      if (!scan?.userId || !scan?.qrName) return;

      const userId = scan.userId;
      addDebugLog(`🔔 New scan detected: ${scan.qrName} by user ${userId}`, "info");

      if (prizeWon[userId]) {
        addDebugLog(`🚫 BLOCKED: User ${userId} found in PrizeWon table with prize "${prizeWon[userId].prizeCode}". NO ACTION.`, "error");
        return;
      }

      if (processingRef.current.has(userId)) {
        addDebugLog(`⏸️ User ${userId} already being processed, skipping...`, "warning");
        return;
      }
      processingRef.current.add(userId);

      try {
        const prizeWonCheck = await get(ref(realtimeDb, `PrizeWon/${userId}`));
        if (prizeWonCheck.exists()) {
          addDebugLog(`🚫 RACE CONDITION BLOCKED: User ${userId} already in PrizeWon table!`, "error");
          processingRef.current.delete(userId);
          return;
        }

        const scansSnap = await get(scanRef);
        const allScans = scansSnap.val() || {};
        const userScans = Object.values(allScans).filter(s => s.userId === userId);
        const uniqueCount = new Set(userScans.map(s => s.qrName)).size;
        
        addDebugLog(`📊 User ${userId} has ${uniqueCount} unique scans`, "info");

        if (uniqueCount === 8) {
          addDebugLog(`✅ User ${userId} reached EXACTLY 8 scans! Processing prize...`, "success");
          await handleClaimPrize(userId);
        } else if (uniqueCount < 8) {
          addDebugLog(`⏳ User ${userId} needs ${8 - uniqueCount} more scans`, "info");
        } else {
          addDebugLog(`⚠️ User ${userId} has ${uniqueCount} scans (>8 but not in PrizeWon table - possible issue)`, "warning");
        }
      } catch (error) {
        addDebugLog(`❌ Error processing scan: ${error.message}`, "error");
      } finally {
        processingRef.current.delete(userId);
      }
    });
  }, [prizeWon, prizeCodes, users]);

  // ----------------------------------------------------
  // 3) CLAIM PRIZE - POST TO PRIZEWON TABLE
  // ----------------------------------------------------
  const handleClaimPrize = async (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) {
      addDebugLog(`❌ User ${userId} not found in users list`, "error");
      return;
    }

    addDebugLog(`🎁 ========== PRIZE ASSIGNMENT START: ${user.username} ==========`, "info");

    try {
      addDebugLog(`🔍 Step 1: Checking PrizeWon table for ${user.username}...`, "info");
      const prizeWonCheck = await get(ref(realtimeDb, `PrizeWon/${userId}`));
      
      if (prizeWonCheck.exists()) {
        const existing = prizeWonCheck.val();
        addDebugLog(`🚫🚫🚫 ABORT: ${user.username} already in PrizeWon table!`, "error");
        addDebugLog(`🚫 Prize: "${existing.prizeCode}" won at ${new Date(existing.wonAt).toLocaleString()}`, "error");
        return;
      }
      addDebugLog(`✅ Step 1: ${user.username} NOT in PrizeWon table`, "success");

      addDebugLog(`🔍 Step 2: Verifying scan count...`, "info");
      const scansSnap = await get(ref(realtimeDb, "scannedQRCodes"));
      const allScans = scansSnap.val() || {};
      const userScans = Object.values(allScans).filter(s => s.userId === userId);
      const uniqueCount = new Set(userScans.map(s => s.qrName)).size;

      if (uniqueCount !== 8) {
        addDebugLog(`🚫 ABORT: ${user.username} has ${uniqueCount} scans, not EXACTLY 8`, "error");
        return;
      }
      addDebugLog(`✅ Step 2: ${user.username} has EXACTLY 8 unique scans`, "success");

      addDebugLog(`🔍 Step 3: Checking available prizes...`, "info");
      const availableSnap = await get(ref(realtimeDb, "PrizeCodes"));
      const allPrizes = availableSnap.val() || {};
      
      // 🔥 Check which prizes are already won
      const prizeWonSnap = await get(ref(realtimeDb, "PrizeWon"));
      const wonPrizes = prizeWonSnap.val() || {};
      const usedPrizeCodes = new Set(Object.values(wonPrizes).map(w => w.prizeCode));
      
      const available = Object.keys(allPrizes)
        .map(id => ({ id, ...allPrizes[id] }))
        .filter(p => !usedPrizeCodes.has(p.code)); // Filter out already won prizes
      
      if (available.length === 0) {
        addDebugLog(`❌ ABORT: No prizes available (${usedPrizeCodes.size} already won)`, "error");
        
        // 🚨 Send "All Prizes Finished" notification
        await push(ref(realtimeDb, "notifications"), {
          message: `🚫 ALL PRIZES HAVE BEEN WON! ${user.username} completed 8 scans but no prizes remain.`,
          username: user.username,
          prizeCode: "N/A - OUT OF STOCK",
          status: "out_of_prizes",
          createdAt: Date.now(),
        });
        addDebugLog(`📢 Sent "out of prizes" notification for ${user.username}`, "warning");
        return;
      }
      addDebugLog(`✅ Step 3: ${available.length} prizes available (${usedPrizeCodes.size} already won)`, "success");

      addDebugLog(`🎲 Step 4: Selecting random prize...`, "info");
      const randomIndex = Math.floor(Math.random() * available.length);
      const selectedPrize = available[randomIndex];
      addDebugLog(`✅ Step 4: Selected "${selectedPrize.code}" (${randomIndex + 1}/${available.length})`, "success");

      addDebugLog(`⏭️ Step 5: Skipping PrizeCodes update (count table only)`, "info");

      addDebugLog(`🏆 Step 6: POSTING TO PRIZEWON TABLE...`, "info");
      const wonData = {
        userId: userId,
        username: user.username,
        prizeCode: selectedPrize.code,
        prizeId: selectedPrize.id,
        wonAt: Date.now(),
        scannedCodes: Array.from(new Set(userScans.map(s => s.qrName)))
      };
      
      await set(ref(realtimeDb, `PrizeWon/${userId}`), wonData);
      addDebugLog(`✅ Step 6: ${user.username} POSTED TO PRIZEWON TABLE`, "success");

      addDebugLog(`📝 Step 7: Updating UsersWinningStatus...`, "info");
      await update(ref(realtimeDb, `UsersWinningStatus/${userId}`), {
        won: true,
        prizeCode: selectedPrize.code,
        wonAt: Date.now(),
        username: user.username,
      });
      addDebugLog(`✅ Step 7: UsersWinningStatus updated`, "success");

      addDebugLog(`📢 Step 8: Creating notification...`, "info");
      await push(ref(realtimeDb, "notifications"), {
        message: `🎉 ${user.username} completed 8 scans and won: ${selectedPrize.code}`,
        username: user.username,
        prizeCode: selectedPrize.code,
        status: "success",
        createdAt: Date.now(),
      });
      addDebugLog(`✅ Step 8: Notification created`, "success");

      addDebugLog(`🎊🎊🎊 SUCCESS: ${user.username} won "${selectedPrize.code}"! Entry locked in PrizeWon table.`, "success");
      addDebugLog(`========== PRIZE ASSIGNMENT COMPLETE ==========`, "success");

    } catch (err) {
      addDebugLog(`❌❌❌ CRITICAL ERROR: ${err.message}`, "error");
      console.error("Prize assignment error:", err);
    }
  };

  // ----------------------------------------------------
  // 🔥 NEW: UNDO WINNER FUNCTION
  // ----------------------------------------------------
  const handleUndoWinner = async (userId) => {
    const winData = prizeWon[userId];
    if (!winData) {
      addDebugLog(`❌ No win data found for user ${userId}`, "error");
      return;
    }

    addDebugLog(`🔄 ========== UNDO WIN START: ${winData.username} ==========`, "warning");

    try {
      // Step 1: Remove from PrizeWon table
      addDebugLog(`🗑️ Step 1: Removing ${winData.username} from PrizeWon table...`, "warning");
      await remove(ref(realtimeDb, `PrizeWon/${userId}`));
      addDebugLog(`✅ Step 1: Removed from PrizeWon table`, "success");

      // Step 2: Update UsersWinningStatus
      addDebugLog(`📝 Step 2: Resetting UsersWinningStatus...`, "warning");
      await update(ref(realtimeDb, `UsersWinningStatus/${userId}`), {
        won: false,
        prizeCode: null,
        wonAt: null,
        undoneAt: Date.now(),
      });
      addDebugLog(`✅ Step 2: UsersWinningStatus reset`, "success");

      // Step 3: Create undo notification
      addDebugLog(`📢 Step 3: Creating undo notification...`, "warning");
      await push(ref(realtimeDb, "notifications"), {
        message: `↩️ UNDO: ${winData.username}'s win (${winData.prizeCode}) was reverted by admin`,
        username: winData.username,
        prizeCode: winData.prizeCode,
        status: "undo",
        createdAt: Date.now(),
      });
      addDebugLog(`✅ Step 3: Undo notification created`, "success");

      addDebugLog(`✅✅✅ SUCCESS: ${winData.username}'s win has been undone. Prize "${winData.prizeCode}" is now available again.`, "success");
      addDebugLog(`========== UNDO WIN COMPLETE ==========`, "success");

      setShowConfirmDialog(false);
      setUserToUndo(null);

    } catch (err) {
      addDebugLog(`❌❌❌ UNDO ERROR: ${err.message}`, "error");
      console.error("Undo error:", err);
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

      {/* 🔥 NEW: UNDO CONFIRMATION DIALOG */}
      {showConfirmDialog && userToUndo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-red-600 mb-4">⚠️ Confirm Undo Winner</h3>
            <p className="text-gray-700 mb-2">
              Are you sure you want to undo the win for:
            </p>
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded p-3 mb-4">
              <p className="font-bold text-lg">{userToUndo.username}</p>
              <p className="text-sm text-gray-600">Prize: {userToUndo.prizeCode}</p>
              <p className="text-xs text-gray-500">Won at: {new Date(userToUndo.wonAt).toLocaleString()}</p>
            </div>
            <p className="text-sm text-red-600 mb-4">
              This will make the prize available again and allow the user to win a different prize if they scan 8 codes.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleUndoWinner(userToUndo.userId)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold"
              >
                Yes, Undo Win
              </button>
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setUserToUndo(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-semibold">Total Users</p>
          <p className="text-3xl font-bold text-blue-800">{users.length}</p>
        </div>
        <div className={`border-2 rounded-lg p-4 ${
          prizeCodes.length - Object.keys(prizeWon).length === 0 
            ? 'bg-red-50 border-red-300' 
            : 'bg-green-50 border-green-200'
        }`}>
          <p className={`text-sm font-semibold ${
            prizeCodes.length - Object.keys(prizeWon).length === 0 
              ? 'text-red-600' 
              : 'text-green-600'
          }`}>
            Available Prizes
          </p>
          <p className={`text-3xl font-bold ${
            prizeCodes.length - Object.keys(prizeWon).length === 0 
              ? 'text-red-800' 
              : 'text-green-800'
          }`}>
            {prizeCodes.length - Object.keys(prizeWon).length}
          </p>
          {prizeCodes.length - Object.keys(prizeWon).length === 0 && (
            <p className="text-xs text-red-600 font-semibold mt-1">🚫 OUT OF STOCK</p>
          )}
        </div>
        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-600 font-semibold">Total Scans</p>
          <p className="text-3xl font-bold text-purple-800">{scannedUsers.length}</p>
        </div>
        <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
          <p className="text-sm text-orange-600 font-semibold">🏆 Winners (PrizeWon)</p>
          <p className="text-3xl font-bold text-orange-800">
            {Object.keys(prizeWon).length}
          </p>
        </div>
      </div>

      {/* PRIZEWON TABLE VIEW */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-orange-300 rounded-lg p-4">
        <h3 className="text-lg font-bold mb-3 text-orange-800">🏆 PrizeWon Table (Source of Truth)</h3>
        {Object.keys(prizeWon).length === 0 ? (
          <p className="text-gray-600 text-sm">No winners recorded yet...</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(prizeWon).map(([userId, data]) => (
              <div key={userId} className="bg-white p-3 rounded-lg border border-orange-200 flex justify-between items-center">
                <div className="flex-1">
                  <p className="font-bold text-gray-800">{data.username}</p>
                  <p className="text-xs text-gray-600">User ID: {userId}</p>
                  <p className="text-sm font-mono bg-yellow-100 px-2 py-1 rounded mt-1 inline-block">
                    Prize: {data.prizeCode}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(data.wonAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setUserToUndo(data);
                    setShowConfirmDialog(true);
                  }}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-semibold text-sm transition-colors"
                >
                  ↩️ Undo
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PLAYER PROGRESS */}
      <div className="bg-white shadow rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Player Progress</h3>

        {users.length === 0 ? (
          <p className="text-gray-500 text-sm">No users yet...</p>
        ) : (
          users.map((u) => {
            const userScans = scannedUsers.filter(s => s.userId === u.id);
            const uniqueScans = new Set(userScans.map(s => s.qrName));
            const count = uniqueScans.size;
            const scanList = Array.from(uniqueScans);
            const hasWon = prizeWon[u.id];

            return (
              <div key={u.id} className={`mb-4 p-4 border-2 rounded-lg ${hasWon ? 'bg-green-50 border-green-400' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-lg">{u.username}</p>
                      {hasWon && (
                        <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full">
                          🏆 WINNER
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">User ID: {u.id}</p>
                    
                    {hasWon && (
                      <div className="mt-2 p-3 bg-yellow-100 border-2 border-yellow-400 rounded">
                        <p className="text-sm font-bold text-yellow-900">
                          🎁 Won Prize: <span className="font-mono text-lg">{hasWon.prizeCode}</span>
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Won at: {new Date(hasWon.wonAt).toLocaleString()}
                        </p>
                        <p className="text-xs text-yellow-700">
                          Recorded in PrizeWon table ✓
                        </p>
                      </div>
                    )}

                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold">{count}/8 unique scans</span>
                        <span className="text-gray-500">{Math.round((count / 8) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all ${
                            hasWon ? "bg-green-500" : count >= 8 ? "bg-green-500" : "bg-blue-500"
                          }`}
                          style={{ width: `${Math.min((count / 8) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>

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
                    disabled={count !== 8 || hasWon}
                    className={`ml-4 px-6 py-3 rounded-lg font-semibold text-white transition-all ${
                      hasWon
                        ? "bg-gray-400 cursor-not-allowed"
                        : count === 8
                        ? "bg-green-600 hover:bg-green-700 cursor-pointer"
                        : "bg-gray-300 cursor-not-allowed"
                    }`}
                  >
                    {hasWon ? "🏆 Won" : count === 8 ? "Assign Prize" : `Need ${8 - count} more`}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* NOTIFICATION LOG */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">🏆 Activity Log (Last 20)</h3>

        {notifications.length === 0 ? (
          <p className="text-gray-500 text-sm">No activity yet...</p>
        ) : (
          notifications
            .slice(0, 20)
            .map(n => (
              <div 
                key={n.id} 
                className={`text-sm border-b py-2 flex justify-between items-center ${
                  n.status === 'undo' ? 'bg-red-50' : 
                  n.status === 'out_of_prizes' ? 'bg-orange-50 border-l-4 border-orange-500' : 
                  n.status === 'success' ? 'bg-green-50' : ''
                }`}
              >
                <span>
                  <strong className={
                    n.status === 'undo' ? 'text-red-700' : 
                    n.status === 'out_of_prizes' ? 'text-orange-700' :
                    'text-green-700'
                  }>
                    {n.username}
                  </strong>:{" "}
                  <span className={`font-mono px-2 py-0.5 rounded ${
                    n.status === 'out_of_prizes' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100'
                  }`}>
                    {n.prizeCode}
                  </span>
                  {n.status === 'undo' && <span className="ml-2 text-red-600 font-semibold">(UNDONE)</span>}
                  {n.status === 'out_of_prizes' && <span className="ml-2 text-orange-600 font-bold">⚠️ NO PRIZES LEFT!</span>}
                </span>
                <span className="text-gray-500 text-xs">
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </div>
            ))
        )}
      </div>
    </div>
  );
};

export default Notification;
