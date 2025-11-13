// // "use client";

// // import React, { useEffect, useState } from "react";
// // import { db } from "../firebase";
// // import { FaMapLocationDot } from "react-icons/fa6";
// // import { GiTwoCoins } from "react-icons/gi";
// // import { ref, onValue } from "firebase/database";
// // import { PiQrCodeFill } from "react-icons/pi";

// // export default function AnalyticsPage() {
// //   const [qrList, setQrList] = useState([]);
// //   const [totalPoints, setTotalPoints] = useState(0);
// //   const [totalCategories, setTotalCategories] = useState(0);

// //   useEffect(() => {
// //     // Listen to QR-Data
// //     const qrDataRef = ref(db, "QR-Data");
// //     const stopListeningQRData = onValue(qrDataRef, (snapshot) => {
// //       const data = snapshot.val();
// //       if (data) {
// //         const qrArray = Object.keys(data)
// //           .map((key) => ({ id: key, ...data[key] }))
// //           .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

// //         setQrList(qrArray);

// //         const pointsSum = qrArray.reduce(
// //           (sum, qr) => sum + Number(qr.points || 0),
// //           0
// //         );
// //         setTotalPoints(pointsSum);
// //       } else {
// //         setQrList([]);
// //         setTotalPoints(0);
// //       }
// //     });

// //     // Listen to Categories
// //     const categoriesRef = ref(db, "Categories");
// //     const stopListeningCategories = onValue(categoriesRef, (snapshot) => {
// //       const data = snapshot.val();
// //       if (data) {
// //         const categoryArray = Object.keys(data).map((key) => ({
// //           id: key,
// //           ...data[key],
// //         }));
// //         setTotalCategories(categoryArray.length);
// //       } else {
// //         setTotalCategories(0);
// //       }
// //     });

// //     // Cleanup on unmount
// //     return () => {
// //       stopListeningQRData();
// //       stopListeningCategories();
// //     };
// //   }, []);

// //   return (
// //     <div className="p-8 h-screen">
// //       <h1 className="text-3xl font-bold mb-6">Analytics Dashboard</h1>

// //       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
// //         <div className="bg-blue-600 text-white p-6 rounded-xl shadow-lg">
// //           <h2 className="text-xl font-semibold flex items-center gap-2">
// //             <PiQrCodeFill  className="text-3xl" />
// //             Total QR Codes
// //           </h2>
// //           <p className="text-3xl font-bold mt-2">{qrList.length}</p>
// //         </div>
// //         <div className="bg-blue-600 text-white p-6 rounded-xl shadow-lg">
// //           <h2 className="text-xl font-semibold flex items-center gap-2">
// //             <PiQrCodeFill  className="text-3xl" />
// //             Total Scan QR Codes
// //           </h2>
// //           <p className="text-3xl font-bold mt-2">0</p>
// //         </div>

// //         <div className="bg-green-600 text-white p-6 rounded-xl shadow-lg">
// //           <h2 className="text-xl font-semibold flex items-center gap-2">
// //             <GiTwoCoins className="text-3xl" />
// //            Popular QR
// //           </h2>
// //           <p className="text-3xl font-bold mt-2">Basantapur</p>
// //         </div>
// //         <div className="bg-green-600 text-white p-6 rounded-xl shadow-lg">
// //           <h2 className="text-xl font-semibold flex items-center gap-2">
// //             <GiTwoCoins className="text-3xl" />
// //             High Points
// //           </h2>
// //           <p className="text-3xl font-bold mt-2">Krishna</p>
// //         </div>
// //         <div className="bg-green-600 text-white p-6 rounded-xl shadow-lg">
// //           <h2 className="text-xl font-semibold flex items-center gap-2">
// //             <GiTwoCoins className="text-3xl" />
// //             Total Points
// //           </h2>
// //           <p className="text-3xl font-bold mt-2">{totalPoints}</p>
// //         </div>

// //         <div className="bg-purple-600 text-white p-6 rounded-xl shadow-lg">
// //           <h2 className="text-xl font-semibold flex items-center gap-2">
// //             {" "}
// //             <FaMapLocationDot className="text-3xl" /> Total Location Area
// //           </h2>
// //           <p className="text-3xl font-bold mt-2">{totalCategories}</p>
// //         </div>
// //       </div>

// //       {/* QR Codes Overview */}
// //       <h2 className="text-2xl font-bold mb-4">QR Codes Overview</h2>
// //       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
// //         {qrList.map((qr) => (
// //           <div
// //             key={qr.id}
// //             className="bg-white p-6 rounded-xl shadow hover:shadow-2xl transition-shadow"
// //           >
// //             <h3 className="text-xl font-bold mb-2">{qr.name}</h3>
// //             <p className="text-gray-600 mb-1">
// //               <strong>Location:</strong> {qr.latitude}, {qr.longitude}
// //             </p>
// //             <p className="text-gray-600 mb-1">
// //               <strong>Type:</strong> {qr.type}
// //             </p>
// //             <p className="text-gray-600 mb-1">
// //               <strong>Points:</strong> {qr.points}
// //             </p>
// //           </div>
// //         ))}
// //       </div>
// //     </div>
// //   );
// // }








