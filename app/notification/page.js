"use client";

import React, { useEffect, useState } from "react";
import { realtimeDb } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";

const PrizeAssignments = () => {
  const [assignedPrizes, setAssignedPrizes] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🏆 Fetch prizes from PrizeWon table (single source of truth)
  useEffect(() => {
    const prizeWonRef = ref(realtimeDb, "PrizeWon");
    
    const unsubscribe = onValue(prizeWonRef, (snapshot) => {
      const data = snapshot.val();
      
      if (data) {
        // Convert object to array and sort by most recent first
        const prizesArray = Object.entries(data).map(([userId, prizeData]) => ({
          userId,
          ...prizeData
        })).sort((a, b) => b.wonAt - a.wonAt); // Most recent first
        
        setAssignedPrizes(prizesArray);
      } else {
        setAssignedPrizes([]);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading prize assignments...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-bold text-2xl text-gray-800 mb-2">🏆 Prize Assignments</h2>
        <p className="text-gray-600 text-sm">
          View all prizes won by participants who completed 8 unique QR code scans
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-4">
          <p className="text-sm font-semibold text-green-700 mb-1">Total Winners</p>
          <p className="text-3xl font-bold text-green-800">{assignedPrizes.length}</p>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-4">
          <p className="text-sm font-semibold text-blue-700 mb-1">Latest Winner</p>
          <p className="text-lg font-bold text-blue-800">
            {assignedPrizes.length > 0 ? assignedPrizes[0].username : "None yet"}
          </p>
        </div>
        
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg p-4">
          <p className="text-sm font-semibold text-purple-700 mb-1">Last Prize Won</p>
          <p className="text-lg font-bold text-purple-800">
            {assignedPrizes.length > 0 
              ? new Date(assignedPrizes[0].wonAt).toLocaleDateString() 
              : "N/A"}
          </p>
        </div>
      </div>

      {/* Prize Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          {assignedPrizes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎁</div>
              <p className="text-gray-500 text-lg font-semibold">No prizes assigned yet</p>
              <p className="text-gray-400 text-sm mt-2">
                Winners will appear here once they complete 8 unique scans
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-800 to-gray-900 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">#</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Username</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">User ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Prize Code</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Won At</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Scanned Codes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {assignedPrizes.map((prize, index) => (
                  <tr 
                    key={prize.userId}
                    className={`hover:bg-gray-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 text-sm text-gray-600 font-semibold">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">
                          {prize.username}
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                          🏆 WINNER
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                      {prize.userId}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1.5 bg-yellow-100 border-2 border-yellow-400 text-yellow-900 text-sm font-bold rounded font-mono">
                        {prize.prizeCode}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>
                        <div className="font-semibold">
                          {new Date(prize.wonAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(prize.wonAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {prize.scannedCodes && prize.scannedCodes.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {prize.scannedCodes.map((code, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-mono"
                              title={code}
                            >
                              {code}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>ℹ️ Info:</strong> This page displays prizes automatically assigned by the system when users complete 8 unique QR code scans. 
          All prize assignments are recorded in the <code className="px-1 py-0.5 bg-blue-100 rounded font-mono text-xs">PrizeWon</code> table.
        </p>
      </div>
    </div>
  );
};

export default PrizeAssignments;
