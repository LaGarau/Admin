// "use client";

// import React, { useState, useEffect, useRef } from "react";
// import { realtimeDb } from "@/lib/firebase";
// import { ref, push, onValue, onChildAdded, remove, update, get } from "firebase/database";
// import { IoMdNotificationsOutline } from "react-icons/io";

// const Notification = () => {
//   const [users, setUsers] = useState([]);
//   const [selectedUserId, setSelectedUserId] = useState("");
//   const [imgUrl, setImgUrl] = useState("");
//   const [message, setMessage] = useState("");
//   const [notifications, setNotifications] = useState([]);
//   const [editId, setEditId] = useState(null);
//   const [prizeCodes, setPrizeCodes] = useState([]);
//   const [scannedUsers, setScannedUsers] = useState([]);
//   const processingRef = useRef(new Set());

//   // --- FETCH USERS ---
//   useEffect(() => {
//     const usersRef = ref(realtimeDb, "Users");
//     onValue(usersRef, (snapshot) => {
//       const data = snapshot.val();
//       if (data) {
//         setUsers(Object.keys(data).map((key) => ({ id: key, ...data[key] })));
//       }
//     });
//   }, []);

//   // --- FETCH PRIZE CODES ---
//   useEffect(() => {
//     const prizeRef = ref(realtimeDb, "PrizeCodes");
//     onValue(prizeRef, (snapshot) => {
//       const data = snapshot.val();
//       if (data) {
//         setPrizeCodes(
//           Object.keys(data).map((key) => ({ id: key, ...data[key] }))
//         );
//       }
//     });
//   }, []);

//   // --- FETCH SCANNED USERS (only those who scanned) ---
//   useEffect(() => {
//     const scannedRef = ref(realtimeDb, "scannedQRCodes");
//     onValue(scannedRef, (snapshot) => {
//       const data = snapshot.val();
//       if (data) {
//         setScannedUsers(Object.keys(data).map((key) => ({ id: key, ...data[key] })));
//       } else {
//         setScannedUsers([]);
//       }
//     });
//   }, []);

//   // --- FETCH NOTIFICATIONS ---
//   useEffect(() => {
//     const notificationsRef = ref(realtimeDb, "notifications");
//     onValue(notificationsRef, (snapshot) => {
//       const data = snapshot.val();
//       if (data) {
//         setNotifications(
//           Object.keys(data).map((key) => ({ id: key, ...data[key] })).reverse()
//         );
//       }
//     });
//   }, []);

//   // --- LISTEN FOR NEW SCANS AND AUTO ASSIGN PRIZES ---
//   useEffect(() => {
//     const scannedRef = ref(realtimeDb, "scannedQRCodes");

//     const unsubscribe = onChildAdded(scannedRef, async (snapshot) => {
//       const scanId = snapshot.key;
//       const scan = snapshot.val();

//       // Skip if already processed or currently processing
//       if (scan.processed || processingRef.current.has(scanId)) {
//         return;
//       }

//       // Mark as processing
//       processingRef.current.add(scanId);

//       try {
//         console.log("Processing new scan:", scanId, scan);

//         // Get username
//         let username = scan.username;
//         if (!username && scan.userId) {
//           const userSnap = await get(ref(realtimeDb, `Users/${scan.userId}`));
//           username = userSnap.val()?.username || "Unknown";
//         }

//         // Check if user already has a prize
//         const userStatusSnap = await get(ref(realtimeDb, `UsersWinningStatus/${scan.userId}`));
//         const userStatus = userStatusSnap.val();

//         if (userStatus?.won) {
//           console.log(`User ${username} already won: ${userStatus.prizeCode}`);
//           await sendNotification(username, scan.qrName, userStatus.prizeCode, true);
//           await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), {
//             prizeCode: userStatus.prizeCode,
//             processed: true,
//           });
//           processingRef.current.delete(scanId);
//           return;
//         }

//         // Get fresh prize codes data
//         const prizeSnapshot = await get(ref(realtimeDb, "PrizeCodes"));
//         const prizeData = prizeSnapshot.val();

//         if (!prizeData) {
//           console.log("No prizes available in database");
//           await sendNotification(username, scan.qrName, null, false);
//           await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), { processed: true });
//           processingRef.current.delete(scanId);
//           return;
//         }

//         // Filter for unused prizes matching the QR
//         const allPrizes = Object.keys(prizeData).map((key) => ({
//           id: key,
//           ...prizeData[key],
//         }));

//         const availablePrizes = allPrizes.filter(
//           (p) => !p.used && p.qrId === scan.qrId && p.qrName === scan.qrName
//         );

//         console.log(`Found ${availablePrizes.length} available prizes for ${scan.qrName}`);

//         if (availablePrizes.length === 0) {
//           console.log("No prizes available");
//           await sendNotification(username, scan.qrName, null, false);
//           await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), { processed: true });
//           processingRef.current.delete(scanId);
//           return;
//         }

//         // Select the first available prize
//         const selectedPrize = availablePrizes[0];
//         console.log(`Assigning prize ${selectedPrize.code} to ${username}`);

//         // Update prize as used
//         await update(ref(realtimeDb, `PrizeCodes/${selectedPrize.id}`), {
//           used: true,
//           assignedTo: scan.userId,
//           assignedToUsername: username,
//           assignedAt: Date.now(),
//         });

//         // Store in PrizeStatus
//         await push(ref(realtimeDb, "PrizeStatus"), {
//           userId: scan.userId,
//           username,
//           prizeCode: selectedPrize.code,
//           prizeCodeId: selectedPrize.id,
//           qrId: selectedPrize.qrId,
//           qrName: selectedPrize.qrName,
//           assignedAt: new Date().toISOString(),
//         });

//         // Update user winning status
//         await update(ref(realtimeDb, `UsersWinningStatus/${scan.userId}`), {
//           won: true,
//           prizeCode: selectedPrize.code,
//           prizeId: selectedPrize.id,
//           qrId: selectedPrize.qrId,
//           qrName: selectedPrize.qrName,
//           wonAt: Date.now(),
//         });

//         // Update the scan record
//         await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), {
//           prizeCode: selectedPrize.code,
//           processed: true,
//           assignedAt: Date.now(),
//         });

//         // Send notification
//         await sendNotification(username, scan.qrName, selectedPrize.code, false);

//         console.log(`✅ Successfully assigned ${selectedPrize.code} to ${username}`);
//       } catch (error) {
//         console.error("Error processing scan:", error);
//       } finally {
//         processingRef.current.delete(scanId);
//       }
//     });

//     return () => unsubscribe();
//   }, []);

//   const sendNotification = async (username, qrName, prizeCode, alreadyWon) => {
//     const payload = {
//       message: prizeCode
//         ? `🎉 ${username} scanned ${qrName} — Congratulations! Prize Code: ${prizeCode}`
//         : alreadyWon
//         ? `${username} scanned ${qrName} — You've already won a prize!`
//         : `${username} scanned ${qrName} — Sorry, no prizes available.`,
//       username,
//       prizeCode: prizeCode || "",
//       qrName,
//       createdAt: Date.now(),
//       imgUrl: "",
//     };
//     await push(ref(realtimeDb, "notifications"), payload);
//   };

