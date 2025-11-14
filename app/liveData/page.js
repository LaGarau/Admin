"use client";

import { useEffect, useState } from "react";
import { ref, onChildAdded } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";

export default function AdminPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const scanRef = ref(realtimeDb, "scannedQRCodes");

    // Listen for new QR scan entries
    const unsubscribe = onChildAdded(scanRef, (snapshot) => {
      const entry = snapshot.val();
      if (!entry) return;

      const { userId, username, qrName, points } = entry;
      if (!userId || !qrName) return;

      const lastCommaIndex = qrName.lastIndexOf(",");
      const qrId = qrName.slice(0, lastCommaIndex).trim();
      const qrPointsStr = qrName.slice(lastCommaIndex + 1).trim();
      const qrPoints =
        points !== undefined ? Number(points) : Number(qrPointsStr);

      setUsers((prevUsers) => {
        const usersMap = {};

        prevUsers.forEach((user) => {
          usersMap[user.userId] = {
            username: user.username,
            scanned: new Set(user.scanned),
            totalPoints: user.totalPoints,
          };
        });

        if (!usersMap[userId]) {
          usersMap[userId] = {
            username: username || "Unknown",
            scanned: new Set(),
            totalPoints: 0,
          };
        }

        if (!usersMap[userId].scanned.has(qrId)) {
          usersMap[userId].scanned.add(qrId);
          usersMap[userId].totalPoints += qrPoints;
        }

        const processed = Object.entries(usersMap).map(([userId, info]) => ({
          userId,
          username: info.username,
          totalPoints: info.totalPoints,
          scanned: Array.from(info.scanned),
        }));

        processed.sort((a, b) => b.totalPoints - a.totalPoints);

        return processed;
      });
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-200 min-h-screen">
      {/* Header */}
      <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight mb-6">
        Admin – User Summary
      </h1>

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-300 overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-lg shadow-inner">
          Leaderboard Overview
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-indigo-50 text-indigo-900 text-sm uppercase font-semibold">
              <tr>
                <th className="px-6 py-3 border-b">S.No</th>
                <th className="px-6 py-3 border-b">Username</th>
                <th className="px-6 py-3 border-b">User ID</th>
                <th className="px-6 py-3 border-b">Total Points</th>
                <th className="px-6 py-3 border-b">Total QR Code Scanned</th>
                <th className="px-6 py-3 border-b">Scanned QR Codes</th>
              </tr>
            </thead>

            <tbody className="text-gray-700">
              {users.map((user, index) => (
                <tr
                  key={user.userId}
                  className="transition-all duration-300 hover:bg-indigo-50/70 odd:bg-white even:bg-gray-50"
                >
                  <td className="px-6 py-3 font-medium">{index + 1}</td>
                  <td className="px-6 py-3 font-semibold text-gray-800">
                    {user.username}
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-500">
                    {user.userId}
                  </td>
                  <td className="px-6 py-3 font-bold text-indigo-600 text-lg">
                    {user.totalPoints}
                  </td>
                  <td className="px-6 py-3 font-medium text-purple-600">
                    {user.scanned.length}
                  </td>
                  <td className="px-6 py-3">{user.scanned.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subtle animation for empty state */}
      {users.length === 0 && (
        <p className="mt-6 text-center text-gray-500 animate-pulse">
          No QR scans yet. Waiting for real-time updates...
        </p>
      )}
    </div>
  );
}
