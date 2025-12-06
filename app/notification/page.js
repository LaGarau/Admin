// "use client";

// import React, { useState, useEffect } from "react";
// import { realtimeDb } from "@/lib/firebase";
// import {
//   ref,
//   push,
//   onValue,
//   onChildAdded,
//   remove,
//   update,
//   get,
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
//   const [assignedPrizes, setAssignedPrizes] = useState([]);

//   // FETCH PRIZE CODES
//   useEffect(() => {
//     const prizeCodesRef = ref(realtimeDb, "PrizeCodes");
//     onValue(prizeCodesRef, (snapshot) => {
//       const data = snapshot.val();
//       if (data) {
//         const list = Object.keys(data).map((key) => ({ id: key, ...data[key] }));
//         setPrizeCodes(list);
//       } else {
//         setPrizeCodes([]);
//       }
//     });
//   }, []);

//   // FETCH USERS
//   useEffect(() => {
//     const usersRef = ref(realtimeDb, "Users");
//     onValue(usersRef, (snapshot) => {
//       const data = snapshot.val();
//       if (data) {
//         const list = Object.keys(data).map((key) => ({ id: key, ...data[key] }));
//         setUsers(list);
//       }
//     });
//   }, []);

//   // FETCH ASSIGNED PRIZES
//   useEffect(() => {
//     const statusRef = ref(realtimeDb, "PrizeStatus");
//     onValue(statusRef, (snapshot) => {
//       const data = snapshot.val();
//       if (data) {
//         const arr = Object.entries(data).map(([id, values]) => ({ id, ...values }));
//         setAssignedPrizes(arr);
//       }
//     });
//   }, []);

//   // AUTO ASSIGN PRIZES TO USERS WITHOUT PRIZES
//   useEffect(() => {
//     if (users.length === 0 || prizeCodes.length === 0) return;

//     const assignPrizes = async () => {
//       const prizeStatusRef = ref(realtimeDb, "PrizeStatus");

//       // Filter users without assigned prize
//       const usersWithoutPrize = users.filter(
//         (u) => !assignedPrizes.some((ap) => ap.userId === u.id)
//       );

//       for (const user of usersWithoutPrize) {
//         const availablePrize = prizeCodes.find((p) => !p.used);
//         if (!availablePrize) break;

//         // Save to PrizeStatus
//         await push(prizeStatusRef, {
//           userId: user.id,
//           username: user.username,
//           prizeCode: availablePrize.code,
//           prizeCodeId: availablePrize.id,
//           assignedAt: new Date().toISOString(),
//         });

//         // Mark prize code as used
//         await update(ref(realtimeDb, `PrizeCodes/${availablePrize.id}`), {
//           used: true,
//         });

//         // Optionally, send notification to user
//         await sendNotification({
//           username: user.username,
//           prizeCode: availablePrize.code,
//         });
//       }
//     };

//     assignPrizes();
//   }, [users, prizeCodes, assignedPrizes]);

//   // FETCH NOTIFICATIONS
//   useEffect(() => {
//     const notificationsRef = ref(realtimeDb, "notifications");
//     onValue(notificationsRef, (snapshot) => {
//       const data = snapshot.val();
//       if (data) {
//         const items = Object.keys(data)
//           .map((key) => ({ id: key, ...data[key] }))
//           .reverse();
//         setNotifications(items);
//       } else {
//         setNotifications([]);
//       }
//     });
//   }, []);

//   const filteredUsers = users.filter((u) => u.username && u.username.trim() !== "");

//   // MANUAL ADD / UPDATE NOTIFICATION
//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (!message && !imgUrl) return;
//     if (!selectedUserId) {
//       alert("Please select a user to send the notification!");
//       return;
//     }

//     const selectedUserObj = users.find((u) => u.id === selectedUserId);
//     const payload = {
//       imgUrl,
//       message,
//       userId: selectedUserId,
//       username: selectedUserObj.username,
//       createdAt: Date.now(),
//     };

//     if (editId) {
//       update(ref(realtimeDb, `notifications/${editId}`), payload);
//       setEditId(null);
//     } else {
//       push(ref(realtimeDb, "notifications"), payload);
//     }

//     setImgUrl("");
//     setMessage("");
//     setSelectedUserId("");
//   };

//   const handleDelete = (id) => remove(ref(realtimeDb, `notifications/${id}`));
//   const handleEdit = (item) => {
//     setImgUrl(item.imgUrl);
//     setMessage(item.message);
//     setSelectedUserId(item.userId || "");
//     setEditId(item.id);
//   };

//   // AUTO SCAN NOTIFICATIONS + AUTO ASSIGN PRIZE ON SCAN
//   useEffect(() => {
//     const scannedRef = ref(realtimeDb, "scannedQRCodes");

