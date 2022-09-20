import Head from "next/head";
import Script from "next/script";
import React, { useState } from "react";

export default function DropDown({ title, children }) {
  const [display, setDisplay] = useState(false);
  const toggle = () => setDisplay(!display);
  return (
    <div className=" flex flex-col" onClick={toggle}>
      {/* Dropdown header */}
      <div className="bg-red-500 rounded-md w-72 h-10 justify-center flex flex-row items-center">
        {title}
        <svg
          className="ml-2 w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>
      {/* Dropdown content */}

      <div className={(display ? "" : "hidden") + ""}>{children}</div>
    </div>
  );
}
