"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { db } from "@/app/firebase"
import { ref, onValue, off } from "firebase/database"

const RefreshIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)

const QRIcon = () => (
  <svg className="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
    <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zm8-2h8v8h-8V3zm2 6h4V5h-4v4zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm13-9h1v2h-1v-2zm-4 0h2v1h-2v-1zm2 4h-1v-1h1v1zm2-2h-1v-2h1v2z" />
  </svg>
)

const CoinsIcon = () => (
  <svg className="h-6 w-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-13c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z" />
  </svg>
)

const ChartIcon = () => (
  <svg className="h-6 w-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
    <path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z" />
  </svg>
)

const UsersIcon = () => (
  <svg className="h-6 w-6 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
  </svg>
)

export default function AnalyticsLogPage() {
  const [logs, setLogs] = useState([])
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [isMounted, setIsMounted] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setIsMounted(true)

    let scannedQRCodesData = null
    let qrDataMap = {}
    let qrNameMap = {}
    let isScannedQRCodesReady = false
    let isQrDataReady = false

    const processLogs = () => {
      if (!isScannedQRCodesReady || !isQrDataReady) return

      if (scannedQRCodesData) {
        const arr = Array.isArray(scannedQRCodesData)
          ? scannedQRCodesData.filter(Boolean)
          : Object.keys(scannedQRCodesData).map((key) => ({ id: key, ...scannedQRCodesData[key] }))

        const normalized = arr.map((item) => {
          let scanned_at = ""
          if (item.date && item.time) {
            const dateStr = item.date
            const timeStr = item.time
            scanned_at = dateStr.includes("T") || dateStr.includes(" ")
              ? dateStr
              : `${dateStr} ${timeStr}`
          } else {
            scanned_at = item.date || item.time || ""
          }

          let rawQrname = (item.qrname || item.qrName || item.qr_name || item.name || "").toString().trim()
          if (rawQrname.includes(",")) rawQrname = rawQrname.split(",")[0].trim()

          const qrname = rawQrname.replace(/_/g, " ").trim()
          const qrnameLower = qrname.toLowerCase().trim()
          const qrnameUnderscore = qrnameLower.replace(/\s+/g, "_")

          let qr_id = ""
          if (qrname) {
            qr_id = qrDataMap[qrname] || qrDataMap[rawQrname] || ""
            if (!qr_id) qr_id = qrDataMap[qrnameLower] || ""
            if (!qr_id) qr_id = qrDataMap[qrnameUnderscore] || ""
            if (!qr_id) {
              for (const [key, value] of Object.entries(qrDataMap)) {
                const keyLower = key.toLowerCase().trim()
                const keyNormalized = keyLower.replace(/\s+/g, "_")
                if (keyLower === qrnameLower || keyNormalized === qrnameUnderscore) {
                  qr_id = value
                  break
                }
              }
            }
            if (!qr_id && qrnameLower.length > 3) {
              for (const [key, value] of Object.entries(qrDataMap)) {
                const keyLower = key.toLowerCase().trim()
                if (keyLower.includes(qrnameLower) || qrnameLower.includes(keyLower)) {
                  qr_id = value
                  break
                }
              }
            }
          }

          const player_id = (item.user_id || item.userId || item.userID || item.uid || "").toString()
          
          const player_name = (item.username || item.userName || item.user_name || "").toString().trim() || ""

          const qr_name = qr_id ? (qrNameMap[qr_id] || qrname || "") : (qrname || "")

          return {
            id: item.id || undefined,
            player_id: player_id,
            player_name: player_name,
            qr_id: qr_id,
            qr_name: qr_name,
            scanned_at: scanned_at,
            points_earned: Number(item.points ?? 0),
          }
        })

        const sorted = normalized.sort((a, b) => {
          const ta = a.scanned_at ? new Date(a.scanned_at).getTime() : 0
          const tb = b.scanned_at ? new Date(b.scanned_at).getTime() : 0
          return tb - ta
        })

        setLogs(sorted)
      } else {
        setLogs([])
      }

      setLastUpdated(new Date())
      setLoading(false)
    }

    const scannedQRCodesRef = ref(db, "scannedQRCodes")
    const handleScannedQRCodes = (snapshot) => {
      scannedQRCodesData = snapshot.val()
      isScannedQRCodesReady = true
      processLogs()
    }
    onValue(scannedQRCodesRef, handleScannedQRCodes)

    const qrDataRef = ref(db, "QR-Data")
    const handleQrData = (snapshot) => {
      const qrData = snapshot.val()
      if (qrData) {
        const arr = Object.keys(qrData).map((key) => ({
          id: key,
          name: (qrData[key].name || "").toString().trim(),
        }))

        qrDataMap = {}
        qrNameMap = {}

        arr.forEach((qr) => {
          if (qr.name) {
            const trimmed = qr.name.trim()
            const lower = trimmed.toLowerCase()

            qrDataMap[trimmed] = qr.id
            qrDataMap[lower] = qr.id
            qrNameMap[qr.id] = trimmed
          }
        })
      }
      isQrDataReady = true
      processLogs()
    }
    onValue(qrDataRef, handleQrData)

    return () => {
      off(scannedQRCodesRef, "value", handleScannedQRCodes)
      off(qrDataRef, "value", handleQrData)
    }
  }, [])

  const handleRefresh = () => {
    setLastUpdated(new Date())
  }

  const stats = {
    totalScans: logs.length,
      // totalPointsAwarded: logs.reduce((s, l) => s + l.points_earned, 0),
/*     avgPointsPerScan:
      logs.length > 0 ? Math.round(logs.reduce((s, l) => s + l.points_earned, 0) / logs.length) : 0, */
    validScans: new Set(logs.filter((log) => log.qr_id && log.player_id).map((log) => `${log.player_id}-${log.qr_id}`)).size,
    totalPlayers: new Set(logs.map((log) => log.player_id).filter(Boolean)).size,
  }

  // average scans per player (each player's valid scans / total players)
  let playerValidScansMap = {}
  logs.forEach((log) => {
    if (log.player_id && log.qr_id) {
      if (!playerValidScansMap[log.player_id]) {
        playerValidScansMap[log.player_id] = new Set()
      }
      playerValidScansMap[log.player_id].add(log.qr_id)
    }
  })
  const totalValidScansAcrossAllPlayers = Object.values(playerValidScansMap).reduce((sum, set) => sum + set.size, 0)
  stats.avgScansPerPlayer = stats.totalPlayers > 0 ? Math.round(totalValidScansAcrossAllPlayers / stats.totalPlayers) : 0

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Log</h1>
                <p className="text-gray-600 text-base">Track all QR scans and player activities</p>
                <p className="text-sm text-gray-500 mt-2">
                  Last updated: {isMounted ? lastUpdated.toLocaleTimeString() : "—"}
                </p>
              </div>

              <Button onClick={handleRefresh} className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2">
                <RefreshIcon />
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Scans</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalScans}</p>
              </div>
              <QRIcon />
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valid Scans</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.validScans}</p>
              </div>
              <CoinsIcon />
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Scan Per Player</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.avgScansPerPlayer}</p>
              </div>
              <ChartIcon />
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Players</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalPlayers}</p>
              </div>
              <UsersIcon />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Scan History</h2>
              <p className="text-gray-600 mt-1">Complete record of all QR code scans</p>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  <p className="mt-4 text-gray-600">Loading data...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-gray-600">No records found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-3 text-sm font-medium text-gray-600">Log ID</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-600">User Name</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-600">QR Name</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-600">Scanned At</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-600">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log, i) => {
                        const scanDate = log.scanned_at ? new Date(log.scanned_at) : null
                        return (
                          <tr key={log.id || i} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-3">
                              <span className="text-sm font-mono text-blue-600">{log.id || "—"}</span>
                            </td>

                            <td className="p-3">
                              <span className="text-sm font-medium text-gray-900">
                                {log.player_name || <span className="text-gray-400 italic">N/A</span>}
                              </span>
                            </td>

                            <td className="p-3">
                              <span className="text-sm text-gray-700">
                                {log.qr_name || <span className="text-gray-400 italic">N/A</span>}
                              </span>
                            </td>

                            <td className="p-3">
                              <span className="text-sm text-gray-700">
                                {isMounted && scanDate ? scanDate.toLocaleString() : "—"}
                              </span>
                            </td>

                               <td className="p-3">
                              <span className="inline-flex items-center px-2 py-0.5 text-sm font-medium bg-green-100 text-green-800 rounded-full">
                                +{log.points_earned}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
