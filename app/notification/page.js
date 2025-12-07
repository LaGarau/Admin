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

  // ── 1. REAL-TIME LISTENERS ──
  useEffect(() => {
    onValue(ref(realtimeDb, "Users"), (snap) => {
      const data = snap.val();
      setUsers(data ? Object.keys(data).map((k) => ({ id: k, ...data[k] })) : []);
    });

    onValue(ref(realtimeDb, "PrizeCodes"), (snap) => {
      const data = snap.val();
      setPrizeCodes(data ? Object.keys(data).map((k) => ({ id: k, ...data[k] })) : []);
    });

    onValue(ref(realtimeDb, "scannedQRCodes"), (snap) => {
      const data = snap.val();
      setScannedUsers(data ? Object.keys(data).map((k) => ({ id: k, ...data[k] })) : []);
    });

    onValue(ref(realtimeDb, "notifications"), (snap) => {
      const data = snap.val();
      if (data) {
        setNotifications(Object.keys(data).map((k) => ({ id: k, ...data[k] })).reverse());
      } else {
        setNotifications([]);
      }
    });
  }, []);

  // ── 2. AUTO WIN DETECTION ──
  useEffect(() => {
    if (users.length === 0 || scannedUsers.length === 0) return;

    users.forEach(async (user) => {
      if (processingRef.current.has(user.id)) return;

      const userScans = scannedUsers.filter((s) => s.userId === user.id);
      const uniqueCount = new Set(userScans.map((s) => s.qrName)).size;
      const required = Math.floor(Math.random() * 3) + 8; // 8-10

      if (uniqueCount >= required) {
        processingRef.current.add(user.id);

        try {
          // ← THIS LINE WAS STILL BROKEN BEFORE
          const statusSnap = await get(ref(realtimeDb, UsersWinningStatus/${user.id}));

          if (statusSnap.val()?.won) {
            processingRef.current.delete(user.id);
            return;
          }

          await assignPrizeToUser(user.id);
        } catch (err) {
          console.error("Auto-assign error:", err);
          processingRef.current.delete(user.id);
        }
      }
    });
  }, [users, scannedUsers]);

  // ── 3. ASSIGN PRIZE ──
  const assignPrizeToUser = async (userId) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const available = prizeCodes.filter((p) => !p.used);
    if (available.length === 0) {
      await push(ref(realtimeDb, "notifications"), {
        message: Warning: ${user.username} qualified but no prizes left!,
        username: user.username,
        status: "error",
        createdAt: Date.now(),
      });
      processingRef.current.delete(userId);
      return;
    }

    const prize = available[0];

    try {
      await update(ref(realtimeDb, PrizeCodes/${prize.id}), {
        used: true,
        assignedTo: userId,
        assignedAt: Date.now(),
      });

      await update(ref(realtimeDb, UsersWinningStatus/${userId}), {
        won: true,
        prizeCode: prize.code,
        wonAt: Date.now(),
      });

      await push(ref(realtimeDb, "notifications"), {
        message: Congratulations: ${user.username} won: ${prize.code},
        username: user.username,
        prizeCode: prize.code,
        status: "success",
        createdAt: Date.now(),
      });

      console.log(Prize auto-assigned to ${user.username});
    } catch (err) {
      console.error("Assignment failed:", err);
    } finally {
      processingRef.current.delete(userId);
    }
  };

  // ── 4. MANUAL CLAIM ──
  const handleManualClaim = async (userId) => {
    if (processingRef.current.has(userId)) {
      alert("Already processing...");
      return;
    }
    await assignPrizeToUser(userId);
  };

  // ── RENDER ──
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <IoMdNotificationsOutline /> QR Competition Dashboard
      </h2>

      {/* Player Progress */}
      <div className="bg-white shadow rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Player Progress</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {users.map((u) => {
            const count = new Set(
              scannedUsers.filter((s) => s.userId === u.id).map((s) => s.qrName)
            ).size;
            const won = notifications.find((n) => n.username === u.username && n.status === "success");

            return (
              <div
                key={u.id}
                className="flex justify-between items-center p-3 border rounded bg-gray-50"
              >
                <div>
                  <p className="font-medium">{u.username}</p>
                  <p className="text-xs text-gray-500">Unique scans: {count}/8–10</p>
                  {won && (
                    <p className="text-xs font-bold text-green-600">
                      Won: {won.prizeCode}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleManualClaim(u.id)}
                  disabled={count < 8 || !!won}
                  className={`px-4 py-2 rounded text-white text-sm ${
                    won
                      ? "bg-gray-400"
                      : count >= 8
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-gray-300 cursor-not-allowed"
                  }`}
                >
                  {won ? "Claimed" : count >= 8 ? "Force Assign" : "Locked"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Wins */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Live Wins (Latest 5)</h3>
        {notifications
          .filter((n) => n.status === "success")
          .slice(0, 5)
          .map((n) => (
            <div key={n.id} className="py-2 border-b text-sm">
              <strong>{n.username}</strong>: {n.prizeCode}{" "}
              <span className="text-gray-500">
                ({new Date(n.createdAt).toLocaleTimeString()})
              </span>
            </div>
          ))}
        {notifications.filter((n) => n.status === "success").length === 0 && (
          <p className="text-gray-500 italic">No winners yet</p>
        )}
      </div>
    </div>
  );
};

export default Notification;
