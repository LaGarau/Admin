"use client";
import React, { useEffect, useState } from "react";
import { Amita } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
// import Ghumantey from '../public/nav-ghumante.png'
import { IoIosSearch } from "react-icons/io";
import { IoSettingsOutline } from "react-icons/io5";
import { GoBell } from "react-icons/go";

const amitaFont = Amita({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-amita",
});

const Navbar = () => {
  // const user = "admin";
  return (
    <>
      <nav className="sticky top-0 z-50 bg-gradient-to-r from-blue-50 via-blue-300 to-blue-200">
        <div
          className="navbar  duration-500 b  flex justify-between
        px-5 sm:px-10 md:px-12 lg:px-10
        font-semibold"
        >
          <div className=" w-[23%] flex items-center justify-between">
            <Link href="/dashboard">
              <h1
                className="flex items-center space-x-3 text-lg sm:text-xl 
              md:text-2xl"
              >
                <img
                  className="h-16 sm:h-20 md:h-[100px]"
                  src="/NavLogo.png"
                  alt="Ghumante logo"
                />
              </h1>
            </Link>
          </div>

          <div className="w-full  flex items-center justify-between  ">
            <div className="w-[30%]">
              <h1>Hello Ghumantey 👋</h1>
              <p>Good Morning</p>
            </div>
            <div className="flex w-[50%]  h-auto justify-between items-center">
              <div className="flex items-center">
                <input
                  type="search"
                  name="search"
                  id="search"
                  className="bg-[#F5F7FA] float-end px-10 py-2.5 rounded-3xl"
                  placeholder="Search for something"
                />
                <IoIosSearch className="text-3xl absolute ml-2" />
              </div>
              <div className="bg-[#F5F7FA] rounded-4xl p-2  items-center">
                <IoSettingsOutline className="text-2xl" />
              </div>
              <div className="bg-[#F5F7FA] rounded-4xl  p-2 items-center">
                <GoBell className="text-2xl" />
              </div>
              <div className="bg-[#F5F7FA] rounded-4xl p-2  items-center">
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


      
    </>
  );
};

export default Navbar;
