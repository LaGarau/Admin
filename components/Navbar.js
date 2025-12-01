"use client";
import React, { useState } from "react";
import Link from "next/link";
import { sidebarMenu } from "../components/SidebarMenu";
import { IoIosSearch } from "react-icons/io";

import { Amita } from "next/font/google";
import Image from "next/image";
import Ghumantey from "../public/nav-ghumante.png";
import { IoSettingsOutline } from "react-icons/io5";
import { GoBell } from "react-icons/go";
const amitaFont = Amita({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-amita",
});

const Navbar = () => {
  const [query, setQuery] = useState("");

  const filteredMenu = sidebarMenu.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <nav className="sticky top-0 z-50 bg-gradient-to-r from-blue-50 via-blue-300 to-blue-200">
        <div className="navbar duration-500 b flex justify-between px-5 sm:px-10 md:px-12 lg:px-10 font-semibold">
          <div className=" w-[23%] flex items-center justify-between">
            <Link href="/dashboard">
              <h1 className="flex items-center space-x-3 text-lg sm:text-xl md:text-2xl">
                <img
                  className="h-16 sm:h-20 md:h-[100px]"
                  src="/NavLogo.png"
                  alt="Ghumante logo"
                />
              </h1>
            </Link>
          </div>
          <div className="w-full flex items-center justify-between ">
            <div className="w-[30%]">
              <h1>Hello Ghumantey 👋</h1> <p>Good Morning</p>
            </div>
            <div className="flex w-[50%] h-auto justify-between items-center">
              <div className=" flex items-center justify-between relative">
                {/* SEARCH BOX */}
                <div className="flex items-center  relative">
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="bg-[#F5F7FA] px-10 py-2.5 rounded-3xl w-full"
                    placeholder="Search for something"
                  />
                  <IoIosSearch className="text-3xl absolute left-2" />

                  {/* SEARCH DROPDOWN BOX */}
                  {query.length > 0 && (
                    <div className="absolute top-14 left-0 w-full bg-white shadow-lg rounded-xl z-50 p-3 space-y-2">
                      {filteredMenu.length > 0 ? (
                        filteredMenu.map((item, i) => (
                          <Link
                            key={i}
                            href={item.href}
                            onClick={() => setQuery("")}
                            className="block p-2 hover:bg-gray-100 rounded-md"
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

                {/* Right section remains same */}
                <div className="flex items-center gap-4">{/* icons */}</div>
              </div>
              <div className="bg-[#F5F7FA] rounded-4xl p-2 items-center">
                <IoSettingsOutline className="text-2xl" />
              </div>
              <div className="bg-[#F5F7FA] rounded-4xl p-2 items-center">
                <GoBell className="text-2xl" />
              </div>
              <div className="bg-[#F5F7FA] rounded-4xl p-2 items-center">
                <img
                  src="nav-ghumante.png"
                  alt="img"
                  className="w-8 h-8 rounded-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* <nav className="sticky top-0 z-50 bg-gradient-to-r from-blue-50 via-blue-300 to-blue-200">
        <div className="navbar flex justify-between px-5">
          <div className="w-[23%] flex items-center justify-between">
            <Link href="/dashboard">
              <img className="h-16" src="/NavLogo.png" alt="Ghumante" />
            </Link>
          </div>

          <div className="w-full flex items-center justify-between relative">
            
            <div className="flex items-center w-[30%] relative">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-[#F5F7FA] px-10 py-2.5 rounded-3xl w-full"
                placeholder="Search for something"
              />
              <IoIosSearch className="text-3xl absolute left-2" />

           
              {query.length > 0 && (
                <div className="absolute top-14 left-0 w-full bg-white shadow-lg rounded-xl z-50 p-3 space-y-2">
                  {filteredMenu.length > 0 ? (
                    filteredMenu.map((item, i) => (
                      <Link
                        key={i}
                        href={item.href}
                        onClick={() => setQuery("")}
                        className="block p-2 hover:bg-gray-100 rounded-md"
                      >
                        {item.name}
                      </Link>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No results found</p>
                  )}
                </div>
              )}
            </div>

           
            <div className="flex items-center gap-4">icons</div>
          </div>
        </div>
      </nav> */}
    </>
  );
};

export default Navbar;
