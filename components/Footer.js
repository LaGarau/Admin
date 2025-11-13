"use client";

import React from "react";

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <>
      <div className="py-4 text-white bg-slate-400 sticky bottom-0">
        <p className="text-md text-center">&copy; copyright under Lagarau {year} || All Rights Reserved</p>
      </div>
    </>
  );
};

export default Footer;