//     const unsubscribe = onChildAdded(scannedRef, (snapshot) => {
//       const scanId = snapshot.key;
//       const scan = snapshot.val();
//       if (!scan) return;
//       handleScan(scanId, scan);
//     });

//     return () => unsubscribe();
//   }, []);

//  const handleScan = async (scanId, scan) => {
//   try {
//     if (scan?.processed) return;

//     let username = scan.username;
//     if (!username) {
//       const userSnap = await get(ref(realtimeDb, `Users/${scan.userId}`));
//       username = userSnap.val()?.username || "Unknown";
//     }

//     const userStatusSnap = await get(
//       ref(realtimeDb, `UsersWinningStatus/${scan.userId}`)
//     );
//     const userStatus = userStatusSnap.val();
//     if (userStatus?.won) {
//       await sendNotification({ username, prizeCode: userStatus.prizeCode });
//       await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), { processed: true });
//       return;
//     }

//     // Fetch only unused prizes from Firebase
//     const prizeSnapshot = await get(ref(realtimeDb, "PrizeCodes"));
//     const allPrizes = prizeSnapshot.val() || {};
//     const availablePrizes = Object.entries(allPrizes)
//       .map(([id, data]) => ({ id, ...data }))
//       .filter(p => !p.used);

//     if (availablePrizes.length === 0) {
//       await sendNotification({ username, prizeCode: null });
//       await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), { processed: true });
//       return;
//     }

//     // PICK A RANDOM UNUSED PRIZE (optional)
//     const prize = availablePrizes[Math.floor(Math.random() * availablePrizes.length)];

//     // MARK AS USED in Firebase
//     await update(ref(realtimeDb, `PrizeCodes/${prize.id}`), { used: true });

//     // Update local prizeCodes state so it won’t repeat
//     setPrizeCodes(prev => prev.map(p => p.id === prize.id ? { ...p, used: true } : p));

//     // SAVE assignment in PrizeStatus
//     await push(ref(realtimeDb, "PrizeStatus"), {
//       userId: scan.userId,
//       username,
//       prizeCode: prize.code,
//       prizeCodeId: prize.id,
//       assignedAt: new Date().toISOString(),
//     });

//     // UPDATE UsersWinningStatus
//     await update(ref(realtimeDb, `UsersWinningStatus/${scan.userId}`), {
//       won: true,
//       prizeCode: prize.code,
//       prizeId: prize.id,
//       qrName: prize.qrName || "",
//       wonAt: Date.now(),
//     });

//     // SEND notification to user
//     await sendNotification({ username, prizeCode: prize.code });

//     // MARK scan as processed
//     await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), { processed: true });
//   } catch (error) {
//     console.error("handleScan error:", error);
//   }
// };


//   const sendNotification = async ({ username, prizeCode }) => {
//     const payload = {
//       message: prizeCode
//         ? `${username} has won! Prize Code: ${prizeCode}`
//         : `${username} scanned — no prize assigned yet.`,
//       username,
//       prizeCode: prizeCode || "",
//       createdAt: Date.now(),
//       imgUrl: "",
//     };

//     await push(ref(realtimeDb, "notifications"), payload);
//   };

//   // UI
//   return (
//     <div className="max-w-3xl mx-auto p-6">
//       <form
//         className="bg-white shadow-md w-full rounded-lg p-6 space-y-4"
//         onSubmit={handleSubmit}
//       >
//         <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
//           <IoMdNotificationsOutline />
//           {editId ? "Edit Notification" : "Add Notification"}
//         </h2>

//         <input
//           type="text"
//           placeholder="Enter Message"
//           className="border rounded-lg p-3 w-full"
//           value={message}
//           onChange={(e) => setMessage(e.target.value)}
//         />

//         <input
//           type="text"
//           placeholder="Enter Image URL"
//           className="border rounded-lg p-3 w-full"
//           value={imgUrl}
//           onChange={(e) => setImgUrl(e.target.value)}
//         />

//         <select
//           value={selectedUserId}
//           onChange={(e) => setSelectedUserId(e.target.value)}
//           className="w-full p-3 border rounded-lg"
//         >
//           <option value="">Select User</option>
//           {filteredUsers.map((u) => (
//             <option key={u.id} value={u.id}>
//               {u.username}
//             </option>
//           ))}
//         </select>

//         <button className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-3 rounded-lg transition">
//           {editId ? "Update" : "Submit"}
//         </button>
//       </form>

//       <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
//         {notifications.map((item) => {
//           const date = new Date(item.createdAt);
//           const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

//           return (
//             <div
//               key={item.id}
//               className="bg-white shadow-lg rounded-lg overflow-hidden hover:scale-105 transition"
//             >
//               {item.imgUrl && (
//                 <img
//                   src={item.imgUrl}
//                   alt="notification"
//                   className="w-full h-48 object-cover"
//                 />
//               )}