// "use client";

// import React, { useEffect, useState } from "react";
// import { db } from "../firebase";
// import { ref, onValue } from "firebase/database";
// import { FaMapLocationDot } from "react-icons/fa6";
// import { GiTwoCoins } from "react-icons/gi";
// import { PiQrCodeFill } from "react-icons/pi";
// // import { subscribeToAnalytics } from "../analytics.firebase";

// export default function AnalyticsPage() {
//   const [qrList, setQrList] = useState([]);
//   const [totalPoints, setTotalPoints] = useState(0);
//   const [totalCategories, setTotalCategories] = useState(0);

//   const [analytics, setAnalytics] = useState({
//     totalQrScanned: 0,
//     mostScannedQr: { name: "-", scanCount: 0 },
//     topPlayer: { name: "-", points: 0 },
//   });

//   useEffect(() => {
//     // 1Listen to QR-Data
//     const qrDataRef = ref(db, "QR-Data");
//     const stopListeningQRData = onValue(qrDataRef, (snapshot) => {
//       const data = snapshot.val();
//       if (data) {
//         const qrArray = Object.keys(data)
//           .map((key) => ({ id: key, ...data[key] }))
//           .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

//         setQrList(qrArray);

//         const pointsSum = qrArray.reduce(
//           (sum, qr) => sum + Number(qr.points || 0),
//           0
//         );
//         setTotalPoints(pointsSum);
//       } else {
//         setQrList([]);
//         setTotalPoints(0);
//       }
//     });

//     // Listen to Categories
//     const categoriesRef = ref(db, "Categories");
//     const stopListeningCategories = onValue(categoriesRef, (snapshot) => {
//       const data = snapshot.val();
//       if (data) {
//         const categoryArray = Object.keys(data).map((key) => ({
//           id: key,
//           ...data[key],
//         }));
//         setTotalCategories(categoryArray.length);
//       } else {
//         setTotalCategories(0);
//       }
//     });


//     // Cleanup
//     return () => {
//       stopListeningQRData();
//       stopListeningCategories();
//       unsubscribeAnalytics();
//     };
//   }, []);

//   return (
//     <div className="p-8 h-screen">
//       <h1 className="text-3xl font-bold mb-6">Analytics Dashboard</h1>

//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
//         <div className="bg-blue-600 text-white p-6 rounded-xl shadow-lg">
//           <h2 className="text-xl font-semibold flex items-center gap-2">
//             <PiQrCodeFill className="text-3xl" /> Total QR Codes
//           </h2>
//           <p className="text-3xl font-bold mt-2">{qrList.length}</p>
//         </div>

//         <div className="bg-blue-600 text-white p-6 rounded-xl shadow-lg">
//           <h2 className="text-xl font-semibold flex items-center gap-2">
//             <PiQrCodeFill className="text-3xl" /> Total Scan QR Codes
//           </h2>
//           <p className="text-3xl font-bold mt-2">{analytics.totalQrScanned}</p>
//         </div>

//         <div className="bg-green-600 text-white p-6 rounded-xl shadow-lg">
//           <h2 className="text-xl font-semibold flex items-center gap-2">
//             <GiTwoCoins className="text-3xl" /> Popular QR
//           </h2>
//           <p className="text-3xl font-bold mt-2">{analytics.mostScannedQr.name}</p>
//         </div>

//         <div className="bg-green-600 text-white p-6 rounded-xl shadow-lg">
//           <h2 className="text-xl font-semibold flex items-center gap-2">
//             <GiTwoCoins className="text-3xl" /> High Points
//           </h2>
//           <p className="text-3xl font-bold mt-2">{analytics.topPlayer.name}</p>
//         </div>

//         <div className="bg-green-600 text-white p-6 rounded-xl shadow-lg">
//           <h2 className="text-xl font-semibold flex items-center gap-2">
//             <GiTwoCoins className="text-3xl" /> Total Points
//           </h2>
//           <p className="text-3xl font-bold mt-2">{totalPoints}</p>
//         </div>

//         <div className="bg-purple-600 text-white p-6 rounded-xl shadow-lg">
//           <h2 className="text-xl font-semibold flex items-center gap-2">
//             <FaMapLocationDot className="text-3xl" /> Total Location Area
//           </h2>
//           <p className="text-3xl font-bold mt-2">{totalCategories}</p>
//         </div>
//       </div>

//       {/* QR Codes Overview */}
//       <h2 className="text-2xl font-bold mb-4">QR Codes Overview</h2>
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
//         {qrList.map((qr) => (
//           <div
//             key={qr.id}
//             className="bg-white p-6 rounded-xl shadow hover:shadow-2xl transition-shadow"
//           >
//             <h3 className="text-xl font-bold mb-2">{qr.name}</h3>
//             <p className="text-gray-600 mb-1">
//               <strong>Location:</strong> {qr.latitude}, {qr.longitude}
//             </p>
//             <p className="text-gray-600 mb-1">
//               <strong>Type:</strong> {qr.type}
//             </p>
//             <p className="text-gray-600 mb-1">
//               <strong>Points:</strong> {qr.points}
//             </p>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }
