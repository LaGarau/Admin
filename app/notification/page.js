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
  const userLockRef = useRef(new Set());
  const initialLoadRef = useRef(true);

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
        setScannedUsers(
          Object.keys(data).map((key) => ({ id: key, ...data[key] }))
        );
      } else {
        setScannedUsers([]);
      }
    });
  }, []);

  // --- FETCH NOTIFICATIONS (deduplicated) ---
  useEffect(() => {
    const notificationsRef = ref(realtimeDb, "notifications");
    onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const notifList = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));

        const seen = new Map();
        const deduped = notifList.filter((notif) => {
          const key = `${notif.username}-${notif.prizeCode}-${notif.qrName}`;
          if (seen.has(key)) {
            remove(ref(realtimeDb, `notifications/${notif.id}`));
            return false;
          }
          seen.set(key, true);
          return true;
        });

        setNotifications(deduped.reverse());
      }
    });
  }, []);

  // --- LISTEN FOR NEW SCANS AND AUTO ASSIGN PRIZES ---
  useEffect(() => {
    const scannedRef = ref(realtimeDb, "scannedQRCodes");

    const unsubscribe = onChildAdded(scannedRef, async (snapshot) => {
      if (initialLoadRef.current) {
        return;
      }

      const scanId = snapshot.key;
      const scan = snapshot.val();

      console.log(`\n🔍 New scan detected: ${scanId} for user: ${scan.userId}`);

      if (scan.processed || processingRef.current.has(scanId)) {
        console.log(`⏭️ SKIP: Scan already processed`);
        return;
      }

      if (userLockRef.current.has(scan.userId)) {
        console.log(`⏭️ SKIP: User ${scan.userId} is already being processed`);
        return;
      }

      processingRef.current.add(scanId);
      userLockRef.current.add(scan.userId);

      await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), {
        processing: true,
      });

      try {
        console.log("=== PROCESSING NEW SCAN ===");
        console.log("User ID:", scan.userId);
        console.log("QR Info - qrId:", scan.qrId, "qrName:", scan.qrName);

        // Get username
        let username = scan.username;
        if (!username && scan.userId) {
          const userSnap = await get(ref(realtimeDb, `Users/${scan.userId}`));
          username = userSnap.val()?.username || "Unknown";
        }

        // CHECK: Has user already won?
        const userStatusSnap = await get(ref(realtimeDb, `UsersWinningStatus/${scan.userId}`));
        const userStatus = userStatusSnap.val();

        if (userStatus?.won) {
          console.log(`❌ User ${username} already won: ${userStatus.prizeCode}`);
          
          await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), {
            processed: true,
            alreadyWon: true,
            existingPrizeCode: userStatus.prizeCode,
          });
          
          await sendNotification(
            username, 
            scan.qrName, 
            userStatus.prizeCode, 
            "already_won",
            scan.qrId
          );
          
          return;
        }

        // GET USER'S SCAN HISTORY
        const userScansRef = ref(realtimeDb, `UserScanHistory/${scan.userId}`);
        const userScansSnap = await get(userScansRef);
        const scanHistory = userScansSnap.val() || {};

        // Check if this QR was already scanned
        if (scanHistory[scan.qrId]) {
          console.log(`⚠️ User already scanned this QR: ${scan.qrName}`);
          await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), {
            processed: true,
            duplicateQRScan: true,
          });
          await sendNotification(username, scan.qrName, null, "duplicate_qr", scan.qrId);
          return;
        }

        // Record this scan
        await update(userScansRef, {
          [scan.qrId]: {
            qrName: scan.qrName,
            scannedAt: Date.now(),
          }
        });

        // Count unique QRs scanned (including this one)
        const uniqueQRsScanned = Object.keys(scanHistory).length + 1;
        console.log(`📊 User has scanned ${uniqueQRsScanned}/8 unique QRs`);

        // WINNING LOGIC
        let shouldWin = false;
        let winReason = "";

        if (uniqueQRsScanned >= 8) {
          // 8th unique QR → GUARANTEED WIN
          shouldWin = true;
          winReason = "guaranteed_8th_scan";
          console.log("🎉 GUARANTEED WIN - 8th QR scanned!");
        } else {
          // Random chance: 16.7% (1 in 6)
          const roll = Math.random();
          shouldWin = roll < 0.167;
          winReason = shouldWin ? "random_win" : "random_lose";
          console.log(`🎲 Random roll: ${(roll * 100).toFixed(1)}% (need <16.7%) → ${shouldWin ? "WIN!" : "Lose"}`);
        }

        // If didn't win
        if (!shouldWin) {
          console.log(`😔 No prize this time. User has ${8 - uniqueQRsScanned} more chances.`);
          await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), {
            processed: true,
            didNotWin: true,
            uniqueQRsScanned,
            remainingChances: 8 - uniqueQRsScanned,
          });
          await sendNotification(
            username, 
            scan.qrName, 
            null, 
            "no_win_yet",
            scan.qrId,
            { uniqueQRsScanned, remainingChances: 8 - uniqueQRsScanned }
          );
          return;
        }

        // User won! Now get prizes
        const prizeSnapshot = await get(ref(realtimeDb, "PrizeCodes"));
        const prizeData = prizeSnapshot.val();

        if (!prizeData) {
          console.log("❌ No prizes available");
          await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), { 
            processed: true,
            noPrizesAvailable: true,
            wonButNoPrizes: true,
          });
          await sendNotification(username, scan.qrName, null, "no_prizes", scan.qrId);
          return;
        }

        const allPrizes = Object.keys(prizeData).map((key) => ({
          id: key,
          ...prizeData[key],
        }));

        // Try to match prizes
        let availablePrizes = allPrizes.filter((p) => 
          !p.used && p.qrId === scan.qrId && p.qrName === scan.qrName
        );

        if (availablePrizes.length === 0 && scan.qrName) {
          availablePrizes = allPrizes.filter((p) => !p.used && p.qrName === scan.qrName);
        }

        if (availablePrizes.length === 0 && scan.qrId) {
          availablePrizes = allPrizes.filter((p) => !p.used && p.qrId === scan.qrId);
        }

        if (availablePrizes.length === 0) {
          console.log(`❌ User won but no prizes for this QR`);
          await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), { 
            processed: true,
            wonButNoPrizesForQR: true,
          });
          await sendNotification(username, scan.qrName, null, "out_of_prizes", scan.qrId);
          return;
        }

        // Assign prize!
        const selectedPrize = availablePrizes[0];
        console.log(`✅ Assigning prize ${selectedPrize.code} to ${username} (${winReason})`);

        await update(ref(realtimeDb, `PrizeCodes/${selectedPrize.id}`), {
          used: true,
          assignedTo: scan.userId,
          assignedToUsername: username,
          assignedAt: Date.now(),
          winReason,
        });

        await push(ref(realtimeDb, "PrizeStatus"), {
          userId: scan.userId,
          username,
          prizeCode: selectedPrize.code,
          prizeCodeId: selectedPrize.id,
          qrId: selectedPrize.qrId,
          qrName: selectedPrize.qrName,
          assignedAt: new Date().toISOString(),
          uniqueQRsScanned,
          winReason,
        });

        await update(ref(realtimeDb, `UsersWinningStatus/${scan.userId}`), {
          won: true,
          prizeCode: selectedPrize.code,
          prizeId: selectedPrize.id,
          qrId: selectedPrize.qrId,
          qrName: selectedPrize.qrName,
          wonAt: Date.now(),
          uniqueQRsScanned,
          winReason,
        });

        await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), {
          prizeCode: selectedPrize.code,
          processed: true,
          assignedAt: Date.now(),
          winReason,
        });

        await sendNotification(username, scan.qrName, selectedPrize.code, "success", scan.qrId);

        console.log(`✅ Successfully assigned ${selectedPrize.code} to ${username}`);
        console.log("=== END PROCESSING ===\n");
      } catch (error) {
        console.error("❌ Error processing scan:", error);
        await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), {
          processed: true,
          error: error.message,
        });
      } finally {
        processingRef.current.delete(scanId);
        userLockRef.current.delete(scan.userId);
        console.log(`🔓 UNLOCKED: Scan ${scanId} and User ${scan.userId}`);
      }
    });

    const timer = setTimeout(() => {
      initialLoadRef.current = false;
      console.log("🎯 Now listening for NEW scans only");
    }, 2000);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const sendNotification = async (username, qrName, prizeCode, status, qrId, extraData = {}) => {
    const notifRef = ref(realtimeDb, "notifications");
    const snapshot = await get(notifRef);
    const existingNotifs = snapshot.val();

    if (existingNotifs) {
      const isDuplicate = Object.values(existingNotifs).some(
        (n) =>
          n.username === username &&
          n.qrName === qrName &&
          (Date.now() - n.createdAt) < 10000
      );

      if (isDuplicate) {
        console.log("⚠️ Notification already exists, skipping");
        return;
      }
    }

    let message = "";
    
    switch(status) {
      case "success":
        message = `🎉 ${username} scanned ${qrName} — WINNER! Prize Code: ${prizeCode}`;
        break;
      case "already_won":
        message = `${username} scanned ${qrName} — You've already won! Your prize: ${prizeCode}`;
        break;
      case "no_win_yet":
        const remaining = extraData.remainingChances || 0;
        message = `${username} scanned ${qrName} — Not this time! ${remaining} more ${remaining === 1 ? 'chance' : 'chances'} remaining.`;
        break;
      case "duplicate_qr":
        message = `${username} scanned ${qrName} — You already scanned this QR! Try other locations.`;
        break;
      case "out_of_prizes":
        message = `${username} scanned ${qrName} — Sorry! All prizes for this QR are claimed.`;
        break;
      case "no_prizes":
        message = `${username} scanned ${qrName} — No prizes available in the system.`;
        break;
      default:
        message = `${username} scanned ${qrName}`;
    }

    const payload = {
      message,
      username,
      prizeCode: prizeCode || "",
      qrName,
      qrId: qrId || "",
      status,
      createdAt: Date.now(),
      imgUrl: "",
      ...extraData,
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

      {/* Debug Info Section */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2 text-blue-800">
          🔍 Debug Info - Prize System
        </h3>
        <div className="space-y-2 text-sm">
          <p><strong>🎲 System:</strong> Guaranteed win within 8 unique QR scans</p>
          <p><strong>📊 Odds per scan:</strong> 16.7% (1 in 6 chance)</p>
          <p><strong>🎯 8th scan:</strong> 100% guaranteed win</p>
          <hr className="my-2"/>
          <p><strong>Total Prize Codes:</strong> {prizeCodes.length}</p>
          <p><strong>Unused Prizes:</strong> {prizeCodes.filter(p => !p.used).length}</p>
          <p><strong>Used Prizes:</strong> {prizeCodes.filter(p => p.used).length}</p>
          {prizeCodes.filter(p => !p.used).length > 0 && (
            <div className="mt-2">
              <p className="font-semibold text-blue-700">Available Prizes:</p>
              <div className="max-h-40 overflow-y-auto bg-white rounded p-2 mt-1">
                {prizeCodes.filter(p => !p.used).map(p => (
                  <div key={p.id} className="text-xs border-b border-gray-200 py-1">
                    <span className="font-mono font-bold">{p.code}</span> - 
                    QR: {p.qrName} (ID: {p.qrId})
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scanned Users */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">
          Scanned Users ({scannedUsers.length})
        </h3>
        {scannedUsers.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No QR codes scanned yet
          </p>
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
                  <p className="text-gray-800 font-medium text-lg">
                    {username}
                  </p>
                  <p className="text-gray-600">
                    Scanned QR:{" "}
                    <span className="font-semibold">
                      {scan.qrName || "Unknown"}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    QR ID: {scan.qrId || "N/A"}
                  </p>
                  {scan.uniqueQRsScanned && (
                    <p className="text-xs text-blue-600 font-semibold">
                      Progress: {scan.uniqueQRsScanned}/8 unique QRs
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Time:{" "}
                    {scan.scannedAt
                      ? new Date(scan.scannedAt).toLocaleString()
                      : "N/A"}
                  </p>
                  
                  {/* Prize Status Display */}
                  {scan.prizeCode ? (
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-xl text-center shadow-md mt-2">
                      <p className="text-sm font-semibold mb-1">
                        🎉 WINNER! PRIZE CODE
                      </p>
                      <p className="text-3xl font-bold font-mono tracking-wider">
                        {scan.prizeCode}
                      </p>
                      {scan.winReason === "guaranteed_8th_scan" && (
                        <p className="text-xs mt-2 opacity-90">
                          ⭐ Guaranteed 8th scan win!
                        </p>
                      )}
                    </div>
                  ) : scan.alreadyWon ? (
                    <div className="bg-orange-500 text-white p-4 rounded-lg text-center">
                      <p className="text-sm font-semibold">⚠️ Already Won</p>
                      <p className="text-xs mt-1">
                        Prize: {scan.existingPrizeCode}
                      </p>
                    </div>
                  ) : scan.didNotWin ? (
                    <div className="bg-yellow-400 text-gray-800 p-4 rounded-lg text-center">
                      <p className="text-sm font-semibold">🎲 Not This Time!</p>
                      <p className="text-xs mt-1">
                        {scan.remainingChances} more {scan.remainingChances === 1 ? 'chance' : 'chances'} left
                      </p>
                    </div>
                  ) : scan.duplicateQRScan ? (
                    <div className="bg-purple-400 text-white p-4 rounded-lg text-center">
                      <p className="text-sm font-semibold">♻️ Already Scanned</p>
                      <p className="text-xs mt-1">Try other QRs!</p>
                    </div>
                  ) : scan.processing ? (
                    <div className="bg-blue-100 border border-blue-400 text-blue-700 p-4 rounded-lg text-center">
                      <p className="text-sm font-semibold">⏳ Processing...</p>
                    </div>
                  ) : (
                    <div className="bg-gray-300 text-gray-700 p-4 rounded-lg text-center">
                      <p className="text-sm">Pending</p>
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
                  <p className="text-gray-800 text-lg font-medium">
                    {item.message}
                  </p>
                  {item.username && (
                    <p className="text-sm text-gray-600">
                      User:{" "}
                      <span className="font-semibold">{item.username}</span>
                    </p>
                  )}
                  {item.qrName && (
                    <p className="text-sm text-gray-600">
                      QR: <span className="font-semibold">{item.qrName}</span>
                    </p>
                  )}
                  {item.prizeCode && item.status === "success" && (
                    <div className="bg-green-500 text-white p-6 rounded-xl shadow-2xl text-center mt-2">
                      <p className="text-2xl font-bold mb-2">
                        🎉 WINNER!
                      </p>
                      <p className="text-4xl font-mono tracking-wider">
                        {item.prizeCode}
                      </p>
                    </div>
                  )}
                  {item.prizeCode && item.status === "already_won" && (
                    <div className="bg-orange-500 text-white p-4 rounded-xl text-center mt-2">
                      <p className="text-sm font-bold mb-1">
                        ALREADY WON
                      </p>
                      <p className="text-2xl font-mono tracking-wider">
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
