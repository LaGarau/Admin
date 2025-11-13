"use client";
import React, { useEffect, useState } from "react";
import { Amita } from "next/font/google";
import Image from "next/image";
import Link from "next/link";


const amitaFont = Amita({
  subsets: ["latin"],
  weight:["400"],
  variable: "--font-amita",
});

const Navbar = () => {
  const handleLogout = () => {
    logout();
    toast.success("Logout Successfully");
    navigate("/");
  };



 

  const user = "admin";
  return (
    <>
      <div
        className={`navbar ${amitaFont.variable} sticky top-0 duration-500 ${
          isScrolled ? "bg-[#FBFBFD] shadow-lg" : "bg-[#FBFBFD]"
        } flex justify-between
        
         px-5 sm:px-10 md:px-12 lg:px-15
         py-5  
         z-100  
         font-semibold`}
      >
        <div>
          <Link href="/dashboard">
            <h1 className="flex items-center space-x-3 text-lg sm:text-xl md:text-2xl">
              <img
                className="h-16 sm:h-20 md:h-[100px]"
                src="/ghumante.png"
                alt="Ghumante logo"
              />
              <div className="flex flex-col leading-tight">
                <span className="custom-title">Ghumante</span>
                <span className="text-[#784E9A] font-heading">युवा</span>
              </div>
            </h1>
          </Link>
        </div>

        <div className="details flex gap-6 items-center">
          {!user ? (
          <>
            <button
                
                className="text-[#784E9A] hover:text-purple-500 font-semibold
                text-sm sm:text-lg md:text-lg
                "
              >
                Login
              </button>
          </>
          ) : (
            <>
              <h5 className="text-xs sm:text-md md:text-lg ">
                Welcome, <span className="custom-title">{user}</span>
              </h5>
              <button
                onClick={handleLogout}
                className="text-[#784E9A] hover:text-purple-500 font-semibold
                text-sm sm:text-lg md:text-lg
                "
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Navbar;
