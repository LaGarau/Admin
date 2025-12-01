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

import { sidebarMenu } from "../components/SidebarMenu"


const Sidebar = () => {
  const pathname = usePathname(); // get current path

  // helper to check active route
  const isActive = (href) => pathname === href;

  return (
   <aside className="bg-[#F5F7FA] sticky top-0 left-0 w-67 h-fit mx-5 rounded-2xl p-5 mt-5">


     {sidebarMenu.map((item, i) => (
  <Link href={item.href} key={i}>
    <li
      className={`p-2 flex my-4 items-center gap-4 rounded-xl ${
        isActive(item.href)
          ? "text-[#FF0100]"
          : "text-[#6C6F72] hover:bg-slate-600 hover:text-white"
      }`}
    >
      {item.icon} {item.name}
    </li>
  </Link>
))}

    </aside>
  );
};

export default Sidebar;
