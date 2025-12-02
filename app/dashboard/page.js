"use client";

import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, onValue, remove, set, push } from "firebase/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateLeaderboardCollection } from "../../lib/utils/leaderboard.js";

// Icon components as SVG
const TrophyIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 5h-2V3H7v2H5a2 2 0 0 0-2 2v1a6 6 0 0 0 5 5.91V15H6v2h12v-2h-2v-2.09A6 6 0 0 0 21 8V7a2 2 0 0 0-2-2zM9 12A3 3 0 1 0 6 9a3 3 0 0 0 3 3zm6 0A3 3 0 1 0 12 9a3 3 0 0 0 3 3z" />
  </svg>
);

const AwardIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const UserIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);

const ClockIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z" />
  </svg>
);

const ChartLineIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M3.5,18.49L6,15.96L9.5,20.5L11,18.49L13.5,16L17.5,20.5L21,3.5L23,6.5L19.5,9L16,5.5L13.5,8.5L11,6.5L8.5,9.5L6,6.5L3.5,10L2,8.5L3.5,18.49Z" />
  </svg>
);

const TrashIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19,4H15.5L14.79,3.29C14.61,3.11 14.35,3 14.09,3H9.91C9.65,3 9.39,3.11 9.21,3.29L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
  </svg>
);

const RefreshIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12,6V9L16,5L12,1V4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12H18A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6Z" />
  </svg>
);