//   // --- MANUAL NOTIFICATION HANDLERS ---
//   const filteredUsers = users.filter((u) => u.username?.trim() !== "");

//   const handleSubmit = () => {
//     if (!message && !imgUrl) return;
//     if (!selectedUserId) return alert("Please select a user!");
//     const selectedUser = users.find((u) => u.id === selectedUserId);
//     const payload = {
//       imgUrl,
//       message,
//       userId: selectedUserId,
//       username: selectedUser.username,
//       createdAt: Date.now(),
//     };
//     if (editId) {
//       update(ref(realtimeDb, `notifications/${editId}`), payload);
//       setEditId(null);
//     } else {
//       push(ref(realtimeDb, "notifications"), payload);
//     }
//     setMessage("");
//     setImgUrl("");
//     setSelectedUserId("");
//   };

//   const handleEdit = (item) => {
//     setMessage(item.message);
//     setImgUrl(item.imgUrl);
//     setSelectedUserId(item.userId || "");
//     setEditId(item.id);
//   };

//   const handleDelete = (id) => remove(ref(realtimeDb, `notifications/${id}`));

//   return (
//     <div className="max-w-3xl mx-auto p-6">
//       {/* Notification Form */}
//       <div className="bg-white shadow-md rounded-lg p-6 space-y-4">
//         <h2 className="text-2xl font-semibold flex items-center gap-2">
//           <IoMdNotificationsOutline />
//           {editId ? "Edit Notification" : "Add Notification"}
//         </h2>

//         <input
//           type="text"
//           placeholder="Message"
//           className="border p-3 w-full rounded-lg"
//           value={message}
//           onChange={(e) => setMessage(e.target.value)}
//         />
//         <input
//           type="text"
//           placeholder="Image URL"
//           className="border p-3 w-full rounded-lg"
//           value={imgUrl}
//           onChange={(e) => setImgUrl(e.target.value)}
//         />
//         <select
//           value={selectedUserId}
//           onChange={(e) => setSelectedUserId(e.target.value)}
//           className="border p-3 w-full rounded-lg"
//         >
//           <option value="">Select User</option>
//           {filteredUsers.map((u) => (
//             <option key={u.id} value={u.id}>
//               {u.username}
//             </option>
//           ))}
//         </select>

//         <button
//           onClick={handleSubmit}
//           className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700"
//         >
//           {editId ? "Update" : "Submit"}
//         </button>
//       </div>

