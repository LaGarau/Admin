"use client";

import { Geist, Geist_Mono } from "next/font/google";
import { Amita } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        {/* <div className="flex"> */}
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 md:ml-0 ml-0 p-4 md:p-8 ">
            {children}
          </main>
        </div>
        {/* </div> */}
      </body>
    </html>
  );
}