//               <div className="p-4 space-y-2">
//                 {item.message && (
//                   <p className="text-gray-800 text-lg font-medium">{item.message}</p>
//                 )}

//                 {item.username && (
//                   <p className="text-sm text-gray-600">
//                     User: <span className="font-semibold">{item.username}</span>
//                   </p>
//                 )}

//                 {item.prizeCode && (
//                   <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-xl shadow-2xl mt-4 text-center">
//                     <p className="text-2xl font-bold mb-2">CONGRATULATIONS!</p>
//                     <p className="text-4xl font-mono tracking-wider">{item.prizeCode}</p>
//                     <p className="text-sm mt-3 opacity-90">
//                       Show this code to claim your prize
//                     </p>
//                   </div>
//                 )}

//                 <p className="text-xs text-gray-500">Sent at: {formattedDate}</p>

//                 <div className="flex justify-end gap-2">
//                   <button
//                     onClick={() => handleEdit(item)}
//                     className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded"
//                   >
//                     Edit
//                   </button>
//                   <button
//                     onClick={() => handleDelete(item.id)}
//                     className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
//                   >
//                     Delete
//                   </button>
//                 </div>
//               </div>
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// };

// export default Notification;







"use client";

import React, { useState, useEffect } from "react";
import { realtimeDb } from "@/lib/firebase";
import { ref, push, onValue, onChildAdded, remove, update, get } from "firebase/database";
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
const [assignedPrizes, setAssignedPrizes] = useState([]);

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

// --- FETCH SCANNED USERS ---
useEffect(() => {
const scannedRef = ref(realtimeDb, "scannedQRCodes");
onValue(scannedRef, (snapshot) => {
const data = snapshot.val();
if (data) {
setScannedUsers(Object.keys(data).map((key) => ({ id: key, ...data[key] })));
}
});
}, []);

// --- FETCH ASSIGNED PRIZES ---
useEffect(() => {
const statusRef = ref(realtimeDb, "PrizeStatus");
onValue(statusRef, (snapshot) => {
const data = snapshot.val();
if (data) {
setAssignedPrizes(Object.keys(data).map((key) => ({ id: key, ...data[key] })));
}
});
}, []);

// --- FETCH NOTIFICATIONS ---
useEffect(() => {
const notificationsRef = ref(realtimeDb, "notifications");
onValue(notificationsRef, (snapshot) => {
const data = snapshot.val();
if (data) {
setNotifications(
Object.keys(data).map((key) => ({ id: key, ...data[key] })).reverse()
);
}
});
}, []);

// --- HANDLE QR SCAN AND AUTO PRIZE ASSIGNMENT ---
useEffect(() => {
const scannedRef = ref(realtimeDb, "scannedQRCodes");


const unsubscribe = onChildAdded(scannedRef, async (snapshot) => {
  const scanId = snapshot.key;
  const scan = snapshot.val();
  if (!scan || scan.processed) return;

  try {
    let username = scan.username;
    if (!username && scan.userId) {
      const userSnap = await get(ref(realtimeDb, `Users/${scan.userId}`));
      username = userSnap.val()?.username || "Unknown";
    }

    // Check if user already won
    const userStatusSnap = await get(ref(realtimeDb, `UsersWinningStatus/${scan.userId}`));
    const userStatus = userStatusSnap.val();
    if (userStatus?.won) {
      await sendNotification(username, scan.qrName, userStatus.prizeCode, true);
      await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), { processed: true });
      return;
    }

    // Get only unused prizes
    const availablePrizes = prizeCodes.filter(p => !p.used);
    if (availablePrizes.length === 0) {
      await sendNotification(username, scan.qrName, null, false);
      await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), { processed: true });
      return;
    }

    // Pick first unused prize (can also be random)
    const prize = availablePrizes[0];

    // MARK PRIZE AS USED
    await update(ref(realtimeDb, `PrizeCodes/${prize.id}`), { used: true });

    // ASSIGN PRIZE TO USER
    await push(ref(realtimeDb, "PrizeStatus"), {
      userId: scan.userId,
      username,
      prizeCode: prize.code,
      prizeCodeId: prize.id,
      assignedAt: new Date().toISOString(),
      qrName: scan.qrName || "",
    });

    // UPDATE USER WINNING STATUS
    await update(ref(realtimeDb, `UsersWinningStatus/${scan.userId}`), {
      won: true,
      prizeCode: prize.code,
      prizeId: prize.id,
      qrName: scan.qrName || "",
      wonAt: Date.now(),
    });

    // SEND NOTIFICATION
    await sendNotification(username, scan.qrName, prize.code, false);

    // MARK SCAN AS PROCESSED
    await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), { processed: true });
  } catch (error) {
    console.error("handleScan error:", error);
  }
});