const PlayerAnalytics = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [scanData, setScanData] = useState([]);
  const [qrData, setQrData] = useState([]);
  const [formData, setFormData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    points_earned: "",
    scanned_at: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hour in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerInterval, setTimerInterval] = useState(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, []);

  // Fetch scan data and QR data
  useEffect(() => {
    fetchScanData();
    fetchQRData();
  }, []);

  const fetchScanData = () => {
    const scanDataRef = ref(db, "scannedQRCodes");
    onValue(scanDataRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const scanArray = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setScanData(scanArray);
      } else {
        setScanData([]);
      }
    });
  };

  const fetchQRData = () => {
    const qrDataRef = ref(db, "QR-Data");
    onValue(qrDataRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const qrDataArray = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setQrData(qrDataArray);
      } else {
        setQrData([]);
      }
    });
  };

  // QR name matching and extraction functions
  const extractBaseName = (qrName) => {
    // Remove comma and trailing numbers (e.g., "Indrayani Devi,4" -> "Indrayani Devi")
    let baseName = qrName.replace(/,\d+$/, "");

    // Convert to lowercase and replace spaces with underscores for matching
    baseName = baseName.toLowerCase().replace(/\s+/g, "_");

    return baseName;
  };

  const findMatchingQR = (qrName, qrDataArray) => {
    const baseName = extractBaseName(qrName);

    return qrDataArray.find((qr) => {
      const qrDataName = qr.name.toLowerCase().replace(/\s+/g, "_");
      return qrDataName === baseName || qr.name === qrName;
    });
  };

  // Calculate points for a user by cross-referencing with QR-Data (only unique QR codes)
  const calculateUserPoints = (userId, scanData, qrData) => {
    const userScans = scanData.filter((scan) => scan.userId === userId);

    // Get unique QR codes only (no duplicates)
    const uniqueQRNames = [...new Set(userScans.map((scan) => scan.qrName))];
    let totalPoints = 0;

    uniqueQRNames.forEach((qrName) => {
      const matchingQR = findMatchingQR(qrName, qrData);
      if (matchingQR) {
        totalPoints += parseInt(matchingQR.points || 0);
      }
    });

    return totalPoints;
  };

  // Calculate time span for a user (first to last scan)
  const calculateTimeSpan = (userId, scanData) => {
    const userScans = scanData.filter((scan) => scan.userId === userId);

    if (userScans.length < 2) {
      return 0; // Less than 2 scans, no time span
    }

    const scanTimes = userScans
      .map((scan) => {
        try {
          // Parse date and time from "MM/DD/YYYY" and "HH:MM AM/PM" format
          const dateTime = new Date(scan.date + " " + scan.time);
          return dateTime.getTime();
        } catch (error) {
          console.error("Error parsing scan time:", scan.date, scan.time);
          return 0;
        }
      })
      .filter((time) => time > 0);

    if (scanTimes.length < 2) {
      return 0;
    }

    const firstScan = Math.min(...scanTimes);
    const lastScan = Math.max(...scanTimes);

    return lastScan - firstScan; // Return difference in milliseconds
  };

  // Format time span for display
  const formatTimeSpan = (timeSpanMs) => {
    if (timeSpanMs === 0) return "-";

    const hours = Math.floor(timeSpanMs / (1000 * 60 * 60));
    const minutes = Math.floor((timeSpanMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Countdown timer functions
  const startTimer = () => {
    if (!isTimerRunning && timeLeft > 0) {
      const interval = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(interval);
            setIsTimerRunning(false);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
      setTimerInterval(interval);
      setIsTimerRunning(true);
    }
  };

  const pauseTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setIsTimerRunning(false);
  };

  const resetTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setTimeLeft(3600); // Reset to 1 hour
    setIsTimerRunning(false);
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Fetch players from Firebase and combine with scan and QR data
  useEffect(() => {
    fetchPlayers();
    // Set up real-time listener for live updates
    const usersRef = ref(db, "Users");
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const usersArray = Object.keys(data).map((key) => {
          // Calculate points by cross-referencing with QR-Data (unique QR codes only)
          const calculatedPoints = calculateUserPoints(key, scanData, qrData);

          // Calculate number of unique scans (no duplicates)
          const userScans = scanData.filter((scan) => scan.userId === key);
          const uniqueScanCount = new Set(userScans.map((scan) => scan.qrName))
            .size;

          // Calculate time span between first and last scan
          const timeSpan = calculateTimeSpan(key, scanData);

          return {
            id: key,
            ...data[key],
            player_id: key, // Use Firebase auto-generated ID as per requirements
            player_name:
              data[key].firstName && data[key].lastName
                ? `${data[key].firstName} ${data[key].lastName}`
                : data[key].firstName || "Unknown User",
            total_points: calculatedPoints, // Use calculated points from cross-referenced data
            scan_count: uniqueScanCount, // Number of unique QR scans (no duplicates)
            time_span: timeSpan, // Time span in milliseconds
            formatted_time_span: formatTimeSpan(timeSpan), // Formatted for display
          };
        });

        // 2-tier ranking system: (1) total_points descending, (2) time_span ascending if points equal
        const sortedByPoints = usersArray.sort((a, b) => {
          // Primary: Sort by total_points (higher points = better rank)
          const pointsDiff = (b.total_points || 0) - (a.total_points || 0);
          if (pointsDiff !== 0) return pointsDiff;

          // Secondary: If points equal, sort by time_span (faster completion = better rank)
          const timeSpanDiff = (a.time_span || 0) - (b.time_span || 0);
          return timeSpanDiff;
        });
        const playersWithRank = sortedByPoints.map((player, index) => ({
          ...player,
          rank: index + 1,
        }));

        setPlayers(playersWithRank);
        setLastUpdated(new Date());

        // Update Firebase leaderboard
        updateLeaderboardCollection(playersWithRank);
      } else {
        setPlayers([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [scanData, qrData]); // Add scanData and qrData as dependencies

  const fetchPlayers = () => {
    setLoading(true);
    const usersRef = ref(db, "Users");
    onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const usersArray = Object.keys(data).map((key) => {
          // Calculate points by cross-referencing with QR-Data (unique QR codes only)
          const calculatedPoints = calculateUserPoints(key, scanData, qrData);

          // Calculate number of unique scans (no duplicates)
          const userScans = scanData.filter((scan) => scan.userId === key);
          const uniqueScanCount = new Set(userScans.map((scan) => scan.qrName))
            .size;

          // Calculate time span between first and last scan
          const timeSpan = calculateTimeSpan(key, scanData);

          return {
            id: key,
            ...data[key],
            player_id: key, // Use Firebase auto-generated ID as per requirements
            player_name:
              data[key].firstName && data[key].lastName
                ? `${data[key].firstName} ${data[key].lastName}`
                : data[key].firstName || "Unknown User",
            total_points: calculatedPoints, // Use calculated points from cross-referenced data
            scan_count: uniqueScanCount, // Number of unique QR scans (no duplicates)
            time_span: timeSpan, // Time span in milliseconds
            formatted_time_span: formatTimeSpan(timeSpan), // Formatted for display
          };
        });

        // 2-tier ranking system: (1) total_points descending, (2) time_span ascending if points equal
        const sortedByPoints = usersArray.sort((a, b) => {
          // Primary: Sort by total_points (higher points = better rank)
          const pointsDiff = (b.total_points || 0) - (a.total_points || 0);
          if (pointsDiff !== 0) return pointsDiff;

          // Secondary: If points equal, sort by time_span (faster completion = better rank)
          const timeSpanDiff = (a.time_span || 0) - (b.time_span || 0);
          return timeSpanDiff;
        });
        const playersWithRank = sortedByPoints.map((player, index) => ({
          ...player,
          rank: index + 1,
        }));

        setPlayers(playersWithRank);
        setLastUpdated(new Date());
      } else {
        setPlayers([]);
      }
      setLoading(false);
    });
  };

  const handleManualRefresh = () => {
    fetchPlayers();
    // Force immediate data reload by updating lastUpdated
    setLastUpdated(new Date());
  };

  const handleDeletePlayer = async (playerId) => {
    if (!window.confirm("Are you sure you want to delete this player?")) {
      return;
    }

    try {
      const userRef = ref(db, `Users/${playerId}`);
      await remove(userRef);
      alert("User deleted successfully!");
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Error deleting user");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validation
    if (
      !formData.username ||
      !formData.firstName ||
      !formData.lastName ||
      formData.points_earned === ""
    ) {
      alert("Please fill in all required fields");
      setIsSubmitting(false);
      return;
    }

    try {
      const newUserRef = push(ref(db, "Users"));
      const userData = {
        username: formData.username,
        firstName: formData.firstName,
        lastName: formData.lastName,
        points_earned: parseInt(formData.points_earned) || 0,
        scanned_at: formData.scanned_at
          ? parseInt(formData.scanned_at)
          : Date.now(),
        createdAt: Date.now(),
        email: formData.email || "", // Optional field
      };

      await set(newUserRef, userData);

      // Reset form and close modal
      setFormData({
        username: "",
        firstName: "",
        lastName: "",
        points_earned: "",
        scanned_at: "",
      });
      setShowAddModal(false);
      alert("User added successfully!");
    } catch (error) {
      console.error("Error adding user:", error);
      alert("Error adding user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddModal = () => {
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    // Reset form when closing
    setFormData({
      username: "",
      firstName: "",
      lastName: "",
      points_earned: "",
      scanned_at: "",
    });
  };

  const stats = {
    totalPlayers: players.length,
    totalPoints:
      qrData.length > 0
        ? qrData.reduce((sum, qr) => sum + parseInt(qr.points || 0), 0)
        : 0,
    topScore:
      players.length > 0 ? Math.max(...players.map((p) => p.total_points)) : 0,
  };

  const getRankColor = (rank) => {
    if (rank === 1) return "text-yellow-500";
    if (rank === 2) return "text-gray-400";
    if (rank === 3) return "text-amber-600";
    return "text-gray-600";
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Player Analytics Dashboard
            </h1>
            {/* <p className="text-gray-600 text-base">
							Track performance and rankings
						</p>*/}
            {lastUpdated && (
              <div className="flex items-center gap-4 mt-2">
                <p className="text-sm text-gray-500">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-4 sm:mt-0">
            <div className="flex items-center gap-2">
              <Button
                onClick={handleManualRefresh}
                className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 text-sm sm:text-base"
              >
                <RefreshIcon className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Stats Cards - Now using grid-cols-2 on mobile (sm:grid-cols-2) and 4 on larger screens */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Active Players
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
                  {stats.totalPlayers}
                </p>
              </div>
              <div className="text-teal-500">
                <UserIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Top Score
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
                  {stats.topScore.toLocaleString()}
                </p>
              </div>
              <div className="text-green-600">
                <TrophyIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Total Points
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
                  {stats.totalPoints.toLocaleString()}
                </p>
              </div>
              <div className="text-purple-600">
                <ChartLineIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
          </div>
          {/* Add a placeholder or fourth stat card here if needed, or adjust grid to grid-cols-3 on mobile */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Total QR Codes
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
                  {qrData.length}
                </p>
              </div>
              <div className="text-blue-500">
                <AwardIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Players Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 py-4 sm:px-6 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Leaderboard
              </h2>
              <p className="text-gray-600 text-sm sm:text-base mt-1">
                Current player rankings based on performance
              </p>
            </div>
            <Button onClick={openAddModal} className="text-sm sm:text-base">
              + Add User
            </Button>
          </div>
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">
                  Loading player data...
                </span>
              </div>
            ) : players.length === 0 ? (
              <div className="text-center py-12">
                <TrophyIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600 text-lg mb-2">
                  No player data found
                </p>
                <p className="text-gray-500">
                  Player data will appear here once available in Firebase
                </p>
              </div>
            ) : (
              // Enhanced responsiveness for the table using hidden/visible columns on smaller screens
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-3 text-sm font-medium text-gray-600">
                        Rank
                      </th>
                      <th className="text-left p-3 text-sm font-medium text-gray-600 sm:table-cell hidden">
                        Player ID
                      </th>
                      <th className="text-left p-3 text-sm font-medium text-gray-600">
                        Player Name
                      </th>
                      <th className="text-left p-3 text-sm font-medium text-gray-600">
                        Points Earned
                      </th>
                      <th className="text-left p-3 text-sm font-medium text-gray-600 sm:table-cell hidden">
                        No of Scans
                      </th>
                      <th className="text-left p-3 text-sm font-medium text-gray-600 lg:table-cell hidden">
                        Time Taken
                      </th>
                      <th className="text-left p-3 text-sm font-medium text-gray-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {players.map((player) => {
                      return (
                        <tr
                          key={player.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="p-3 whitespace-nowrap">
                            <span
                              className={`text-lg font-semibold ${getRankColor(
                                player.rank
                              )}`}
                            >
                              {getRankBadge(player.rank)}
                            </span>
                          </td>
                          <td className="p-3 sm:table-cell hidden whitespace-nowrap">
                            <span className="text-xs font-mono text-gray-600">
                              {player.player_id.substring(0, 8)}...
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="font-medium text-gray-900 text-sm">
                              {player.player_name}
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="text-green-600 font-bold text-sm">
                              {player.total_points.toLocaleString()}
                            </div>
                          </td>
                          <td className="p-3 sm:table-cell hidden whitespace-nowrap">
                            <div className="text-blue-600 font-semibold text-sm">
                              {player.scan_count || 0}
                            </div>
                          </td>
                          <td className="p-3 lg:table-cell hidden whitespace-nowrap">
                            <div className="text-purple-700 font-medium text-sm">
                              {player.formatted_time_span || "-"}
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePlayer(player.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 h-auto"
                              title="Delete player"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Player Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-full sm:max-w-md w-full max-h-[95vh] overflow-y-auto transform transition-all shadow-xl">
            <div className="p-6 sm:p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Add New User
                </h2>
                <Button
                  onClick={closeAddModal}
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700 p-2 h-auto"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </Button>
              </div>

              <form onSubmit={handleAddPlayer} className="space-y-4">
                <div>
                  <Label
                    htmlFor="username"
                    className="text-sm font-medium text-gray-700"
                  >
                    Username *
                  </Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Enter username"
                    className="mt-1"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="firstName"
                      className="text-sm font-medium text-gray-700"
                    >
                      First Name *
                    </Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="First name"
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="lastName"
                      className="text-sm font-medium text-gray-700"
                    >
                      Last Name *
                    </Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Last name"
                      className="mt-1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="points_earned"
                    className="text-sm font-medium text-gray-700"
                  >
                    Points Earned *
                  </Label>
                  <Input
                    id="points_earned"
                    name="points_earned"
                    type="number"
                    value={formData.points_earned}
                    onChange={handleInputChange}
                    placeholder="Enter points earned"
                    className="mt-1"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <Label
                    htmlFor="scanned_at"
                    className="text-sm font-medium text-gray-700"
                  >
                    Last Scan Time (timestamp)
                  </Label>
                  <Input
                    id="scanned_at"
                    name="scanned_at"
                    type="number"
                    value={formData.scanned_at}
                    onChange={handleInputChange}
                    placeholder="Enter timestamp or leave empty for current time"
                    className="mt-1"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to use current timestamp
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={closeAddModal}
                    variant="outline"
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Adding..." : "Add User"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerAnalytics;