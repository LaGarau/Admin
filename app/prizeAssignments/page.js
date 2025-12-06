"use client";



import React, { useEffect, useState } from "react";

import { realtimeDb } from "@/lib/firebase";

import { ref, onChildAdded, push, update, get, onValue } from "firebase/database";



const PrizeAssignments = () => {

  const [assignedPrizes, setAssignedPrizes] = useState([]);



  // Fetch Assigned Prizes

  useEffect(() => {

    const statusRef = ref(realtimeDb, "PrizeStatus");

    const unsubscribe = onValue(statusRef, (snapshot) => {

      const data = snapshot.val();

      if (data) {

        const arr = Object.entries(data).map(([id, values]) => ({ id, ...values }));

        setAssignedPrizes(arr);

      }

    });

    return () => unsubscribe();

  }, []);



  // Listen for new scanned QR codes

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



        // Fetch latest prize codes

        const prizeSnap = await get(ref(realtimeDb, "PrizeCodes"));

        const prizeList = Object.entries(prizeSnap.val() || {}).filter(([_, p]) => !p.used);



        if (prizeList.length === 0) {

          await sendNotification(username, scan.qrName, null, false);

          await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), { processed: true });

          return;

        }



        // Pick a random unused prize

        const randomIndex = Math.floor(Math.random() * prizeList.length);

        const [prizeId, prize] = prizeList[randomIndex];



        // Mark prize as used

        await update(ref(realtimeDb, `PrizeCodes/${prizeId}`), { used: true });



        // Assign prize to user

        await push(ref(realtimeDb, "PrizeStatus"), {

          userId: scan.userId,

          username,

          prizeCode: prize.code,

          prizeCodeId: prizeId,

          assignedAt: new Date().toISOString(),

          qrName: scan.qrName || "",

        });



        // Update user's winning status

        await update(ref(realtimeDb, `UsersWinningStatus/${scan.userId}`), {

          won: true,

          prizeCode: prize.code,

          prizeId,

          qrName: scan.qrName || "",

          wonAt: Date.now(),

        });



        // Send notification

        await sendNotification(username, scan.qrName, prize.code, false);



        // Mark scan as processed

        await update(ref(realtimeDb, `scannedQRCodes/${scanId}`), { processed: true });

      } catch (error) {

        console.error("Error assigning prize:", error);

      }

    });



    return () => unsubscribe();

  }, []);



  return (

    <div className="p-6">

      <h2 className="font-bold text-xl mb-4">Assigned Prizes</h2>

      <div className="overflow-x-auto">

        <table className="w-full text-left border-collapse border">

          <thead>

            <tr className="bg-gray-200">

              <th className="p-2 border">Username</th>

              <th className="p-2 border">Prize Code</th>

              <th className="p-2 border">Assigned At</th>

            </tr>

          </thead>

          <tbody>

            {assignedPrizes.map((item) => (

              <tr key={item.id}>

                <td className="p-2 border">{item.username}</td>

                <td className="p-2 border">{item.prizeCode}</td>

                <td className="p-2 border">{new Date(item.assignedAt).toLocaleString()}</td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>

  );

};



export default PrizeAssignments;




