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

// --- PROXIMITY CONFIGURATION ---
const PROXIMITY_RADIUS_M = 15;
// Border Highlighting Colors (Replacing Circles)
const COLOR_PROXIMITY_GREEN = "#10B981";
const COLOR_PROXIMITY_YELLOW = "#FBBF24";
const COLOR_PROXIMITY_RED = "#EF4444";
// Border Styles
const DEFAULT_BORDER_STYLE = "3px solid #ffffff"; // Default border color (Black)
const HIGHLIGHT_BORDER_WIDTH = "10px"; // Thicker border for highlight

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
const QRListPopup = ({ qrList, onSelect, onClose, selectedQrId }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 400, y: 300 });

  // State for keyboard navigation (Kept for visual highlighting based on map click)
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const listRef = useRef(null);
  const itemRefs = useRef([]);

  // Effect to find and highlight the selected item when the popup opens
  useEffect(() => {
    if (selectedQrId) {
      const initialIndex = qrList.findIndex((qr) => qr.id === selectedQrId);
      if (initialIndex !== -1) {
        setSelectedIndex(initialIndex);
        scrollToItem(initialIndex);
      } else {
        setSelectedIndex(-1);
      }
    } else {
      setSelectedIndex(-1);
    }
    itemRefs.current = itemRefs.current.slice(0, qrList.length);
  }, [qrList, selectedQrId]);

  // REMOVED: useEffect for keyboard navigation (ArrowUp/Down/Enter)

  // Helper to scroll to the active item (No change needed)
  const scrollToItem = (index) => {
    if (itemRefs.current[index]) {
      itemRefs.current[index].scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  };

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
        <br />

        <h3 className="text-lg font-bold text-blue-700 mt-4 mb-3 border-b pb-2 flex items-center">
          <FaQrcode className="mr-2" /> Select QR Location ({qrList.length})
        </h3>

        <div className="max-h-60 overflow-y-auto" ref={listRef}>
          {qrList.length === 0 ? (
            <p className="text-gray-500 text-sm">No QR codes found.</p>
          ) : (
            <ul className="space-y-2">
              {qrList.map((qr, index) => (
                <li
                  key={qr.id}
                  ref={(el) => (itemRefs.current[index] = el)}
                  onClick={() => onSelect(qr)}
                  // MODIFIED: Added conditional styling for selectedIndex
                  className={`p-2 rounded cursor-pointer transition-colors duration-150 text-gray-800 text-sm group border
                    ${
                      index === selectedIndex
                        ? "bg-blue-200 border-blue-400 ring-1 ring-blue-300"
                        : "bg-gray-50 border-transparent hover:bg-blue-100 hover:border-blue-200"
                    }`}
                >
                  <div className="font-semibold flex justify-between items-center">
                    {qr.name || "Unnamed QR"}
                    <FaMapPin
                      className={`${
                        index === selectedIndex
                          ? "text-blue-700"
                          : "text-blue-400 group-hover:text-blue-600"
                      }`}
                    />
                  </div>
                  <div className="text-xs text-gray-500 truncate mt-1">
                    {qr.description || "No description"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Removed keyboard instruction footer */}
      </div>
    </div>
  );
};

// --- PLAYER LIST POPUP COMPONENT ---
const PlayerListPopup = ({ players, onSelect, onClose, selectedPlayerId }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 600, y: 300 });

  // State for keyboard navigation (Kept for visual highlighting based on map click)
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const listRef = useRef(null);
  const itemRefs = useRef([]);

  // Effect to find and highlight the selected item when the popup opens
  useEffect(() => {
    if (selectedPlayerId) {
      const initialIndex = players.findIndex(
        (player) => player.id === selectedPlayerId,
      );
      if (initialIndex !== -1) {
        setSelectedIndex(initialIndex);
        scrollToItem(initialIndex);
      } else {
        setSelectedIndex(-1);
      }
    } else {
      setSelectedIndex(-1);
    }
    itemRefs.current = itemRefs.current.slice(0, players.length);
  }, [players, selectedPlayerId]);

  // REMOVED: useEffect for keyboard navigation (ArrowUp/Down/Enter)

  // Helper to scroll to the active item (No change needed)
  const scrollToItem = (index) => {
    if (itemRefs.current[index]) {
      itemRefs.current[index].scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  };

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
        <br />
        <h3 className="text-lg font-bold text-green-700 mt-4 mb-3 border-b pb-2 flex items-center">
          <FaUserAlt className="mr-2" />
          Select Player ({players.length})
        </h3>
        <div className="max-h-60 overflow-y-auto" ref={listRef}>
          {players.length === 0 ? (
            <p className="text-gray-500 text-sm">No live players found.</p>
          ) : (
            <ul className="space-y-2">
              {players.map((player, index) => (
                <li
                  key={player.id}
                  ref={(el) => (itemRefs.current[index] = el)}
                  onClick={() => onSelect(player)}
                  // MODIFIED: Added conditional styling for selectedIndex
                  className={`p-2 rounded cursor-pointer transition-colors duration-150 text-gray-800 text-sm font-medium flex justify-between items-center
                    ${
                      index === selectedIndex
                        ? "bg-green-200 border border-green-400 ring-1 ring-green-300"
                        : "bg-gray-50 border border-transparent hover:bg-green-100"
                    }`}
                >
                  {player.name}
                  <FaMapPin
                    className={`${
                      index === selectedIndex
                        ? "text-green-700"
                        : "text-green-500"
                    }`}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Removed keyboard instruction footer */}
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
  // NEW: State to hold QR marker references for removal/cleanup
  const [qrMarkerReferences, setQrMarkerReferences] = useState({});
  // Keeping circle references state for cleanup, though not used for drawing now
  const [circleReferences, setCircleReferences] = useState({});
  const activeRedMarkerRef = useRef(null);

  // === POPUP STATES ===
  const [showQRPopup, setShowQRPopup] = useState(false);
  const [showPlayerListPopup, setShowPlayerListPopup] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  // NEW: State to store the ID of the QR clicked on the map
  const [selectedQrId, setSelectedQrId] = useState(null);
  // NEW: State to store the ID of the Player clicked on the map
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  // NEW: State to force map remount/re-render
  const [showMap, setShowMap] = useState(true);

  // --- POPUP HANDLERS ---

  // QR LIST HANDLERS
  const toggleQRList = (e) => {
    if (e) e.stopPropagation();
    setShowQRPopup((prev) => !prev);
    // NEW: Clear selection when manually toggling
    setSelectedQrId(null);
  };

  const hideQRList = () => {
    setShowQRPopup(false);
    // NEW: Clear selection on close
    setSelectedQrId(null);
  };

  const handleQRSelect = (qr) => {
    const lat = parseFloat(qr.latitude);
    const lng = parseFloat(qr.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      // MODIFIED: Uses default zoom (18)
      safeNavigateToPoint(lat, lng, qr.name, qr.description);
    }
  };

  // NEW: Handler for clicking a QR marker on the map
  const handleQrMarkerClick = (qr) => {
    // 1. Zoom to the point (using safeNavigateToPoint with zoom 17)
    const lat = parseFloat(qr.latitude);
    const lng = parseFloat(qr.longitude);

    if (!isNaN(lat) && !isNaN(lng)) {
      safeNavigateToPoint(lat, lng, qr.name, qr.description, 17); // Zoom to 17
    }

    // 2. Set the selected QR ID and show the popup
    setSelectedQrId(qr.id);
    setShowQRPopup(true);
  };

  // PLAYER LIST HANDLERS
  const showPlayerList = (e) => {
    if (e) e.stopPropagation();
    setShowPlayerListPopup(true);
    // NEW: Clear selection when manually toggling
    setSelectedPlayerId(null);
  };

  const hidePlayerList = () => {
    setShowPlayerListPopup(false);
    // NEW: Clear selection on close
    setSelectedPlayerId(null);
  };

  const handlePlayerSelect = (player) => {
    const lat = player.latitude;
    const lng = player.longitude;
    // MODIFIED: Uses default zoom (18)
    safeNavigateToPoint(
      lat,
      lng,
      `Selected Player: ${player.name}`,
      `Player ID: ${player.id} | Last Update: ${new Date(
        player.lastUpdate,
      ).toLocaleString()}`,
    );
  };

  // NEW: Handler for clicking a Player marker on the map
  const handlePlayerMarkerClick = (player) => {
    // 1. Zoom to the point (using safeNavigateToPoint with zoom 17)
    const lat = player.latitude;
    const lng = player.longitude;

    if (!isNaN(lat) && !isNaN(lng)) {
      safeNavigateToPoint(
        lat,
        lng,
        `Selected Player: ${player.name}`,
        `Player ID: ${player.id} | Last Update: ${new Date(
          player.lastUpdate,
        ).toLocaleString()}`,
        17, // Zoom to 17
      );
    }

    // 2. Set the selected Player ID and show the popup
    setSelectedPlayerId(player.id);
    setShowPlayerListPopup(true);
  };

  // --- FULLSCREEN HANDLER (NO CHANGE) ---
  const toggleFullScreen = () => {
    // If currently in fullscreen and exiting, briefly hide map to force remeasurement
    if (isFullScreen) {
      // Step 1: Hide the map component entirely
      setShowMap(false);
      // Step 2: Allow a brief period for DOM to recalculate the container size
      setTimeout(() => {
        // Step 3: Exit fullscreen state
        setIsFullScreen(false);
        // Step 4: Show map again, forcing a full re-initialization (and thus, a correct resize)
        setShowMap(true);
      }, 50); // 50ms delay is minimal but effective for DOM updates
    } else {
      // Entering fullscreen
      setIsFullScreen(true);
    }
  };

  // --- HELPER: Safe Navigation ---
  // MODIFIED: Added optional 'zoom' parameter
  const safeNavigateToPoint = (lat, lng, title, description, zoom = 18) => {
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
            zoom: zoom, // MODIFIED: Use the passed zoom level
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

  // --- MAP INITIALIZATION (NO CHANGE) ---
  useEffect(() => {
    // Only run if the map is intended to be visible
    if (!showMap) {
      // If map is being unmounted, clean up the instance
      if (galliMapInstance.current) {
        galliMapInstance.current = null;
      }
      setMapLoaded(false);
      return;
    }

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
        // if (!accessToken) {
        //   console.error("Missing GalliMaps Access Token");
        // }

        const galliMapsObject = {
          accessToken: accessToken,
          map: {
            container: "galli-map",
            center: [27.7172, 85.324],
            zoom: 13,
            clickable: true,
          },
          // FIX 1: Use the hidden 'map-pano' element ID to satisfy
          // initialization requirements and prevent "i.pano is undefined" errors.
          pano: { container: "map-pano" },
        };

        galliMapInstance.current = new GalliMapPlugin(galliMapsObject);

        if (galliMapInstance.current) {
          setMapLoaded(true);
          setMapError(null);

          // FIX 2: Workaround to forcefully hide the dynamically created 360-degree button.
          setTimeout(() => {
            const mapContainer = document.getElementById("galli-map");
            if (mapContainer) {
              // Target buttons based on common control structure and likely titles/classes
              const possibleButtons = mapContainer.querySelectorAll(
                'button[title*="360"], button[title*="pano"], .galli-pano-control, .galli-map-ctrl-pano',
              );

              possibleButtons.forEach((button) => {
                // Use !important to override the library's potential inline styles
                button.style.setProperty("display", "none", "important");
              });
            }
          }, 500); // Wait 500ms for the map controls to fully render
        }
      } catch (error) {
        console.error("Error initializing Galli Maps:", error);
        setMapError(`Error loading Galli Maps: ${error.message}`);
      }
    };

    initializeMap();

    // The cleanup function now handles map disposal when showMap is false
    return () => {
      if (galliMapInstance.current) {
        // Perform any necessary map destruction logic here if the library provides one
        // GalliMaps doesn't explicitly mention a 'destroy' but clearing the ref is enough for React
        galliMapInstance.current = null;
      }
    };
  }, [showMap]); // Depend on showMap to trigger initialization on true, and cleanup on false

  // --- FIREBASE LISTENERS: QR-Data (NO CHANGE) ---
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

  // --- FIREBASE LISTENERS: Player Location (NO CHANGE) ---
  useEffect(() => {
    // *** CHANGE 1: Fetch from "playernav" table instead of "Users" ***
    const playerNavRef = ref(db, "playernav");
    const unsubscribe = onValue(
      playerNavRef,
      (snapshot) => {
        try {
          const data = snapshot.val();
          if (data) {
            const playerArray = Object.keys(data)
              .map((key) => ({ id: key, ...data[key] }))
              .filter((player) => {
                const hasValidLat =
                  player.latitude && !isNaN(parseFloat(player.latitude));
                const hasValidLng =
                  player.longitude && !isNaN(parseFloat(player.longitude));
                return hasValidLat && hasValidLng;
              })
              .map((player) => ({
                id: player.id,
                // *** CHANGE 2: Use 'username' for name (or fall back to ID) ***
                // The old code used username || firstName || id. We simplify to username || id
                name: player.username || player.id,
                latitude: parseFloat(player.latitude),
                longitude: parseFloat(player.longitude),
                // *** CHANGE 3: Keep lastUpdate for UI, using a generic 'lastUpdate' key or current time as placeholder ***
                lastUpdate: player.lastUpdate || Date.now(),
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

  // --- HELPER TO SET MARKER BORDER STYLE (NO CHANGE) ---
  const setMarkerBorderStyle = (qrId, color) => {
    const marker = qrMarkerReferences[qrId];
    if (!marker || !marker.getElement) return;
    const el = marker.getElement();
    if (el && el.nodeName === "DIV") {
      if (color) {
        // Highlight border
        el.style.border = `${HIGHLIGHT_BORDER_WIDTH} solid ${color}`;
      } else {
        // Default border (no proximity)
        el.style.border = DEFAULT_BORDER_STYLE;
      }
    }
  };

  // --- QR MARKER LOGIC ---
  const clearQrMarkers = () => {
    if (!galliMapInstance.current) return;
    Object.values(qrMarkerReferences).forEach((marker) => {
      try {
        galliMapInstance.current.removePinMarker(marker);
      } catch (e) {
        console.warn(`Failed to remove QR marker:`, e.message);
      }
    });
    setQrMarkerReferences({});
  };

  const addQrMarkersToMap = async () => {
    if (!galliMapInstance.current || qrDataList.length === 0) return;

    // Clear existing markers before drawing new ones
    clearQrMarkers();

    const newQrMarkerReferences = {};
    // Fallback URL for the image, using the uploaded file
    const FALLBACK_ICON_URL = "/dummy.jpg";

    for (const qr of qrDataList) {
      const lat = parseFloat(qr.latitude);
      const lng = parseFloat(qr.longitude);

      // *** MODIFICATION 1: Use unique picture URL from QR data or fallback ***
      const QR_ICON_URL = qr.picture || FALLBACK_ICON_URL;

      if (!isNaN(lat) && !isNaN(lng)) {
        try {
          // Attempt 1: Use an undocumented property (iconUrl)
          const marker = await galliMapInstance.current.displayPinMarker({
            latLng: [lat, lng],
            title: qr.name,
            description: qr.description,
            // We use COLOR_DEFAULT just in case iconUrl fails and it falls back to a pin
            color: COLOR_DEFAULT,
            tooltip: qr.name,
            featureId: `qr-${qr.id}`,
            // Custom properties that might work (low chance, high impact if successful)
            iconUrl: QR_ICON_URL,
            icon: QR_ICON_URL,
            imageUrl: QR_ICON_URL,
          });

          if (marker) {
            newQrMarkerReferences[qr.id] = marker;

            // Attempt 2: If the marker is a Mapbox/Maplibre Marker object, try DOM manipulation
            // We use a short delay to ensure the marker is fully rendered in the DOM
            setTimeout(() => {
              try {
                // Check if the marker object exposes a getElement method (standard Mapbox/Maplibre Marker API)
                const el = marker.getElement ? marker.getElement() : null;

                if (el && el.nodeName === "DIV") {
                  // This applies the custom image as a background to the marker's container DIV
                  el.style.backgroundImage = `url(${QR_ICON_URL})`;

                  el.style.backgroundSize = "cover";

                  el.style.backgroundRepeat = "no-repeat";

                  // Set 60px size (as per previous implementation)
                  el.style.width = "55px";
                  el.style.height = "55px";

                  el.style.backgroundColor = "transparent"; // Hide the default background color

                  // Set circular shape and default black border
                  el.style.borderRadius = "50%";
                  // el.style.border = DEFAULT_BORDER_STYLE; // Use the default black border

                  el.innerHTML = ""; // Clear any inner SVG/content (like the default pin)

                  // Center the circle perfectly over the coordinate
                  el.style.transform = "translate(-50%, -50%)";

                  // NEW: Add click handler to the QR marker element
                  el.onclick = (e) => {
                    e.stopPropagation(); // Prevent map click events from firing
                    handleQrMarkerClick(qr);
                  };
                }
              } catch (domError) {
                console.warn(
                  `DOM manipulation failed for QR marker ${qr.id}`,
                  domError,
                );
              }
            }, 100);
          }
        } catch (e) {
          console.warn(`Skipped marker for ${qr.name}:`, e.message);
        }
      }
    }
    setQrMarkerReferences(newQrMarkerReferences);
  };
  // --- END OF QR MARKER LOGIC ---

  const addPlayerMarkersToMap = async () => {
    if (!galliMapInstance.current || playerLocationList.length === 0) return;

    // Clear existing markers before drawing new ones (Best Practice)
    clearPlayerMarkers();

    const PLAYER_ICON_URL = "/player.png";

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

              // --- APPLIED STYLING TECHNIQUE (Same as QR Markers) ---
              setTimeout(() => {
                try {
                  const el = marker.getElement ? marker.getElement() : null;

                  if (el && el.nodeName === "DIV") {
                    // Apply custom image background
                    el.style.backgroundImage = `url(${PLAYER_ICON_URL})`;
                    el.style.backgroundSize = "cover";
                    el.style.backgroundRepeat = "no-repeat";

                    // Set size (Matching QR size)
                    el.style.width = "55px";
                    el.style.height = "60px";

                    el.style.backgroundColor = "transparen"; // Hide default pin color
                    // el.style.borderRadius = "50%"; // Make it circular

                    // Apply standard white border (Same as QR)
                    // el.style.border = "0px";

                    // Optional: Add shadow for better visibility
                    // el.style.boxShadow = "0 2px 5px rgba(0,0,0,0.3)";

                    el.innerHTML = ""; // Remove the default SVG pin content
                    el.style.transform = "translate(-50%, -50%)"; // Center alignment

                    // NEW: Add click handler to the Player marker element
                    el.onclick = (e) => {
                      e.stopPropagation(); // Prevent map click events from firing
                      handlePlayerMarkerClick(player);
                    };
                  }
                } catch (domError) {
                  console.warn(
                    `DOM manipulation failed for Player marker ${player.id}`,
                    domError,
                  );
                }
              }, 100);
              // ------------------------------------------------------
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

  // --- NEW PROXIMITY EFFECT LOGIC (REPLACING CIRCLES) (NO CHANGE) ---
  const updateProximityEffects = () => {
    // 1. Clean up old polygon state (important if we ever revert or for a complete reset)
    if (galliMapInstance.current) {
      Object.keys(circleReferences).forEach((qrId) => {
        try {
          galliMapInstance.current.removePolygon(`proximity-${qrId}`);
        } catch (e) {
          /* silent fail */
        }
      });
    }
    setCircleReferences({}); // Clear the state as circles are no longer used.

    if (
      !mapLoaded ||
      qrDataList.length === 0 ||
      playerLocationList.length === 0 ||
      Object.keys(qrMarkerReferences).length === 0
    ) {
      // If prerequisites aren't met, reset all markers to default border.
      Object.keys(qrMarkerReferences).forEach((qrId) =>
        setMarkerBorderStyle(qrId, null),
      );
      return;
    }

    const qrsToUpdate = qrDataList.filter((qr) => qrMarkerReferences[qr.id]);

    qrsToUpdate.forEach((qr) => {
      let playersInProximity = 0;
      const qrLat = qr.latitude;
      const qrLng = qr.longitude;

      // Count players in proximity
      playerLocationList.forEach((player) => {
        const distance = getDistance(
          qrLat,
          qrLng,
          player.latitude,
          player.longitude,
        );
        if (distance <= PROXIMITY_RADIUS_M) playersInProximity++;
      });

      let highlightColor = null;
      if (playersInProximity === 1) {
        highlightColor = COLOR_PROXIMITY_GREEN;
      } else if (playersInProximity > 1 && playersInProximity <= 5) {
        highlightColor = COLOR_PROXIMITY_YELLOW;
      } else if (playersInProximity > 5) {
        highlightColor = COLOR_PROXIMITY_RED;
      }

      // Update the marker border style
      setMarkerBorderStyle(qr.id, highlightColor);
    });

    // Ensure any existing markers that were NOT in the current proximity check (i.e., they are no longer in range)
    // are reset to the default border style.
    Object.keys(qrMarkerReferences).forEach((qrId) => {
      if (!qrsToUpdate.some((qr) => qr.id === qrId)) {
        // This ensures that any marker that was previously active and is now off-map or outside proximity range
        // is reset to default, but the main logic above should cover all QR markers from qrDataList.
        // This check is mainly for markers not in qrDataList, which should have been cleared by clearQrMarkers,
        // so we'll rely on the main loop setting highlightColor=null for markers with 0 proximity.
      }
    });
  };

  // --- UPDATED EFFECT to use the new addQrMarkersToMap (NO CHANGE) ---
  useEffect(() => {
    if (mapLoaded && qrDataList.length > 0) addQrMarkersToMap();

    // Cleanup function for QR markers
    return () => {
      // Since clearQrMarkers handles the removal logic, we ensure it's called on component unmount/dependency change
      clearQrMarkers();
    };
  }, [mapLoaded, qrDataList]); // Added clearQrMarkers to cleanup

  useEffect(() => {
    if (!mapLoaded || playerDataLoading) return;
    if (playerMarkersVisible && playerLocationList.length > 0) {
      addPlayerMarkersToMap();
    } else {
      clearPlayerMarkers();
    }
  }, [mapLoaded, playerLocationList, playerMarkersVisible]);

  // --- UPDATED EFFECT to call the new logic (NO CHANGE) ---
  useEffect(() => {
    // We now depend on qrMarkerReferences because we need the marker objects to be present to update their style
    if (mapLoaded && qrDataList.length > 0) updateProximityEffects();

    return () => {
      // Cleanup for the now-obsolete polygons (circles) on unmount
      if (!galliMapInstance.current) return;
      Object.keys(circleReferences).forEach((qrId) => {
        try {
          galliMapInstance.current.removePolygon(`proximity-${qrId}`);
        } catch (e) {}
      });
      setCircleReferences({});
    };
  }, [mapLoaded, qrDataList, playerLocationList, qrMarkerReferences]); // Added qrMarkerReferences dependency

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
        // MODIFIED: Uses default zoom (18)
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
              {/* <button
                onClick={reloadPage}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Reload Page
              </button>*/}
              {/* <button
                onClick={togglePlayerMarkers}
                disabled={!mapLoaded || playerLocationList.length === 0}
                className={`px-4 py-2 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200
                  ${playerMarkersVisible ? "bg-red-500 hover:bg-red-600" : "bg-orange-600 hover:bg-orange-700"}
                `}
              >
                <FaMapPin className="inline mr-1" />
                {playerMarkersVisible ? "Hide Players" : "Show Players"}
              </button>*/}
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
            className={`absolute top-3 right-3 z-[2002] flex flex-row gap-2 ${isFullScreen ? "fixed" : "absolute"}`}
          >
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

            <button
              onClick={toggleQRList}
              disabled={qrDataList.length === 0}
              title="Show QR List"
              className="p-2 bg-white rounded-none shadow-lg border border-blue-300 hover:bg-blue-50 transition-colors duration-150 text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaQrcode className="w-5 h-5" />
            </button>

            <button
              onClick={showPlayerList}
              disabled={playerLocationList.length === 0}
              title="Show Player List"
              className="p-2 bg-white rounded-none shadow-lg border border-gray-300 hover:bg-gray-100 transition-colors duration-150 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* CONDITIONAL MAP RENDERING (UPDATED) */}
          {showMap && (
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
          )}

          {/* POPUPS */}
          {showQRPopup && qrDataList.length > 0 && (
            <QRListPopup
              qrList={qrDataList}
              onSelect={handleQRSelect}
              onClose={hideQRList}
              selectedQrId={selectedQrId} // NEW PROP
            />
          )}

          {showPlayerListPopup && playerLocationList.length > 0 && (
            <PlayerListPopup
              players={playerLocationList}
              onSelect={handlePlayerSelect}
              onClose={hidePlayerList}
              selectedPlayerId={selectedPlayerId} // NEW PROP
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default HeatmapsPage;
