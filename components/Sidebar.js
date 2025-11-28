"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaHome, FaUsers, FaChartBar } from "react-icons/fa";
import { MdOutlinePostAdd, MdOutlineQrCode2 } from "react-icons/md";
import { MdCategory } from "react-icons/md";
import { MdTipsAndUpdates } from "react-icons/md";
import { TbDeviceDesktopAnalytics } from "react-icons/tb";

// --
import { TbHomeFilled } from "react-icons/tb";
import { BiSolidCategory } from "react-icons/bi";
import { SiGooglecloudstorage } from "react-icons/si";

const Sidebar = () => {
  const pathname = usePathname(); // get current path

  // helper to check active route
  const isActive = (href) => pathname === href;

  return (
   <aside className="bg-[#F5F7FA] sticky top-0 left-0 w-67 h-fit mx-5 rounded-2xl p-5 mt-5">


      <ul className="space-y-2 ">
        <Link href="#" className="">
          <li
            className={`p-2 flex my-4 text-[#6C6F72] items-center gap-4 rounded-xl ${
              isActive("/#") ? "text-[#FF0100]" : "hover:bg-slate-600  hover:text-white"
            }`}
          >
            <TbHomeFilled className="text-2xl" /> Dashboard
          </li>
        </Link>
        <Link href="/addQR" className="">
          <li
            className={`p-2 flex my-4 items-center text-[#6C6F72] gap-4 rounded-xl ${
              isActive("/addQR") ? "text-[#FF0100]" : "hover:bg-slate-600  hover:text-white"
            }`}
          >
            <BiSolidCategory className="text-2xl" /> Generate QR
          </li>
        </Link>

        <Link href="/qrData" className="">
          <li
            className={`p-2 flex my-4 items-center text-[#6C6F72] gap-4 rounded-xl ${
              isActive("/qrData") ? "text-[#FF0100]" : "hover:bg-slate-600  hover:text-white"
            }`}
          >
            <SiGooglecloudstorage className="text-2xl" /> QR Data
          </li>
        </Link>

        <Link href="/addCategoryPage" className="">
          <li
            className={`p-2 flex my-4 items-center text-[#6C6F72] gap-4 rounded-xl ${
              isActive("/addCategoryPage")
                ? "text-[#FF0100]"
                : "hover:bg-slate-600  hover:text-white"
            }`}
          >
            <MdCategory className="text-2xl" /> Add Location Category
          </li>
        </Link>

        <Link href="/viewCategory" className="">
          <li
            className={`p-2 flex my-4 items-center text-[#6C6F72] gap-4 rounded-xl ${
              isActive("/viewCategory")
                ? "text-[#FF0100]"
                : "hover:bg-slate-600  hover:text-white"
            }`}
          >
            <FaChartBar className="text-2xl" /> View Location Category
          </li>
        </Link>

        <Link href="/qrType" className="">
          <li
            className={`p-2 flex my-4 items-center text-[#6C6F72] gap-4 rounded-xl ${
              isActive("/qrType") ? "text-[#FF0100]" : "hover:bg-slate-600  hover:text-white"
            }`}
          >
            <MdCategory className="text-2xl" /> Manage Qr Category
          </li>
        </Link>

        <Link href="/liveData" className="">
          <li
            className={`p-2 flex my-4 items-center text-[#6C6F72] gap-4 rounded-xl ${
              isActive("/liveData") ? "text-[#FF0100]" : "hover:bg-slate-600  hover:text-white"
            }`}
          >
            <MdTipsAndUpdates className="text-2xl" /> Live Data
          </li>
        </Link>

        <Link href="/analytics" className="">
          <li
            className={`p-2 flex my-4 items-center text-[#6C6F72] gap-4 rounded-xl ${
              isActive("/analytics") ? "text-[#FF0100]" : "hover:bg-slate-600  hover:text-white"
            }`}
          >
            <TbDeviceDesktopAnalytics className="text-2xl" /> Analytics Log
          </li>
        </Link>

        <Link href="/heatmaps" className="">
          <li
            className={`p-2 flex my-4 items-center gap-4 text-[#6C6F72] rounded-xl ${
              isActive("/heatmaps") ? "text-[#FF0100]" : "hover:bg-slate-600  hover:text-white"
            }`}
          >
            <FaChartBar className="text-2xl" /> HeatMaps
          </li>
        </Link>
      </ul>
    </aside>
  );
};

export default Sidebar;
