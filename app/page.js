"use client";

import Image from "next/image";
import Ghumante from "../public/Ghumante_logo.png";

export default function Home() {
  return (
    <div className="flex items-center justify-center bg-gradient-to-r from-blue-100 to-blue-200 h-screen">
      <div className="w-[100%] sm:w-[55%] md:w-[65%] lg:w-[100%] bg-black p-7 md:p-10 h-screen  shadow-lg flex flex-col items-center">
        {/* Use Next.js Image component */}
        <Image src={Ghumante} alt="Ghumante Logo" width={350} height={350} />

       
      </div>
    </div>
  );
}
