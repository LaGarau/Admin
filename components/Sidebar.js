"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaHome, FaUsers, FaChartBar } from "react-icons/fa";
import { LuChartLine } from "react-icons/lu";
import { MdOutlinePostAdd, MdOutlineQrCode2 } from "react-icons/md";
import { MdCategory } from "react-icons/md";

const Sidebar = () => {
  const pathname = usePathname(); // get current path

  // helper to check active route
  const isActive = (href) => pathname === href;

  return (
    <aside className="bg-gray-900 text-white w-64 min-h-screen p-5 sticky to-0% ">
      <h1 className="flex items-center space-x-1 text-md sm:text-xl md:text-2xl">
        <img
          className="h-15 sm:h-20 md:h-[100px]"
          src="/ghumante.png"
          alt="Ghumante logo"
        />
        <div className="flex flex-col leading-tight">
          <span className="custom-title">Ghumante</span>
          <span className="text-[#784E9A] font-heading">युवा</span>
        </div>
      </h1>
      <hr />

      <ul className="space-y-4 mt-5">
        <Link href="/addQR" className="">
          <li
            className={`p-2 flex my-4 items-center gap-2 rounded-xl ${
              isActive("/addQR") ? "bg-green-600" : "hover:bg-slate-600"
            }`}
          >
            <MdOutlinePostAdd className="text-2xl" /> Generate QR
          </li>
        </Link>

        <Link href="/qrData" className="">
          <li
            className={`p-2 flex my-4 items-center gap-2 rounded-xl ${
              isActive("/qrData") ? "bg-green-600" : "hover:bg-slate-600"
            }`}
          >
            <MdOutlineQrCode2 className="text-2xl" /> QR Data
          </li>
        </Link>

        <Link href="/addCategoryPage" className="">
          <li
            className={`p-2 flex my-4 items-center gap-2 rounded-xl ${
              isActive("/addCategoryPage")
                ? "bg-green-600"
                : "hover:bg-slate-600"
            }`}
          >
            <MdCategory className="text-2xl" /> Add Location Category
          </li>
        </Link>

        <Link href="/viewCategory" className="">
          <li
            className={`p-2 flex my-4 items-center gap-2 rounded-xl ${
              isActive("/viewCategory") ? "bg-green-600" : "hover:bg-slate-600"
            }`}
          >
            <FaChartBar className="text-2xl" /> View Location Category
          </li>
        </Link>

        <Link href="/qrType" className="">
          <li
            className={`p-2 flex my-4 items-center gap-2 rounded-xl ${
              isActive("/qrType") ? "bg-green-600" : "hover:bg-slate-600"
            }`}
          >
            <MdCategory className="text-2xl" /> Add Qr Category
          </li>
        </Link>

        <Link href="/viewQrCategory" className="">
          <li
            className={`p-2 flex my-4 items-center gap-2 rounded-xl ${
              isActive("/viewQrCategory")
                ? "bg-green-600"
                : "hover:bg-slate-600"
            }`}
          >
            <FaChartBar className="text-2xl" /> View QR Category
          </li>
        </Link>

        {/* <Link href="/analytics" className="">
          <li
            className={`p-2 flex my-4 items-center gap-2 rounded-xl ${
              isActive("/analytics") ? "bg-green-600" : "hover:bg-slate-600"
            }`}
          >
            <FaChartBar className="text-2xl" /> Analytics
          </li>
        </Link> */}
        {/* <Link href="/analytics" className="">
          <li
            className={`p-2 flex my-4 items-center gap-2 rounded-xl ${
              isActive("/analytics") ? "bg-green-600" : "hover:bg-slate-600"
            }`}
          >
            <LuChartLine className="text-2xl" /> QR Code Analytics
          </li>
        </Link> */}

       
      </ul>
    </aside>
  );
};

export default Sidebar;
