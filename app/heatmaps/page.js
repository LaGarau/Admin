"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  FaMapMarkerAlt,
  FaQrcode,
  FaMapPin,
  FaTimes,
  FaUsers,
  FaUserAlt,
  FaExpand,
  FaCompress,
} from "react-icons/fa";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";

// --- CONFIGURATION ---
const COLOR_DEFAULT = "#2563EB"; // Blue (Background QRs)
const COLOR_ACTIVE = "#FF0000"; // Red (Selected)
const COLOR_PLAYER = "#FFA500"; // Orange (Player)

// --- PROXIMITY CIRCLE CONFIGURATION ---
const PROXIMITY_RADIUS_M = 15;
const CIRCLE_OPACITY = 0.9;
const COLOR_PROXIMITY_GREEN = "#10B981";
const COLOR_PROXIMITY_YELLOW = "#FBBF24";
const COLOR_PROXIMITY_RED = "#EF4444";

// --- GEOLOCATION UTILITY FUNCTION ---
const EARTH_RADIUS_M = 6371000;
function getDistance(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = EARTH_RADIUS_M;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// --- QR LIST POPUP COMPONENT ---
const QRListPopup = ({ qrList, onSelect, onClose }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 400, y: 300 });

  const handleMouseDown = (e) => {
    if (!e.target.closest(".drag-handle")) return;
    e.preventDefault();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  return (
    <div
      className="fixed z-[2005] bg-white border-2 border-blue-500 rounded-lg shadow-2xl p-4 max-w-xs w-full select-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, -50%)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative">
        <div
          className="drag-handle absolute -top-2 -left-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm cursor-move z-10"
          onMouseDown={handleMouseDown}
        >
          ⋮⋮
        </div>
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 z-10"
        >
          <FaTimes />
        </button>

        <h3 className="text-lg font-bold text-blue-700 mt-4 mb-3 border-b pb-2 flex items-center">
          <FaQrcode className="mr-2" /> Select QR Location ({qrList.length})
        </h3>

        <div className="max-h-60 overflow-y-auto">
          {qrList.length === 0 ? (
            <p className="text-gray-500 text-sm">No QR codes found.</p>
          ) : (
            <ul className="space-y-2">
              {qrList.map((qr) => (
                <li
                  key={qr.id}
                  onClick={() => onSelect(qr)}
                  className="p-2 bg-gray-50 hover:bg-blue-100 rounded cursor-pointer transition-colors duration-150 text-gray-800 text-sm group border border-transparent hover:border-blue-200"
                >
                  <div className="font-semibold flex justify-between items-center">
                    {qr.name || "Unnamed QR"}
                    <FaMapPin className="text-blue-400 group-hover:text-blue-600" />
                  </div>
                  <div className="text-xs text-gray-500 truncate mt-1">
                    {qr.description || "No description"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-600 text-center">
          💡 Drag to move • Click to locate • Close with ×
        </div>
      </div>
    </div>
  );
};

// --- PLAYER LIST POPUP COMPONENT ---
const PlayerListPopup = ({ players, onSelect, onClose }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 600, y: 300 });

  const handleMouseDown = (e) => {
    if (!e.target.closest(".drag-handle")) return;
    e.preventDefault();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  return (
    <div
      className="fixed z-[2005] bg-white border-2 border-green-500 rounded-lg shadow-2xl p-4 max-w-xs w-full select-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, -50%)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative">
        <div
          className="drag-handle absolute -top-2 -left-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm cursor-move z-10"
          onMouseDown={handleMouseDown}
        >
          ⋮⋮
        </div>
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 z-10"
        >
          <FaTimes />
        </button>
        <h3 className="text-lg font-bold text-green-700 mt-4 mb-3 border-b pb-2 flex items-center">
          <FaUserAlt className="mr-2" /> Select Player ({players.length})
        </h3>
        <div className="max-h-60 overflow-y-auto">
          {players.length === 0 ? (
            <p className="text-gray-500 text-sm">No live players found.</p>
          ) : (
            <ul className="space-y-2">
              {players.map((player) => (
                <li
                  key={player.id}
                  onClick={() => onSelect(player)}
                  className="p-2 bg-gray-50 hover:bg-green-100 rounded cursor-pointer transition-colors duration-150 text-gray-800 text-sm font-medium flex justify-between items-center"
                >
                  {player.name}
                  <FaMapPin className="text-green-500" />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-3 p-2 bg-green-50 rounded text-xs text-green-600 text-center">
          💡 Drag to move • Click to locate • Close with ×
        </div>
      </div>
    </div>
  );
};

const HeatmapsPage = () => {
  const mapRef = useRef(null);
  const galliMapInstance = useRef(null);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);

  const [qrDataList, setQrDataList] = useState([]);
  const [qrDataLoading, setQrDataLoading] = useState(true);
  const [qrDataError, setQrDataError] = useState(null);

  const [playerLocationList, setPlayerLocationList] = useState([]);
  const [playerDataLoading, setPlayerDataLoading] = useState(true);
  const [playerDataError, setPlayerDataError] = useState(null);

  // === STATE FOR TOGGLE FUNCTIONALITY ===
  const [playerMarkersVisible, setPlayerMarkersVisible] = useState(true);
  const [playerMarkerReferences, setPlayerMarkerReferences] = useState({});
  const [circleReferences, setCircleReferences] = useState({});
  const activeRedMarkerRef = useRef(null);

  // === POPUP STATES ===
  const [showQRPopup, setShowQRPopup] = useState(false);
  const [showPlayerListPopup, setShowPlayerListPopup] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // --- POPUP HANDLERS ---

  // QR LIST HANDLERS
  const toggleQRList = (e) => {
    if (e) e.stopPropagation();
    setShowQRPopup(!showQRPopup);
  };

  const hideQRList = () => {
    setShowQRPopup(false);
  };

  const handleQRSelect = (qr) => {
    const lat = parseFloat(qr.latitude);
    const lng = parseFloat(qr.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      safeNavigateToPoint(lat, lng, qr.name, qr.description);
    }
  };

  // PLAYER LIST HANDLERS
  const showPlayerList = (e) => {
    if (e) e.stopPropagation();
    setShowPlayerListPopup(true);
  };

  const hidePlayerList = () => {
    setShowPlayerListPopup(false);
  };

  const handlePlayerSelect = (player) => {
    const lat = player.latitude;
    const lng = player.longitude;
    safeNavigateToPoint(
      lat,
      lng,
      `Selected Player: ${player.name}`,
      `Player ID: ${player.id} | Last Update: ${new Date(
        player.lastUpdate,
      ).toLocaleString()}`,
    );
  };

  // --- FULLSCREEN HANDLER ---
  const toggleFullScreen = () => {
    setIsFullScreen((prev) => !prev);
  };

  // EFFECT: FIX MAP SIZING ON FULLSCREEN TOGGLE
  // Triggers specifically when isFullScreen changes to ensure the map refits to the new container size.
  useEffect(() => {
    if (!galliMapInstance.current || !galliMapInstance.current.map) return;

    // Small timeout to allow the DOM to finish transitioning styles before resizing the canvas
    const timer = setTimeout(() => {
      try {
        galliMapInstance.current.map.resize();
      } catch (e) {
        console.warn("Map resize failed:", e);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [isFullScreen]);

  // --- HELPER: Safe Navigation ---
  const safeNavigateToPoint = (lat, lng, title, description) => {
    if (!galliMapInstance.current) return;

    try {
      try {
        if (
          galliMapInstance.current.removePinMarker &&
          activeRedMarkerRef.current
        ) {
          galliMapInstance.current.removePinMarker(activeRedMarkerRef.current);
          activeRedMarkerRef.current = null;
        }
      } catch (removeError) {
        // Suppress warning
      }

      setTimeout(async () => {
        const pinMarkerData = {
          latLng: [lat, lng],
          title: title || "Location",
          description: description || "Selected Location",
          color: COLOR_ACTIVE,
          tooltip: title || "Location",
          hoverText: title || "Location",
        };

        try {
          const newMarker =
            await galliMapInstance.current.displayPinMarker(pinMarkerData);
          activeRedMarkerRef.current = newMarker;
        } catch (displayError) {
          console.error("Error displaying active pin:", displayError);
        }

        if (
          galliMapInstance.current.map &&
          typeof galliMapInstance.current.map.flyTo === "function"
        ) {
          galliMapInstance.current.map.flyTo({
            center: [lng, lat],
            zoom: 18,
            essential: true,
          });
        }
      }, 150);
    } catch (error) {
      console.error(`❌ Error navigating to coordinates:`, error);
    }
  };

  const togglePlayerMarkers = () => {
    setPlayerMarkersVisible((prev) => !prev);
  };

  // --- MAP INITIALIZATION ---
  useEffect(() => {
    const loadGalliMapsScript = () => {
      return new Promise((resolve, reject) => {
        if (typeof window !== "undefined" && window.GalliMapPlugin) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src =
          "https://gallimap.com/static/dist/js/gallimaps.vector.min.latest.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () =>
          reject(new Error("Failed to load GalliMaps script"));
        document.head.appendChild(script);
      });
    };

    const initializeMap = async () => {
      try {
        await loadGalliMapsScript();
        if (typeof window.GalliMapPlugin !== "function") {
          throw new Error("GalliMapPlugin is not available");
        }

        const accessToken = process.env.NEXT_PUBLIC_GALLIMAPS_ACCESS_TOKEN;
        if (!accessToken) {
          console.error("Missing GalliMaps Access Token");
        }

        const galliMapsObject = {
          accessToken: accessToken,
          map: {
            container: "galli-map",
            center: [27.7172, 85.324],
            zoom: 13,
            clickable: true,
          },
          pano: { container: "map-pano" }, // Required
        };

        galliMapInstance.current = new GalliMapPlugin(galliMapsObject);

        if (galliMapInstance.current) {
          setMapLoaded(true);
          setMapError(null);
        }
      } catch (error) {
        console.error("Error initializing Galli Maps:", error);
        setMapError(`Error loading Galli Maps: ${error.message}`);
      }
    };

    initializeMap();

    return () => {
      if (galliMapInstance.current) {
        galliMapInstance.current = null;
      }
    };
  }, []);

  // --- FIREBASE LISTENERS ---
  useEffect(() => {
    const qrDataRef = ref(db, "QR-Data");
    const unsubscribe = onValue(
      qrDataRef,
      (snapshot) => {
        try {
          const data = snapshot.val();
          if (data) {
            const qrArray = Object.keys(data)
              .map((key) => ({ id: key, ...data[key] }))
              .filter((qr) => {
                const hasValidLat =
                  qr.latitude && !isNaN(parseFloat(qr.latitude));
                const hasValidLng =
                  qr.longitude && !isNaN(parseFloat(qr.longitude));
                return hasValidLat && hasValidLng && qr.status === "Active";
              })
              .map((qr) => ({
                ...qr,
                latitude: parseFloat(qr.latitude),
                longitude: parseFloat(qr.longitude),
              }));
            setQrDataList(qrArray);
          } else {
            setQrDataList([]);
          }
        } catch (error) {
          setQrDataError("Error processing QR data");
        } finally {
          setQrDataLoading(false);
        }
      },
      () => {
        setQrDataError("Failed to fetch QR data");
        setQrDataLoading(false);
      },
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const usersRef = ref(db, "Users");
    const unsubscribe = onValue(
      usersRef,
      (snapshot) => {
        try {
          const data = snapshot.val();
          if (data) {
            const playerArray = Object.keys(data)
              .map((key) => ({ id: key, ...data[key] }))
              .filter((user) => {
                const hasValidLat =
                  user.latitude && !isNaN(parseFloat(user.latitude));
                const hasValidLng =
                  user.longitude && !isNaN(parseFloat(user.longitude));
                return hasValidLat && hasValidLng;
              })
              .map((user) => ({
                id: user.id,
                name: user.username || user.firstName || user.id,
                latitude: parseFloat(user.latitude),
                longitude: parseFloat(user.longitude),
                lastUpdate: user.lastLocationUpdate,
              }));
            setPlayerLocationList(playerArray);
            setPlayerDataError(null);
          } else {
            setPlayerLocationList([]);
          }
        } catch (error) {
          setPlayerDataError("Error processing Player Location data");
        } finally {
          setPlayerDataLoading(false);
        }
      },
      () => {
        setPlayerDataError("Failed to fetch Player Location data");
        setPlayerDataLoading(false);
      },
    );
    return () => unsubscribe();
  }, []);

  // --- MARKER LOGIC ---
  const addQrMarkersToMap = async () => {
    if (!galliMapInstance.current || qrDataList.length === 0) return;
    try {
      for (const qr of qrDataList) {
        const lat = parseFloat(qr.latitude);
        const lng = parseFloat(qr.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          try {
            await galliMapInstance.current.displayPinMarker({
              latLng: [lat, lng],
              title: qr.name,
              description: qr.description,
              color: COLOR_DEFAULT,
              tooltip: qr.name,
              featureId: `qr-${qr.id}`,
            });
          } catch (e) {
            console.warn(`Skipped marker for ${qr.name}`);
          }
        }
      }
    } catch (error) {
      console.error("Error adding QR markers:", error);
    }
  };

  const addPlayerMarkersToMap = async () => {
    if (!galliMapInstance.current || playerLocationList.length === 0) return;
    try {
      const newPlayerMarkerReferences = {};
      for (const player of playerLocationList) {
        try {
          const lat = player.latitude;
          const lng = player.longitude;
          const lastUpdateDate = player.lastUpdate
            ? new Date(player.lastUpdate).toLocaleString()
            : "N/A";

          if (galliMapInstance.current.displayPinMarker) {
            const marker = await galliMapInstance.current.displayPinMarker({
              latLng: [lat, lng],
              title: player.name || "Player Location",
              description: `Current Location | Last Update: ${lastUpdateDate}`,
              color: COLOR_PLAYER,
              tooltip: `Live: ${player.name}`,
              hoverText: `Live Location: ${player.name}`,
            });
            if (marker) {
              newPlayerMarkerReferences[player.id] = marker;
            }
          }
        } catch (markerError) {
          console.log(markerError);
        }
      }
      setPlayerMarkerReferences(newPlayerMarkerReferences);
    } catch (error) {
      console.error("Error adding Player markers:", error);
    }
  };

  const clearPlayerMarkers = () => {
    if (!galliMapInstance.current) return;
    Object.values(playerMarkerReferences).forEach((marker) => {
      try {
        galliMapInstance.current.removePinMarker(marker);
      } catch (e) {
        console.warn(`Failed to remove marker:`, e.message);
      }
    });
    setPlayerMarkerReferences({});
  };

  // --- CIRCLE LOGIC ---
  const drawProximityCircle = async (qrId, lat, lng, playerCount) => {
    if (!galliMapInstance.current) return;
    const polygonName = `proximity-${qrId}`;
    let color;
    if (playerCount === 1) color = COLOR_PROXIMITY_GREEN;
    else if (playerCount > 1 && playerCount <= 5)
      color = COLOR_PROXIMITY_YELLOW;
    else if (playerCount > 5) color = COLOR_PROXIMITY_RED;
    else return;

    const polygonOption = {
      name: polygonName,
      color: color,
      opacity: CIRCLE_OPACITY,
      latLng: [lat, lng],
      radius: PROXIMITY_RADIUS_M,
      geoJson: {
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, lat] },
        properties: { playerCount, qrId },
      },
    };

    try {
      await galliMapInstance.current.drawPolygon(polygonOption);
      setCircleReferences((prev) => ({ ...prev, [qrId]: polygonName }));
    } catch (error) {
      console.error(`Error drawing circle for ${qrId}:`, error);
    }
  };

  const clearProximityCircle = (qrId) => {
    if (!galliMapInstance.current) return;
    const polygonName = `proximity-${qrId}`;
    if (circleReferences[qrId]) {
      try {
        galliMapInstance.current.removePolygon(polygonName);
        setCircleReferences((prev) => {
          const newState = { ...prev };
          delete newState[qrId];
          return newState;
        });
      } catch (error) {
        console.warn(`Failed to remove polygon ${polygonName}`);
      }
    }
  };

  const updateProximityCircles = () => {
    if (
      !mapLoaded ||
      qrDataList.length === 0 ||
      playerLocationList.length === 0
    ) {
      Object.keys(circleReferences).forEach(clearProximityCircle);
      return;
    }

    const updatedCircleQRs = new Set();
    qrDataList.forEach((qr) => {
      const qrLat = qr.latitude;
      const qrLng = qr.longitude;
      let playersInProximity = 0;

      playerLocationList.forEach((player) => {
        const distance = getDistance(
          qrLat,
          qrLng,
          player.latitude,
          player.longitude,
        );
        if (distance <= PROXIMITY_RADIUS_M) playersInProximity++;
      });

      if (playersInProximity > 0) {
        drawProximityCircle(qr.id, qrLat, qrLng, playersInProximity);
        updatedCircleQRs.add(qr.id);
      } else {
        clearProximityCircle(qr.id);
      }
    });

    Object.keys(circleReferences).forEach((qrId) => {
      if (!updatedCircleQRs.has(qrId)) clearProximityCircle(qrId);
    });
  };

  useEffect(() => {
    if (mapLoaded && qrDataList.length > 0) addQrMarkersToMap();
  }, [mapLoaded, qrDataList]);

  useEffect(() => {
    if (!mapLoaded || playerDataLoading) return;
    if (playerMarkersVisible && playerLocationList.length > 0) {
      addPlayerMarkersToMap();
    } else {
      clearPlayerMarkers();
    }
  }, [mapLoaded, playerLocationList, playerMarkersVisible]);

  useEffect(() => {
    if (mapLoaded && qrDataList.length > 0) updateProximityCircles();
    return () => {
      if (!galliMapInstance.current) return;
      Object.keys(circleReferences).forEach((qrId) => {
        try {
          galliMapInstance.current.removePolygon(`proximity-${qrId}`);
        } catch (e) {}
      });
      setCircleReferences({});
    };
  }, [mapLoaded, qrDataList, playerLocationList]);

  const handleLocationSelect = async (location) => {
    if (!galliMapInstance.current) return;
    try {
      let lat, lng;
      if (location.lat && location.lng) {
        lat = parseFloat(location.lat);
        lng = parseFloat(location.lng);
      } else if (location.geometry && location.geometry.coordinates) {
        lng = parseFloat(location.geometry.coordinates[0]);
        lat = parseFloat(location.geometry.coordinates[1]);
      }

      if (!isNaN(lat) && !isNaN(lng)) {
        safeNavigateToPoint(
          lat,
          lng,
          location.name || searchText,
          location.address,
        );
      } else {
        await galliMapInstance.current.searchData(location.name || searchText);
      }
      setSearchText("");
      setSearchResults([]);
    } catch (error) {
      console.error("Location selection error:", error);
    }
  };

  const reloadPage = () => {
    window.location.reload();
  };

  return (
    <div className={`min-h-screen bg-gray-100 ${isFullScreen ? "p-0" : "p-6"}`}>
      <div
        className={`max-w-7xl mx-auto ${isFullScreen ? "max-w-full h-full" : ""}`}
      >
        {/* HEADER SECTION (Hidden in Fullscreen) */}
        <div
          className={`bg-white rounded-lg shadow-lg p-6 mb-6 ${isFullScreen ? "hidden" : "block"}`}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <FaMapMarkerAlt className="text-red-500" />
                QR Heatmaps & Interactive Maps
              </h1>
              <p className="text-gray-600 mt-2">
                Interactive map with coordinate-based QR and Live Player
                navigation.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={reloadPage}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Reload Page
              </button>
              <button
                onClick={togglePlayerMarkers}
                disabled={!mapLoaded || playerLocationList.length === 0}
                className={`px-4 py-2 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200
                  ${playerMarkersVisible ? "bg-red-500 hover:bg-red-600" : "bg-orange-600 hover:bg-orange-700"}
                `}
              >
                <FaMapPin className="inline mr-1" />
                {playerMarkersVisible ? "Hide Players" : "Show Players"}
              </button>
            </div>
          </div>

          {/* STATUS INDICATORS */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${mapLoaded ? "bg-green-500" : "bg-red-500"}`}
                ></div>
                <span className="font-medium text-blue-800">Map Status</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                {mapLoaded ? "Map loaded successfully" : "Map not loaded"}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${qrDataList.length > 0 ? "bg-green-500" : "bg-red-500"}`}
                ></div>
                <span className="font-medium text-green-800">QR Data</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                {qrDataList.length} QR codes found
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${playerLocationList.length > 0 && !playerDataLoading ? "bg-orange-500" : playerDataLoading ? "bg-gray-400" : "bg-red-500"}`}
                ></div>
                <span className="font-medium text-yellow-800">
                  Live Players
                </span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                {playerDataLoading
                  ? "Loading..."
                  : `${playerLocationList.length} Player(s) Tracked`}
              </p>
            </div>
          </div>

          {/* ERRORS */}
          {mapError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {mapError}
            </div>
          )}
          {qrDataError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {qrDataError}
            </div>
          )}
          {playerDataError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {playerDataError}
            </div>
          )}
        </div>

        {/* MAP CONTAINER */}
        <div className="relative">
          {/* BUTTONS CONTAINER (QR & PLAYER LIST) */}
          <div
            className={`absolute top-4 right-16 z-[2002] flex flex-row gap-2 ${isFullScreen ? "fixed" : "absolute"}`}
          >
            <button
              onClick={toggleQRList}
              disabled={qrDataList.length === 0}
              title="Show QR List"
              className="p-2 bg-white rounded-full shadow-lg border border-blue-300 hover:bg-blue-50 transition-colors duration-150 text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaQrcode className="w-5 h-5" />
            </button>

            <button
              onClick={showPlayerList}
              disabled={playerLocationList.length === 0}
              title="Show Player List"
              className="p-2 bg-white rounded-full shadow-lg border border-gray-300 hover:bg-gray-100 transition-colors duration-150 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaUsers className="w-5 h-5" />
            </button>
          </div>

          {/* FULLSCREEN TOGGLE BUTTON (NEW) */}
          <button
            onClick={toggleFullScreen}
            title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            className={`absolute bottom-4 right-4 z-[2002] p-3 bg-white rounded-lg shadow-xl border border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-black transition-all duration-200 ${isFullScreen ? "fixed" : "absolute"}`}
          >
            {isFullScreen ? (
              <FaCompress className="w-5 h-5" />
            ) : (
              <FaExpand className="w-5 h-5" />
            )}
          </button>

          <div
            id="galli-map"
            ref={mapRef}
            // Apply "fixed inset-0" when fullscreen to force it to cover viewport, otherwise use standard relative layout
            className={`rounded-lg border border-gray-300 bg-gray-200 transition-all duration-300 ease-in-out
              ${
                isFullScreen
                  ? "fixed inset-0 z-[2000] h-screen w-screen rounded-none border-none"
                  : "relative w-full h-96 md:h-[600px]"
              }`}
            onClick={() => {}}
          >
            <div
              id="map-pano"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "1px",
                height: "1px",
                pointerEvents: "none",
                zIndex: -1,
              }}
            ></div>

            {!mapLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200 rounded-lg z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading Galli Maps...</p>
                </div>
              </div>
            )}
          </div>

          {/* POPUPS */}
          {showQRPopup && qrDataList.length > 0 && (
            <QRListPopup
              qrList={qrDataList}
              onSelect={handleQRSelect}
              onClose={hideQRList}
            />
          )}

          {showPlayerListPopup && playerLocationList.length > 0 && (
            <PlayerListPopup
              players={playerLocationList}
              onSelect={handlePlayerSelect}
              onClose={hidePlayerList}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default HeatmapsPage;
