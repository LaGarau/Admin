"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { sidebarMenu } from "../components/SidebarMenu";

const Sidebar = () => {
  const pathname = usePathname();

  const isActive = (href) => pathname === href;

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:block bg-[#F5F7FA] sticky top-0 left-0 w-64 h-screen mx-5 rounded-2xl p-5 mt-5">
        {sidebarMenu.map((item, i) => (
          <Link href={item.href} key={i}>
            <li
              className={`p-3 flex my-4 items-center gap-4 rounded-xl cursor-pointer ${
                isActive(item.href)
                  ? "text-[#FF0100] font-semibold"
                  : "text-[#6C6F72] hover:bg-slate-600 hover:text-white"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-base">{item.name}</span>
            </li>
          </Link>
        ))}
      </aside>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#F5F7FA] shadow-lg border-t border-gray-300 z-50">
        <ul className="flex justify-around items-center py-2">
          {sidebarMenu.map((item, i) => (
            <Link href={item.href} key={i}>
              <li
                className={`flex flex-col items-center text-xs ${
                  isActive(item.href) ? "text-[#FF0100] font-semibold" : "text-gray-600"
                }`}
              >
                <span className="text-xl mb-1">{item.icon}</span>
                {item.name}
              </li>
            </Link>
          ))}
        </ul>
      </div>
    </>
  );
};

export default Sidebar;