return () => unsubscribe();


}, [prizeCodes]);

const sendNotification = async (username, qrName, prizeCode, alreadyWon) => {
const payload = {
message: prizeCode
? `${username} scanned ${qrName} — Congratulations! Prize Code: ${prizeCode}`
: alreadyWon
? `${username} scanned ${qrName} — You've already won a prize!`
: `${username} scanned ${qrName} — No prize assigned.`,
username,
prizeCode: prizeCode || "",
qrName,
createdAt: Date.now(),
imgUrl: "",
};
await push(ref(realtimeDb, "notifications"), payload);
};

// --- MANUAL NOTIFICATION HANDLERS ---
const filteredUsers = users.filter((u) => u.username?.trim() !== "");
const handleSubmit = (e) => {
e.preventDefault();
if (!message && !imgUrl) return;
if (!selectedUserId) return alert("Please select a user!");
const selectedUser = users.find(u => u.id === selectedUserId);
const payload = {
imgUrl,
message,
userId: selectedUserId,
username: selectedUser.username,
createdAt: Date.now(),
};
if (editId) {
update(ref(realtimeDb, `notifications/${editId}`), payload);
setEditId(null);
} else {
push(ref(realtimeDb, "notifications"), payload);
}
setMessage(""); setImgUrl(""); setSelectedUserId("");
};

const handleEdit = (item) => {
setMessage(item.message);
setImgUrl(item.imgUrl);
setSelectedUserId(item.userId || "");
setEditId(item.id);
};
const handleDelete = (id) => remove(ref(realtimeDb, `notifications/${id}`));

return ( <div className="max-w-3xl mx-auto p-6">
{/* Notification Form */} <form className="bg-white shadow-md rounded-lg p-6 space-y-4" onSubmit={handleSubmit}> <h2 className="text-2xl font-semibold flex items-center gap-2"> <IoMdNotificationsOutline />
{editId ? "Edit Notification" : "Add Notification"} </h2>

```
    <input type="text" placeholder="Message" className="border p-3 w-full rounded-lg"
      value={message} onChange={(e) => setMessage(e.target.value)} />
    <input type="text" placeholder="Image URL" className="border p-3 w-full rounded-lg"
      value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} />
    <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}
      className="border p-3 w-full rounded-lg">
      <option value="">Select User</option>
      {filteredUsers.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
    </select>

    <button className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700">
      {editId ? "Update" : "Submit"}
    </button>
  </form>

  {/* Scanned Users / Assigned Prizes */}
  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
    {scannedUsers.map(scan => {
      const username = users.find(u => u.id === scan.userId)?.username || "Unknown";
      return (
        <div key={scan.id} className="bg-white shadow-lg rounded-lg p-4 space-y-2">
          <p className="text-gray-800 font-medium">{username}</p>
          <p className="text-gray-600">Scanned QR: <span className="font-semibold">{scan.qrName || "Unknown"}</span></p>
          {scan.prizeCode && (
            <div className="bg-green-500 text-white p-6 rounded-xl text-center shadow-md mt-2">
              <p className="text-2xl font-bold">{scan.prizeCode}</p>
            </div>
          )}
          <div className="flex justify-end mt-2">
            <button className="bg-red-500 px-3 py-1 rounded text-white hover:bg-red-600"
              onClick={() => remove(ref(realtimeDb, `scannedQRCodes/${scan.id}`))}>
              Delete
            </button>
          </div>
        </div>
      );
    })}
  </div>

  {/* Notifications */}
  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
    {notifications.map(item => {
      const date = new Date(item.createdAt);
      return (
        <div key={item.id} className="bg-white shadow-lg rounded-lg overflow-hidden hover:scale-105 transition">
          {item.imgUrl && <img src={item.imgUrl} alt="notification" className="w-full h-48 object-cover" />}
          <div className="p-4 space-y-2">
            <p className="text-gray-800 text-lg font-medium">{item.message}</p>
            {item.username && <p className="text-sm text-gray-600">User: <span className="font-semibold">{item.username}</span></p>}
            {item.prizeCode && (
              <div className="bg-green-500 text-white p-6 rounded-xl shadow-2xl text-center mt-2">
                <p className="text-2xl font-bold mb-2">CONGRATULATIONS!</p>
                <p className="text-4xl font-mono tracking-wider">{item.prizeCode}</p>
              </div>
            )}
            <p className="text-xs text-gray-500">Sent at: {date.toLocaleString()}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => handleEdit(item)} className="bg-yellow-400 px-3 py-1 rounded text-white hover:bg-yellow-500">Edit</button>
              <button onClick={() => handleDelete(item.id)} className="bg-red-500 px-3 py-1 rounded text-white hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      );
    })}
  </div>
</div>


);
};

export default Notification;
