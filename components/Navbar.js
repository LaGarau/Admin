"use client";
import React, { useState } from "react";
import Link from "next/link";
import { sidebarMenu } from "../components/SidebarMenu";
import { IoIosSearch } from "react-icons/io";

import { IoSettingsOutline } from "react-icons/io5";
import { GoBell } from "react-icons/go";

// Font import and variable definition kept, assuming it's used elsewhere
// in your main layout or global styles.
// const amitaFont = Amita({
//   subsets: ["latin"],
//   weight: ["400"],
//   variable: "--font-amita",
// });

const Navbar = () => {
  const [query, setQuery] = useState("");

  const filteredMenu = sidebarMenu.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <nav className="sticky top-0 z-50 bg-gradient-to-r from-blue-50 via-blue-300 to-blue-200 shadow-md">
        {/*
          The main container is now set to flex-col (stacked) by default (mobile),
          but reverts to the original desktop layout (md:flex justify-between)
        */}
        <div className="flex flex-col items-center md:flex-row md:justify-between px-5 sm:px-10 md:px-12 lg:px-10 font-semibold py-3">
          
          {/* 1. Logo and Mobile Icons (Top Row - Mobile Only) */}
          {/* On mobile, Logo takes full width and is centered, with icons on the right */}
          <div className="flex items-center justify-between w-full md:w-[23%]">
            <Link href="/dashboard">
              <h1 className="flex  items-center space-x-3 text-lg sm:text-xl md:text-2xl">
                <img
                  // Scaled down logo size for mobile, reverts to desktop size on md:
                  className="h-12 w-auto md:h-[100px]" 
                  src="/NavLogo.png"
                  alt="Ghumante logo"
                />
              </h1>
            </Link>

            {/* Icons visible on Mobile/Tablet only, hidden on Desktop (md:hidden) */}
            <div className="flex items-center gap-3 md:hidden">
              <div className="bg-[#F5F7FA] p-2 rounded-full cursor-pointer">
                <IoSettingsOutline className="text-xl" />
              </div>
              <div className="bg-[#F5F7FA] p-2 rounded-full cursor-pointer">
                <GoBell className="text-xl" />
              </div>
              <div className="cursor-pointer">
                <img
                  src="nav-ghumante.png"
                  alt="User Avatar"
                  className="w-8 h-8 rounded-full object-cover"
                />
              </div>
            </div>
          </div>
          
          {/* 2. Central Content (Greetings, Search - Second Row Mobile) */}
          <div className="w-full flex flex-col md:flex-row items-start justify-between mt-3 md:mt-0 md:w-full">
            
            {/* Greetings (Full width on mobile, left aligned) */}
            <div className="w-full md:w-[30%] flex items-center justify-center order-2 md:order-none"> 
              <h1 className="font-bold">Hello Ghumantey 👋</h1> 
              <p className="text-sm text-gray-600">Good Morning</p>
            </div>

            {/* Search and Desktop Icons Wrapper */}
            <div className="flex w-full h-auto items-center order-1 md:order-none mb-3 md:mb-0 md:w-[50%] md:justify-between">
              
              {/* SEARCH BOX & Dropdown */}
              <div className="flex items-center relative w-full md:w-auto md:flex-1">
                <div className="flex items-center relative w-full">
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    // Use rounded-full for better mobile look
                    className="bg-[#F5F7FA] px-10 py-2.5 rounded-full w-full focus:outline-none" 
                    placeholder="Search for something"
                  />
                  <IoIosSearch className="text-xl absolute left-3 text-gray-500" /> {/* Adjusted icon size for mobile */}

                  {/* SEARCH DROPDOWN BOX */}
                  {query.length > 0 && (
                    <div className="absolute top-full mt-2 left-0 w-full bg-white shadow-lg rounded-xl z-50 p-3 space-y-2 border border-gray-100">
                      {filteredMenu.length > 0 ? (
                        filteredMenu.map((item, i) => (
                          <Link
                            key={i}
                            href={item.href}
                            onClick={() => setQuery("")}
                            className="block p-2 hover:bg-gray-100 rounded-md text-sm"
                          >
                            {item.name}
                          </Link>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm">
                          No results found
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Desktop Icons (Hidden on Mobile: flex md:hidden is removed) */}
              {/* We keep the original structure for desktop alignment */}
              <div className="hidden md:flex items-center gap-3">
                <div className="bg-[#F5F7FA] rounded-full p-2 items-center">
                  <IoSettingsOutline className="text-2xl" />
                </div>
                <div className="bg-[#F5F7FA] rounded-full p-2 items-center">
                  <GoBell className="text-2xl" />
                </div>
                <div className="bg-[#F5F7FA] rounded-full p-2 items-center">
                  <img
                    src="nav-ghumante.png"
                    alt="User Avatar"
                    className="w-8 h-8 rounded-full"
                  />
                </div>
              </div>

            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;