//       {/* Scanned Users / Assigned Prizes */}
//       <div className="mt-8">
//         <h3 className="text-xl font-semibold mb-4">
//           Scanned Users ({scannedUsers.length})
//         </h3>
//         {scannedUsers.length === 0 ? (
//           <p className="text-gray-500 text-center py-8">No QR codes scanned yet</p>
//         ) : (
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             {scannedUsers.map((scan) => {
//               const username =
//                 users.find((u) => u.id === scan.userId)?.username ||
//                 scan.username ||
//                 "Unknown";
//               return (
//                 <div
//                   key={scan.id}
//                   className="bg-white shadow-lg rounded-lg p-4 space-y-2"
//                 >
//                   <p className="text-gray-800 font-medium text-lg">{username}</p>
//                   <p className="text-gray-600">
//                     Scanned QR:{" "}
//                     <span className="font-semibold">{scan.qrName || "Unknown"}</span>
//                   </p>
//                   <p className="text-xs text-gray-500">
//                     Time:{" "}
//                     {scan.scannedAt
//                       ? new Date(scan.scannedAt).toLocaleString()
//                       : "N/A"}
//                   </p>
//                   {scan.prizeCode ? (
//                     <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-xl text-center shadow-md mt-2">
//                       <p className="text-sm font-semibold mb-1">🎉 PRIZE CODE</p>
//                       <p className="text-3xl font-bold font-mono tracking-wider">
//                         {scan.prizeCode}
//                       </p>
//                     </div>
//                   ) : scan.processed ? (
//                     <div className="bg-gray-400 text-white p-4 rounded-lg text-center">
//                       <p className="text-sm">No prize available</p>
//                     </div>
//                   ) : (
//                     <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 p-4 rounded-lg text-center">
//                       <p className="text-sm font-semibold">⏳ Processing...</p>
//                     </div>
//                   )}
//                   <div className="flex justify-end mt-2">
//                     <button
//                       className="bg-red-500 px-3 py-1 rounded text-white hover:bg-red-600"
//                       onClick={() =>
//                         remove(ref(realtimeDb, `scannedQRCodes/${scan.id}`))
//                       }
//                     >
//                       Delete
//                     </button>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </div>

//       {/* Notifications */}
//       <div className="mt-8">
//         <h3 className="text-xl font-semibold mb-4">
//           Notifications ({notifications.length})
//         </h3>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//           {notifications.map((item) => {
//             const date = new Date(item.createdAt);
//             return (
//               <div
//                 key={item.id}
//                 className="bg-white shadow-lg rounded-lg overflow-hidden hover:scale-105 transition"
//               >
//                 {item.imgUrl && (
//                   <img
//                     src={item.imgUrl}
//                     alt="notification"
//                     className="w-full h-48 object-cover"
//                   />
//                 )}
//                 <div className="p-4 space-y-2">
//                   <p className="text-gray-800 text-lg font-medium">{item.message}</p>
//                   {item.username && (
//                     <p className="text-sm text-gray-600">
//                       User: <span className="font-semibold">{item.username}</span>
//                     </p>
//                   )}
//                   {item.prizeCode && (
//                     <div className="bg-green-500 text-white p-6 rounded-xl shadow-2xl text-center mt-2">
//                       <p className="text-2xl font-bold mb-2">CONGRATULATIONS!</p>
//                       <p className="text-4xl font-mono tracking-wider">
//                         {item.prizeCode}
//                       </p>
//                     </div>
//                   )}
//                   <p className="text-xs text-gray-500">
//                     Sent at: {date.toLocaleString()}
//                   </p>
//                   <div className="flex justify-end gap-2">
//                     <button
//                       onClick={() => handleEdit(item)}
//                       className="bg-yellow-400 px-3 py-1 rounded text-white hover:bg-yellow-500"
//                     >
//                       Edit
//                     </button>
//                     <button
//                       onClick={() => handleDelete(item.id)}
//                       className="bg-red-500 px-3 py-1 rounded text-white hover:bg-red-600"
//                     >
//                       Delete
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Notification;

// "use client";

// import React, { useState, useEffect, useRef } from "react";
// import { realtimeDb } from "@/lib/firebase";
// import { ref, push, onValue, onChildAdded, remove, update, get, query, orderByChild, equalTo } from "firebase/database";
// import { IoMdNotificationsOutline } from "react-icons/io";

// const Notification = () => {
//   const [users, setUsers] = useState([]);
//   const [selectedUserId, setSelectedUserId] = useState("");
//   const [imgUrl, setImgUrl] = useState("");
//   const [message, setMessage] = useState("");
//   const [notifications, setNotifications] = useState([]);
//   const [editId, setEditId] = useState(null);
//   const [prizeCodes, setPrizeCodes] = useState([]);
//   const [scannedUsers, setScannedUsers] = useState([]);
//   const processingRef = useRef(new Set());
//   const initialLoadRef = useRef(true);

//   // --- FETCH USERS ---
//   useEffect(() => {
//     const usersRef = ref(realtimeDb, "Users");
//     onValue(usersRef, (snapshot) => {
//       const data = snapshot.val();
//       if (data) {
//         setUsers(Object.keys(data).map((key) => ({ id: key, ...data[key] })));
//       }
//     });
//   }, []);

//   // --- FETCH PRIZE CODES ---
//   useEffect(() => {
//     const prizeRef = ref(realtimeDb, "PrizeCodes");
//     onValue(prizeRef, (snapshot) => {
//       const data = snapshot.val();
//       if (data) {
//         setPrizeCodes(
//           Object.keys(data).map((key) => ({ id: key, ...data[key] }))
//         );
//       }
//     });
//   }, []);

//   // --- FETCH SCANNED USERS (only those who scanned) ---
//   useEffect(() => {
//     const scannedRef = ref(realtimeDb, "scannedQRCodes");
//     onValue(scannedRef, (snapshot) => {
//       const data = snapshot.val();
//       if (data) {
//         setScannedUsers(Object.keys(data).map((key) => ({ id: key, ...data[key] })));
//       } else {
//         setScannedUsers([]);
//       }
//     });
//   }, []);

//   // --- FETCH NOTIFICATIONS (deduplicated) ---
//   useEffect(() => {
//     const notificationsRef = ref(realtimeDb, "notifications");
//     onValue(notificationsRef, (snapshot) => {
//       const data = snapshot.val();
//       if (data) {
//         const notifList = Object.keys(data).map((key) => ({ id: key, ...data[key] }));

//         // Remove duplicates based on username + prizeCode + qrName combination
//         const seen = new Map();
//         const deduped = notifList.filter(notif => {
//           const key = `${notif.username}-${notif.prizeCode}-${notif.qrName}`;
//           if (seen.has(key)) {
//             // Delete the duplicate from Firebase
//             remove(ref(realtimeDb, `notifications/${notif.id}`));
//             return false;
//           }
//           seen.set(key, true);
//           return true;
//         });

//         setNotifications(deduped.reverse());
//       }
//     });
//   }, []);

//   // --- LISTEN FOR NEW SCANS AND AUTO ASSIGN PRIZES ---
//   useEffect(() => {
//     const scannedRef = ref(realtimeDb, "scannedQRCodes");

//     const unsubscribe = onChildAdded(scannedRef, async (snapshot) => {
//       // Skip initial load - only process new scans after component mounts
//       if (initialLoadRef.current) {
//         return;
//       }

//       const scanId = snapshot.key;
//       const scan = snapshot.val();

//       // Skip if already processed or currently processing
//       if (scan.processed || processingRef.current.has(scanId)) {
//         return;
//       }

//       // Mark as processing
//       processingRef.current.add(scanId);

//       try {
//         console.log("Processing new scan:", scanId, scan);
//         console.log("Scan QR Info - qrId:", scan.qrId, "qrName:", scan.qrName);

//         // Get username
//         let username = scan.username;
//         if (!username && scan.userId) {
//           const userSnap = await get(ref(realtimeDb, `Users/${scan.userId}`));
//           username = userSnap.val()?.username || "Unknown";
//         }

//         // Check if user already has a prize
//         const userStatusSnap = await get(ref(realtimeDb, `UsersWinningStatus/${scan.userId}`));
//         const userStatus = userStatusSnap.val();

//         if (userStatus?.won) {
//           console.log(`User ${username} already won: ${userStatus.prizeCode}`);
//           await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), {
//             prizeCode: userStatus.prizeCode,
//             processed: true,
//           });
//           processingRef.current.delete(scanId);
//           return;
//         }

//         // Get fresh prize codes data
//         const prizeSnapshot = await get(ref(realtimeDb, "PrizeCodes"));
//         const prizeData = prizeSnapshot.val();

//         if (!prizeData) {
//           console.log("No prizes available in database");
//           await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), { processed: true });
//           processingRef.current.delete(scanId);
//           return;
//         }

//         // Filter for unused prizes that EXACTLY match the scanned QR
//         const allPrizes = Object.keys(prizeData).map((key) => ({
//           id: key,
//           ...prizeData[key],
//         }));

//         console.log("All prizes:", allPrizes);

//         const availablePrizes = allPrizes.filter((p) => {
//           const matches = !p.used &&
//                          p.qrId === scan.qrId &&
//                          p.qrName === scan.qrName;

//           if (!p.used && p.qrName === scan.qrName) {
//             console.log(`Prize ${p.code}: qrId match = ${p.qrId === scan.qrId}, qrName match = ${p.qrName === scan.qrName}`);
//           }

//           return matches;
//         });

//         console.log(`Found ${availablePrizes.length} available prizes for QR: ${scan.qrName} (${scan.qrId})`);

//         if (availablePrizes.length === 0) {
//           console.log("No prizes available for this specific QR");
//           await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), { processed: true });
//           processingRef.current.delete(scanId);
//           return;
//         }

//         // Select the first available prize
//         const selectedPrize = availablePrizes[0];
//         console.log(`Assigning prize ${selectedPrize.code} from QR ${selectedPrize.qrName} to ${username}`);

//         // Update prize as used
//         await update(ref(realtimeDb, `PrizeCodes/${selectedPrize.id}`), {
//           used: true,
//           assignedTo: scan.userId,
//           assignedToUsername: username,
//           assignedAt: Date.now(),
//         });

//         // Store in PrizeStatus
//         await push(ref(realtimeDb, "PrizeStatus"), {
//           userId: scan.userId,
//           username,
//           prizeCode: selectedPrize.code,
//           prizeCodeId: selectedPrize.id,
//           qrId: selectedPrize.qrId,
//           qrName: selectedPrize.qrName,
//           assignedAt: new Date().toISOString(),
//         });

//         // Update user winning status
//         await update(ref(realtimeDb, `UsersWinningStatus/${scan.userId}`), {
//           won: true,
//           prizeCode: selectedPrize.code,
//           prizeId: selectedPrize.id,
//           qrId: selectedPrize.qrId,
//           qrName: selectedPrize.qrName,
//           wonAt: Date.now(),
//         });

//         // Update the scan record
//         await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), {
//           prizeCode: selectedPrize.code,
//           processed: true,
//           assignedAt: Date.now(),
//         });

//         // Send notification (only once)
//         await sendNotification(username, scan.qrName, selectedPrize.code, false);

//         console.log(`✅ Successfully assigned ${selectedPrize.code} to ${username}`);
//       } catch (error) {
//         console.error("Error processing scan:", error);
//       } finally {
//         processingRef.current.delete(scanId);
//       }
//     });

//     // Mark initial load as complete after 2 seconds
//     const timer = setTimeout(() => {
//       initialLoadRef.current = false;
//       console.log("Now listening for NEW scans only");
//     }, 2000);

//     return () => {
//       unsubscribe();
//       clearTimeout(timer);
//     };
//   }, []);

//   const sendNotification = async (username, qrName, prizeCode, alreadyWon) => {
//     // Check if notification already exists
//     const notifRef = ref(realtimeDb, "notifications");
//     const snapshot = await get(notifRef);
//     const existingNotifs = snapshot.val();

//     if (existingNotifs) {
//       const isDuplicate = Object.values(existingNotifs).some(
//         n => n.username === username && n.prizeCode === prizeCode && n.qrName === qrName
//       );

//       if (isDuplicate) {
//         console.log("Notification already exists, skipping");
//         return;
//       }
//     }

//     const payload = {
//       message: prizeCode
//         ? `🎉 ${username} scanned ${qrName} — Congratulations! Prize Code: ${prizeCode}`
//         : alreadyWon
//         ? `${username} scanned ${qrName} — You've already won a prize!`
//         : `${username} scanned ${qrName} — Sorry, no prizes available.`,
//       username,
//       prizeCode: prizeCode || "",
//       qrName,
//       createdAt: Date.now(),
//       imgUrl: "",
//     };
//     await push(ref(realtimeDb, "notifications"), payload);
//   };

//   // --- MANUAL NOTIFICATION HANDLERS ---
//   const filteredUsers = users.filter((u) => u.username?.trim() !== "");

//   const handleSubmit = () => {
//     if (!message && !imgUrl) return;
//     if (!selectedUserId) return alert("Please select a user!");
//     const selectedUser = users.find((u) => u.id === selectedUserId);
//     const payload = {
//       imgUrl,
//       message,
//       userId: selectedUserId,
//       username: selectedUser.username,
//       createdAt: Date.now(),
//     };
//     if (editId) {
//       update(ref(realtimeDb, `notifications/${editId}`), payload);
//       setEditId(null);
//     } else {
//       push(ref(realtimeDb, "notifications"), payload);
//     }
//     setMessage("");
//     setImgUrl("");
//     setSelectedUserId("");
//   };

//   const handleEdit = (item) => {
//     setMessage(item.message);
//     setImgUrl(item.imgUrl);
//     setSelectedUserId(item.userId || "");
//     setEditId(item.id);
//   };

//   const handleDelete = (id) => remove(ref(realtimeDb, `notifications/${id}`));

//   return (
//     <div className="max-w-3xl mx-auto p-6">
//       {/* Notification Form */}
//       <div className="bg-white shadow-md rounded-lg p-6 space-y-4">
//         <h2 className="text-2xl font-semibold flex items-center gap-2">
//           <IoMdNotificationsOutline />
//           {editId ? "Edit Notification" : "Add Notification"}
//         </h2>

//         <input
//           type="text"
//           placeholder="Message"
//           className="border p-3 w-full rounded-lg"
//           value={message}
//           onChange={(e) => setMessage(e.target.value)}
//         />
//         <input
//           type="text"
//           placeholder="Image URL"
//           className="border p-3 w-full rounded-lg"
//           value={imgUrl}
//           onChange={(e) => setImgUrl(e.target.value)}
//         />
//         <select
//           value={selectedUserId}
//           onChange={(e) => setSelectedUserId(e.target.value)}
//           className="border p-3 w-full rounded-lg"
//         >
//           <option value="">Select User</option>
//           {filteredUsers.map((u) => (
//             <option key={u.id} value={u.id}>
//               {u.username}
//             </option>
//           ))}
//         </select>

//         <button
//           onClick={handleSubmit}
//           className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700"
//         >
//           {editId ? "Update" : "Submit"}
//         </button>
//       </div>

//       {/* Scanned Users / Assigned Prizes */}
//       <div className="mt-8">
//         <h3 className="text-xl font-semibold mb-4">
//           Scanned Users ({scannedUsers.length})
//         </h3>
//         {scannedUsers.length === 0 ? (
//           <p className="text-gray-500 text-center py-8">No QR codes scanned yet</p>
//         ) : (
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             {scannedUsers.map((scan) => {
//               const username =
//                 users.find((u) => u.id === scan.userId)?.username ||
//                 scan.username ||
//                 "Unknown";
//               return (
//                 <div
//                   key={scan.id}
//                   className="bg-white shadow-lg rounded-lg p-4 space-y-2"
//                 >
//                   <p className="text-gray-800 font-medium text-lg">{username}</p>
//                   <p className="text-gray-600">
//                     Scanned QR:{" "}
//                     <span className="font-semibold">{scan.qrName || "Unknown"}</span>
//                   </p>
//                   <p className="text-xs text-gray-500">
//                     QR ID: {scan.qrId || "N/A"}
//                   </p>
//                   <p className="text-xs text-gray-500">
//                     Time:{" "}
//                     {scan.scannedAt
//                       ? new Date(scan.scannedAt).toLocaleString()
//                       : "N/A"}
//                   </p>
//                   {scan.prizeCode ? (
//                     <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-xl text-center shadow-md mt-2">
//                       <p className="text-sm font-semibold mb-1">🎉 PRIZE CODE</p>
//                       <p className="text-3xl font-bold font-mono tracking-wider">
//                         {scan.prizeCode}
//                       </p>
//                     </div>
//                   ) : scan.processed ? (
//                     <div className="bg-gray-400 text-white p-4 rounded-lg text-center">
//                       <p className="text-sm">No prize available</p>
//                     </div>
//                   ) : (
//                     <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 p-4 rounded-lg text-center">
//                       <p className="text-sm font-semibold">⏳ Processing...</p>
//                     </div>
//                   )}
//                   <div className="flex justify-end mt-2">
//                     <button
//                       className="bg-red-500 px-3 py-1 rounded text-white hover:bg-red-600"
//                       onClick={() =>
//                         remove(ref(realtimeDb, `scannedQRCodes/${scan.id}`))
//                       }
//                     >
//                       Delete
//                     </button>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </div>

//       {/* Notifications */}
//       <div className="mt-8">
//         <h3 className="text-xl font-semibold mb-4">
//           Notifications ({notifications.length})
//         </h3>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//           {notifications.map((item) => {
//             const date = new Date(item.createdAt);
//             return (
//               <div
//                 key={item.id}
//                 className="bg-white shadow-lg rounded-lg overflow-hidden hover:scale-105 transition"
//               >
//                 {item.imgUrl && (
//                   <img
//                     src={item.imgUrl}
//                     alt="notification"
//                     className="w-full h-48 object-cover"
//                   />
//                 )}
//                 <div className="p-4 space-y-2">
//                   <p className="text-gray-800 text-lg font-medium">{item.message}</p>
//                   {item.username && (
//                     <p className="text-sm text-gray-600">
//                       User: <span className="font-semibold">{item.username}</span>
//                     </p>
//                   )}
//                   {item.qrName && (
//                     <p className="text-sm text-gray-600">
//                       QR: <span className="font-semibold">{item.qrName}</span>
//                     </p>
//                   )}
//                   {item.prizeCode && (
//                     <div className="bg-green-500 text-white p-6 rounded-xl shadow-2xl text-center mt-2">
//                       <p className="text-2xl font-bold mb-2">CONGRATULATIONS!</p>
//                       <p className="text-4xl font-mono tracking-wider">
//                         {item.prizeCode}
//                       </p>
//                     </div>
//                   )}
//                   <p className="text-xs text-gray-500">
//                     Sent at: {date.toLocaleString()}
//                   </p>
//                   <div className="flex justify-end gap-2">
//                     <button
//                       onClick={() => handleEdit(item)}
//                       className="bg-yellow-400 px-3 py-1 rounded text-white hover:bg-yellow-500"
//                     >
//                       Edit
//                     </button>
//                     <button
//                       onClick={() => handleDelete(item.id)}
//                       className="bg-red-500 px-3 py-1 rounded text-white hover:bg-red-600"
//                     >
//                       Delete
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Notification;




// "use client";

// import React, { useState, useEffect, useRef } from "react";
// import { realtimeDb } from "@/lib/firebase";
// import {
//   ref,
//   push,
//   onValue,
//   onChildAdded,
//   remove,
//   update,
//   get,
//   query,
//   orderByChild,
//   equalTo,
// } from "firebase/database";
// import { IoMdNotificationsOutline } from "react-icons/io";

// const Notification = () => {
//   const [users, setUsers] = useState([]);
//   const [selectedUserId, setSelectedUserId] = useState("");
//   const [imgUrl, setImgUrl] = useState("");
//   const [message, setMessage] = useState("");
//   const [notifications, setNotifications] = useState([]);
//   const [editId, setEditId] = useState(null);
//   const [prizeCodes, setPrizeCodes] = useState([]);
//   const [scannedUsers, setScannedUsers] = useState([]);
//   const processingRef = useRef(new Set());
//   const initialLoadRef = useRef(true);

//   // --- FETCH USERS ---
//   useEffect(() => {
//     const usersRef = ref(realtimeDb, "Users");
//     onValue(usersRef, (snapshot) => {
//       const data = snapshot.val();
//       if (data) {
//         setUsers(Object.keys(data).map((key) => ({ id: key, ...data[key] })));
//       }
//     });
//   }, []);

//   // --- FETCH PRIZE CODES ---
//   useEffect(() => {
//     const prizeRef = ref(realtimeDb, "PrizeCodes");
//     onValue(prizeRef, (snapshot) => {
//       const data = snapshot.val();
//       if (data) {
//         setPrizeCodes(
//           Object.keys(data).map((key) => ({ id: key, ...data[key] }))
//         );
//       }
//     });
//   }, []);

//   // --- FETCH SCANNED USERS (only those who scanned) ---
//   useEffect(() => {
//     const scannedRef = ref(realtimeDb, "scannedQRCodes");
//     onValue(scannedRef, (snapshot) => {
//       const data = snapshot.val();
//       if (data) {
//         setScannedUsers(
//           Object.keys(data).map((key) => ({ id: key, ...data[key] }))
//         );
//       } else {
//         setScannedUsers([]);
//       }
//     });
//   }, []);

//   // --- FETCH NOTIFICATIONS (deduplicated) ---
//   useEffect(() => {
//     const notificationsRef = ref(realtimeDb, "notifications");
//     onValue(notificationsRef, (snapshot) => {
//       const data = snapshot.val();
//       if (data) {
//         const notifList = Object.keys(data).map((key) => ({
//           id: key,
//           ...data[key],
//         }));

//         // Remove duplicates based on username + prizeCode + qrName combination
//         const seen = new Map();
//         const deduped = notifList.filter((notif) => {
//           const key = `${notif.username}-${notif.prizeCode}-${notif.qrName}`;
//           if (seen.has(key)) {
//             // Delete the duplicate from Firebase
//             remove(ref(realtimeDb, `notifications/${notif.id}`));
//             return false;
//           }
//           seen.set(key, true);
//           return true;
//         });

//         setNotifications(deduped.reverse());
//       }
//     });
//   }, []);

//   // --- LISTEN FOR NEW SCANS AND AUTO ASSIGN PRIZES ---
//   useEffect(() => {
//     const scannedRef = ref(realtimeDb, "scannedQRCodes");

//     const unsubscribe = onChildAdded(scannedRef, async (snapshot) => {
//       // Skip initial load - only process new scans after component mounts
//       if (initialLoadRef.current) {
//         return;
//       }

//       const scanId = snapshot.key;
//       const scan = snapshot.val();

//       // Skip if already processed or currently processing
//       if (scan.processed || processingRef.current.has(scanId)) {
//         return;
//       }

//       // Mark as processing
//       processingRef.current.add(scanId);

//       try {
//         console.log("Processing new scan:", scanId, scan);
//         console.log("Scan QR Info - qrId:", scan.qrId, "qrName:", scan.qrName);

//         // Get username
//         let username = scan.username;
//         if (!username && scan.userId) {
//           const userSnap = await get(ref(realtimeDb, `Users/${scan.userId}`));
//           username = userSnap.val()?.username || "Unknown";
//         }

//         // Check if user already has a prize
//         const userStatusSnap = await get(ref(realtimeDb, `UsersWinningStatus/${scan.userId}`));
//         const userStatus = userStatusSnap.val();

//         if (userStatus?.won) {
//           console.log(`User ${username} already won: ${userStatus.prizeCode}`);
//           // Send notification that they already won
//           await sendNotification(username, scan.qrName, userStatus.prizeCode, true);
//           await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), {
//             prizeCode: userStatus.prizeCode,
//             processed: true,
//             alreadyWon: true,
//           });
//           processingRef.current.delete(scanId);
//           return;
//         }

//         // Get fresh prize codes data
//         const prizeSnapshot = await get(ref(realtimeDb, "PrizeCodes"));
//         const prizeData = prizeSnapshot.val();

//         if (!prizeData) {
//           console.log("No prizes available in database");
//           await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), { processed: true });
//           processingRef.current.delete(scanId);
//           return;
//         }

//         // Filter for unused prizes that EXACTLY match the scanned QR
//         const allPrizes = Object.keys(prizeData).map((key) => ({
//           id: key,
//           ...prizeData[key],
//         }));

//         console.log("All prizes:", allPrizes);

//         const availablePrizes = allPrizes.filter((p) => {
//           const matches = !p.used &&
//                          p.qrId === scan.qrId &&
//                          p.qrName === scan.qrName;

//           if (!p.used && p.qrName === scan.qrName) {
//             console.log(`Prize ${p.code}: qrId match = ${p.qrId === scan.qrId}, qrName match = ${p.qrName === scan.qrName}`);
//           }

//           return matches;
//         });

//         console.log(`Found ${availablePrizes.length} available prizes for QR: ${scan.qrName} (${scan.qrId})`);

//         if (availablePrizes.length === 0) {
//           console.log("No prizes available for this specific QR");
//           await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), { processed: true });
//           processingRef.current.delete(scanId);
//           return;
//         }

//         // Select the first available prize
//         const selectedPrize = availablePrizes[0];
//         console.log(`Assigning prize ${selectedPrize.code} from QR ${selectedPrize.qrName} to ${username}`);

//         // Update prize as used
//         await update(ref(realtimeDb, `PrizeCodes/${selectedPrize.id}`), {
//           used: true,
//           assignedTo: scan.userId,
//           assignedToUsername: username,
//           assignedAt: Date.now(),
//         });

//         // Store in PrizeStatus
//         await push(ref(realtimeDb, "PrizeStatus"), {
//           userId: scan.userId,
//           username,
//           prizeCode: selectedPrize.code,
//           prizeCodeId: selectedPrize.id,
//           qrId: selectedPrize.qrId,
//           qrName: selectedPrize.qrName,
//           assignedAt: new Date().toISOString(),
//         });

//         // Update user winning status
//         await update(ref(realtimeDb, `UsersWinningStatus/${scan.userId}`), {
//           won: true,
//           prizeCode: selectedPrize.code,
//           prizeId: selectedPrize.id,
//           qrId: selectedPrize.qrId,
//           qrName: selectedPrize.qrName,
//           wonAt: Date.now(),
//         });

//         // Update the scan record
//         await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), {
//           prizeCode: selectedPrize.code,
//           processed: true,
//           assignedAt: Date.now(),
//         });

//         // Send notification (only once)
//         await sendNotification(username, scan.qrName, selectedPrize.code, false);

//         console.log(`✅ Successfully assigned ${selectedPrize.code} to ${username}`);
//       } catch (error) {
//         console.error("Error processing scan:", error);
//       } finally {
//         processingRef.current.delete(scanId);
//       }
//     });



//     // Mark initial load as complete after 2 seconds
//     const timer = setTimeout(() => {
//       initialLoadRef.current = false;
//       console.log("Now listening for NEW scans only");
//     }, 2000);

//     return () => {
//       unsubscribe();
//       clearTimeout(timer);
//     };
//   }, []);

//   const sendNotification = async (username, qrName, prizeCode, alreadyWon) => {
//     // Check if notification already exists
//     const notifRef = ref(realtimeDb, "notifications");
//     const snapshot = await get(notifRef);
//     const existingNotifs = snapshot.val();

//     if (existingNotifs) {
//       const isDuplicate = Object.values(existingNotifs).some(
//         (n) =>
//           n.username === username &&
//           n.prizeCode === prizeCode &&
//           n.qrName === qrName
//       );

//       if (isDuplicate) {
//         console.log("Notification already exists, skipping");
//         return;
//       }
//     }

//     const payload = {
//       message: prizeCode
//         ? `🎉 ${username} scanned ${qrName} — Congratulations! Prize Code: ${prizeCode}`
//         : alreadyWon
//         ? `${username} scanned ${qrName} — You've already won a prize!`
//         : `${username} scanned ${qrName} — Sorry, no prizes available.`,
//       username,
//       prizeCode: prizeCode || "",
//       qrName,
//       createdAt: Date.now(),
//       imgUrl: "",
//     };
//     await push(ref(realtimeDb, "notifications"), payload);
//   };

//   // --- MANUAL NOTIFICATION HANDLERS ---
//   const filteredUsers = users.filter((u) => u.username?.trim() !== "");

//   const handleSubmit = () => {
//     if (!message && !imgUrl) return;
//     if (!selectedUserId) return alert("Please select a user!");
//     const selectedUser = users.find((u) => u.id === selectedUserId);
//     const payload = {
//       imgUrl,
//       message,
//       userId: selectedUserId,
//       username: selectedUser.username,
//       createdAt: Date.now(),
//     };
//     if (editId) {
//       update(ref(realtimeDb, `notifications/${editId}`), payload);
//       setEditId(null);
//     } else {
//       push(ref(realtimeDb, "notifications"), payload);
//     }
//     setMessage("");
//     setImgUrl("");
//     setSelectedUserId("");
//   };

//   const handleEdit = (item) => {
//     setMessage(item.message);
//     setImgUrl(item.imgUrl);
//     setSelectedUserId(item.userId || "");
//     setEditId(item.id);
//   };

//   const handleDelete = (id) => remove(ref(realtimeDb, `notifications/${id}`));

//   return (
//     <div className="max-w-3xl mx-auto p-6">
//       {/* Notification Form */}
//       <div className="bg-white shadow-md rounded-lg p-6 space-y-4">
//         <h2 className="text-2xl font-semibold flex items-center gap-2">
//           <IoMdNotificationsOutline />
//           {editId ? "Edit Notification" : "Add Notification"}
//         </h2>

//         <input
//           type="text"
//           placeholder="Message"
//           className="border p-3 w-full rounded-lg"
//           value={message}
//           onChange={(e) => setMessage(e.target.value)}
//         />
//         <input
//           type="text"
//           placeholder="Image URL"
//           className="border p-3 w-full rounded-lg"
//           value={imgUrl}
//           onChange={(e) => setImgUrl(e.target.value)}
//         />
//         <select
//           value={selectedUserId}
//           onChange={(e) => setSelectedUserId(e.target.value)}
//           className="border p-3 w-full rounded-lg"
//         >
//           <option value="">Select User</option>
//           {filteredUsers.map((u) => (
//             <option key={u.id} value={u.id}>
//               {u.username}
//             </option>
//           ))}
//         </select>

//         <button
//           onClick={handleSubmit}
//           className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700"
//         >
//           {editId ? "Update" : "Submit"}
//         </button>
//       </div>

//       {/* Scanned Users / Assigned Prizes */}
//       <div className="mt-8">
//         <h3 className="text-xl font-semibold mb-4">
//           Scanned Users ({scannedUsers.length})
//         </h3>
//         {scannedUsers.length === 0 ? (
//           <p className="text-gray-500 text-center py-8">
//             No QR codes scanned yet
//           </p>
//         ) : (
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             {scannedUsers.map((scan) => {
//               const username =
//                 users.find((u) => u.id === scan.userId)?.username ||
//                 scan.username ||
//                 "Unknown";
//               return (
//                 <div
//                   key={scan.id}
//                   className="bg-white shadow-lg rounded-lg p-4 space-y-2"
//                 >
//                   <p className="text-gray-800 font-medium text-lg">
//                     {username}
//                   </p>
//                   <p className="text-gray-600">
//                     Scanned QR:{" "}
//                     <span className="font-semibold">
//                       {scan.qrName || "Unknown"}
//                     </span>
//                   </p>
//                   <p className="text-xs text-gray-500">
//                     QR ID: {scan.qrId || "N/A"}
//                   </p>
//                   <p className="text-xs text-gray-500">
//                     Time:{" "}
//                     {scan.scannedAt
//                       ? new Date(scan.scannedAt).toLocaleString()
//                       : "N/A"}
//                   </p>
//                   {scan.prizeCode ? (
//                     <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-xl text-center shadow-md mt-2">
//                       <p className="text-sm font-semibold mb-1">
//                         🎉 PRIZE CODE
//                       </p>
//                       <p className="text-3xl font-bold font-mono tracking-wider">
//                         {scan.prizeCode}
//                       </p>
//                       {scan.alreadyWon && (
//                         <p className="text-xs mt-2 opacity-80">
//                           (Already won - can't win again)
//                         </p>
//                       )}
//                     </div>
//                   ) : scan.processed ? (
//                     <div className="bg-gray-400 text-white p-4 rounded-lg text-center">
//                       <p className="text-sm">No prize available</p>
//                     </div>
//                   ) : (
//                     <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 p-4 rounded-lg text-center">
//                       <p className="text-sm font-semibold">⏳ Processing...</p>
//                     </div>
//                   )}
//                   <div className="flex justify-end mt-2">
//                     <button
//                       className="bg-red-500 px-3 py-1 rounded text-white hover:bg-red-600"
//                       onClick={() =>
//                         remove(ref(realtimeDb, `scannedQRCodes/${scan.id}`))
//                       }
//                     >
//                       Delete
//                     </button>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </div>

//       {/* Notifications */}
//       <div className="mt-8">
//         <h3 className="text-xl font-semibold mb-4">
//           Notifications ({notifications.length})
//         </h3>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//           {notifications.map((item) => {
//             const date = new Date(item.createdAt);
//             return (
//               <div
//                 key={item.id}
//                 className="bg-white shadow-lg rounded-lg overflow-hidden hover:scale-105 transition"
//               >
//                 {item.imgUrl && (
//                   <img
//                     src={item.imgUrl}
//                     alt="notification"
//                     className="w-full h-48 object-cover"
//                   />
//                 )}
//                 <div className="p-4 space-y-2">
//                   <p className="text-gray-800 text-lg font-medium">
//                     {item.message}
//                   </p>
//                   {item.username && (
//                     <p className="text-sm text-gray-600">
//                       User:{" "}
//                       <span className="font-semibold">{item.username}</span>
//                     </p>
//                   )}
//                   {item.qrName && (
//                     <p className="text-sm text-gray-600">
//                       QR: <span className="font-semibold">{item.qrName}</span>
//                     </p>
//                   )}
//                   {item.prizeCode && (
//                     <div className="bg-green-500 text-white p-6 rounded-xl shadow-2xl text-center mt-2">
//                       <p className="text-2xl font-bold mb-2">
//                         CONGRATULATIONS!
//                       </p>
//                       <p className="text-4xl font-mono tracking-wider">
//                         {item.prizeCode}
//                       </p>
//                     </div>
//                   )}
//                   <p className="text-xs text-gray-500">
//                     Sent at: {date.toLocaleString()}
//                   </p>
//                   <div className="flex justify-end gap-2">
//                     <button
//                       onClick={() => handleEdit(item)}
//                       className="bg-yellow-400 px-3 py-1 rounded text-white hover:bg-yellow-500"
//                     >
//                       Edit
//                     </button>
//                     <button
//                       onClick={() => handleDelete(item.id)}
//                       className="bg-red-500 px-3 py-1 rounded text-white hover:bg-red-600"
//                     >
//                       Delete
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Notification;











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

        // Remove duplicates based on username + prizeCode + qrName combination
        const seen = new Map();
        const deduped = notifList.filter((notif) => {
          const key = `${notif.username}-${notif.prizeCode}-${notif.qrName}`;
          if (seen.has(key)) {
            // Delete the duplicate from Firebase
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
      // Skip initial load - only process new scans after component mounts
      if (initialLoadRef.current) {
        return;
      }

      const scanId = snapshot.key;
      const scan = snapshot.val();

      // Skip if already processed or currently processing
      if (scan.processed || processingRef.current.has(scanId)) {
        console.log(`⏭️ Skipping scan ${scanId} - already processed or processing`);
        return;
      }

      // Mark as processing IMMEDIATELY in Firebase to prevent duplicate processing
      processingRef.current.add(scanId);
      await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), {
        processing: true,
      });

      try {
        console.log("=== PROCESSING NEW SCAN ===");
        console.log("Scan ID:", scanId);
        console.log("Scan data:", scan);
        console.log("Scan QR Info - qrId:", scan.qrId, "qrName:", scan.qrName);

        // Get username
        let username = scan.username;
        if (!username && scan.userId) {
          const userSnap = await get(ref(realtimeDb, `Users/${scan.userId}`));
          username = userSnap.val()?.username || "Unknown";
        }

        console.log("Username:", username);

        // CHECK IF USER ALREADY WON ANY PRIZE
        const userStatusSnap = await get(ref(realtimeDb, `UsersWinningStatus/${scan.userId}`));
        const userStatus = userStatusSnap.val();

        console.log("User winning status:", userStatus);

        if (userStatus?.won) {
          console.log(`❌ User ${username} already won a prize: ${userStatus.prizeCode}`);
          
          // Mark scan as processed FIRST
          await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), {
            processed: true,
            alreadyWon: true,
            existingPrizeCode: userStatus.prizeCode,
            existingQrName: userStatus.qrName,
          });
          
          // Then send notification
          await sendNotification(
            username, 
            scan.qrName, 
            userStatus.prizeCode, 
            "already_won",
            scan.qrId
          );
          
          processingRef.current.delete(scanId);
          return; // EXIT - User can't win again
        }

        // Get fresh prize codes data
        const prizeSnapshot = await get(ref(realtimeDb, "PrizeCodes"));
        const prizeData = prizeSnapshot.val();

        console.log("=== PRIZE DATA ===");
        console.log("Prize data exists:", !!prizeData);

        if (!prizeData) {
          console.log("❌ No prizes available in database");
          
          await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), { 
            processed: true,
            noPrizesAvailable: true 
          });
          
          await sendNotification(username, scan.qrName, null, "no_prizes", scan.qrId);
          
          processingRef.current.delete(scanId);
          return;
        }

        // Get all prizes
        const allPrizes = Object.keys(prizeData).map((key) => ({
          id: key,
          ...prizeData[key],
        }));

        console.log("=== ALL PRIZES ===");
        console.log("Total prizes:", allPrizes.length);
        allPrizes.forEach((p, idx) => {
          console.log(`Prize ${idx + 1}:`, {
            code: p.code,
            qrId: p.qrId,
            qrName: p.qrName,
            used: p.used
          });
        });

        // MATCHING LOGIC - Try different strategies
        console.log("=== MATCHING PRIZES ===");
        console.log("Looking for prizes matching:");
        console.log("  Scan qrId:", scan.qrId);
        console.log("  Scan qrName:", scan.qrName);

        // Strategy 1: Exact match on both qrId and qrName
        let availablePrizes = allPrizes.filter((p) => {
          const matches = !p.used && p.qrId === scan.qrId && p.qrName === scan.qrName;
          return matches;
        });

        console.log("Strategy 1 (exact qrId + qrName):", availablePrizes.length, "prizes");

        // Strategy 2: If no exact match, try qrName only (fallback)
        if (availablePrizes.length === 0 && scan.qrName) {
          console.log("No exact match, trying qrName only...");
          availablePrizes = allPrizes.filter((p) => {
            const matches = !p.used && p.qrName === scan.qrName;
            if (matches) {
              console.log(`  Found prize: ${p.code} with qrName: ${p.qrName}`);
            }
            return matches;
          });
          console.log("Strategy 2 (qrName only):", availablePrizes.length, "prizes");
        }

        // Strategy 3: If still no match, try qrId only (fallback)
        if (availablePrizes.length === 0 && scan.qrId) {
          console.log("No qrName match, trying qrId only...");
          availablePrizes = allPrizes.filter((p) => {
            const matches = !p.used && p.qrId === scan.qrId;
            if (matches) {
              console.log(`  Found prize: ${p.code} with qrId: ${p.qrId}`);
            }
            return matches;
          });
          console.log("Strategy 3 (qrId only):", availablePrizes.length, "prizes");
        }

        // If STILL no prizes found
        if (availablePrizes.length === 0) {
          console.log(`❌ No prizes available for QR: ${scan.qrName} (${scan.qrId})`);
          console.log("Detailed analysis:");
          
          const unusedPrizes = allPrizes.filter(p => !p.used);
          console.log(`  Total unused prizes: ${unusedPrizes.length}`);
          
          if (unusedPrizes.length > 0) {
            console.log("  Unused prizes have these QRs:");
            unusedPrizes.forEach(p => {
              console.log(`    - ${p.code}: qrId="${p.qrId}", qrName="${p.qrName}"`);
            });
            console.log(`  But scan has: qrId="${scan.qrId}", qrName="${scan.qrName}"`);
          }
          
          await sendNotification(username, scan.qrName, null, "out_of_prizes", scan.qrId);
          
          await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), { 
            processed: true,
            noPrizesForThisQR: true,
            debugInfo: {
              scannedQrId: scan.qrId,
              scannedQrName: scan.qrName,
              totalUnusedPrizes: unusedPrizes.length,
              unusedPrizesQRs: unusedPrizes.map(p => ({ qrId: p.qrId, qrName: p.qrName }))
            }
          });
          
          processingRef.current.delete(scanId);
          return;
        }

        // Select the first available prize
        const selectedPrize = availablePrizes[0];
        console.log(`✅ Assigning prize ${selectedPrize.code} to ${username}`);

        // Update prize as used
        await update(ref(realtimeDb, `PrizeCodes/${selectedPrize.id}`), {
          used: true,
          assignedTo: scan.userId,
          assignedToUsername: username,
          assignedAt: Date.now(),
        });

        // Store in PrizeStatus
        await push(ref(realtimeDb, "PrizeStatus"), {
          userId: scan.userId,
          username,
          prizeCode: selectedPrize.code,
          prizeCodeId: selectedPrize.id,
          qrId: selectedPrize.qrId,
          qrName: selectedPrize.qrName,
          assignedAt: new Date().toISOString(),
        });

        // Update user winning status
        await update(ref(realtimeDb, `UsersWinningStatus/${scan.userId}`), {
          won: true,
          prizeCode: selectedPrize.code,
          prizeId: selectedPrize.id,
          qrId: selectedPrize.qrId,
          qrName: selectedPrize.qrName,
          wonAt: Date.now(),
        });

        // Update the scan record
        await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), {
          prizeCode: selectedPrize.code,
          processed: true,
          assignedAt: Date.now(),
        });

        // Send success notification
        await sendNotification(username, scan.qrName, selectedPrize.code, "success", scan.qrId);

        console.log(`✅ Successfully assigned ${selectedPrize.code} to ${username}`);
        console.log("=== END PROCESSING ===\n");
      } catch (error) {
        console.error("❌ Error processing scan:", error);
      } finally {
        processingRef.current.delete(scanId);
      }
    });

    // Mark initial load as complete after 2 seconds
    const timer = setTimeout(() => {
      initialLoadRef.current = false;
      console.log("🎯 Now listening for NEW scans only");
    }, 2000);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const sendNotification = async (username, qrName, prizeCode, status, qrId) => {
    // Check if notification already exists for this user + QR combination
    const notifRef = ref(realtimeDb, "notifications");
    const snapshot = await get(notifRef);
    const existingNotifs = snapshot.val();

    if (existingNotifs) {
      // Check for ANY existing notification for this user + QR (regardless of status)
      const isDuplicate = Object.values(existingNotifs).some(
        (n) =>
          n.username === username &&
          n.qrName === qrName &&
          // Check if created within last 10 seconds (to handle same scan session)
          (Date.now() - n.createdAt) < 10000
      );

      if (isDuplicate) {
        console.log("⚠️ Notification already exists for this user+QR, skipping to prevent duplicate");
        return;
      }
    }

    let message = "";
    
    switch(status) {
      case "success":
        message = `🎉 ${username} scanned ${qrName} — Congratulations! Prize Code: ${prizeCode}`;
        break;
      case "already_won":
        message = `${username} scanned ${qrName} — You've already won! Your prize code: ${prizeCode}`;
        break;
      case "out_of_prizes":
        message = `${username} scanned ${qrName} — Sorry! All prizes for this QR are claimed. Keep scanning other QRs!`;
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
          🔍 Debug Info - Prize Codes Status
        </h3>
        <div className="space-y-2 text-sm">
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

      {/* Scanned Users / Assigned Prizes */}
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
                  <p className="text-xs text-gray-500">
                    Time:{" "}
                    {scan.scannedAt
                      ? new Date(scan.scannedAt).toLocaleString()
                      : "N/A"}
                  </p>
                  
                  {/* Debug Info for this scan */}
                  {scan.debugInfo && (
                    <div className="bg-yellow-50 border border-yellow-300 p-2 rounded text-xs mt-2">
                      <p className="font-semibold text-yellow-800">Debug:</p>
                      <p>Scanned: qrId={scan.debugInfo.scannedQrId}</p>
                      <p>Unused prizes for other QRs: {scan.debugInfo.totalUnusedPrizes}</p>
                    </div>
                  )}
                  
                  {/* Prize Status Display */}
                  {scan.prizeCode ? (
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-xl text-center shadow-md mt-2">
                      <p className="text-sm font-semibold mb-1">
                        🎉 PRIZE CODE
                      </p>
                      <p className="text-3xl font-bold font-mono tracking-wider">
                        {scan.prizeCode}
                      </p>
                    </div>
                  ) : scan.alreadyWon ? (
                    <div className="bg-orange-500 text-white p-4 rounded-lg text-center">
                      <p className="text-sm font-semibold">⚠️ Already Won</p>
                      <p className="text-xs mt-1">
                        User already claimed: {scan.existingPrizeCode}
                      </p>
                      <p className="text-xs opacity-80">
                        From: {scan.existingQrName}
                      </p>
                    </div>
                  ) : scan.noPrizesForThisQR ? (
                    <div className="bg-blue-500 text-white p-4 rounded-lg text-center">
                      <p className="text-sm font-semibold">📢 Keep Scanning!</p>
                      <p className="text-xs mt-1">
                        All prizes for this QR are claimed
                      </p>
                    </div>
                  ) : scan.noPrizesAvailable ? (
                    <div className="bg-gray-400 text-white p-4 rounded-lg text-center">
                      <p className="text-sm">❌ No prizes in system</p>
                    </div>
                  ) : scan.processed ? (
                    <div className="bg-gray-400 text-white p-4 rounded-lg text-center">
                      <p className="text-sm">No prize available</p>
                    </div>
                  ) : (
                    <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 p-4 rounded-lg text-center">
                      <p className="text-sm font-semibold">⏳ Processing...</p>
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
                        CONGRATULATIONS!
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