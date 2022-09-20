import Head from "next/head";
import {
  FaAngleDown,
  FaAngleRight,
  FaPencilAlt,
  FaSearch,
  FaRegQuestionCircle,
  FaRegUserCircle,
  FaRegUser,
  FaRegSun,
  FaRegClock,
  FaUsers,
  FaBookmark,
  FaTrash,
  FaBook,
  FaFolder,
  FaFolderOpen,
  FaRegWindowClose,
  FaExchangeAlt,
  FaBars,
} from "react-icons/fa";

import { authCookieName, getAuthToken, setAuthToken, disconnect } from "../components/AuthToken";
import React, { useState, useEffect, useRef } from "react";
import GetApiPath, { postFetchAPI } from "../components/GetApiPath";
import Link from "next/link";

function UserDetails({}) {
  const [detailsFetched, setDetailsFetched] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const MSG_DISPLAY_TIME = 10_000;

  const setTempError = (msg) => {
    setError(msg);
    setTimeout(() => setError(""), MSG_DISPLAY_TIME);
  };

  const fetchAccountDetails = async () => {
    try {
      const json = await postFetchAPI("/api/settings/account-details", { token: getAuthToken() });
      console.log(json);
      if (json == null) {
        setError("Unable to fetch account details (11)");
      }

      setFirstName(json.firstName);
      setLastName(json.lastName);
      setEmail(json.email);
      setDetailsFetched(true);
    } catch (err) {
      setTempError("Unable to fetch account details");
    }
  };

  const resetPassword = async () => {
    try {
      const json = await postFetchAPI("/api/auth/reset-password-with-token", { token: getAuthToken() });
      if (json.status == "success") {
        setSuccessMessage("Please check your email");
      } else {
        setTempError("Unable to reset password");
      }
    } catch (err) {
      setTempError("Unable to reset password");
    }
  };

  useEffect(() => {
    fetchAccountDetails();
  }, []);

  return (
    <div className="flex flex-col px-10 py-6">
      <h2 className="text-3xl mb-6 w-fit">Account details</h2>

      {detailsFetched && (
        <div className="flex flex-col gap-4">
          <div>First name: {firstName}</div>
          <div>Last name: {lastName}</div>
          <div>Email address: {email}</div>
          <div>Password: *********</div>
          {successMessage == "" && (
            <button
              onClick={resetPassword}
              className="text-l h-8 bg-gray-200 font-medium hover:text-slate-50 hover:bg-slate-800 flex items-center justify-center rounded-md px-10 w-fit"
            >
              Reset password
            </button>
          )}
          <div
            className={`${
              successMessage == "" ? "hidden" : ""
            } px-10 bg-green-500 py-2 rounded-md shadow-md text-white w-fit`}
          >
            {successMessage}
          </div>
          <div className={`${error == "" ? "hidden" : ""} px-10 bg-red-500 py-2 rounded-md shadow-md text-white w-fit`}>
            Error: {error}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  return (
    <div>
      <Head>
        <title>Inck - Settings</title>
        <meta name="description" content="The only ink that you will ever need" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="font-round">
        <div className="relative flex flex-col w-[100vw] h-[100vh]">
          {/** Top bar */}
          <div className="flex flex-row gap-10 sm:gap-10 justify-between h-16 items-center px-4 sm:px-6 border-b-[1px] bg-white border-gray-300">
            <div className="hidden sm:flex flex-row gap-3 items-center text-gray-800">
              <FaPencilAlt className="text-2xl" />
              <p className="font-extrabold tracking-wider text-2xl text-gr mt-[0.1rem]">Inck</p>
            </div>

            {/* Spacer invisible div */}
            <div className="w-full" />

            <div className="flex flex-row gap-2">
              {/*
              <a
                href="faq"
                className="hover:bg-gray-300 flex 
                        items-center justify-center w-10 h-10 rounded-full
                        cursor-pointer"
              >
                <FaRegQuestionCircle className="text-2xl" />
              </a>
                */}
              <Link href="/explorer">
                <a className="hover:bg-gray-300 flex items-center justify-center w-10 h-10 rounded-full cursor-pointer">
                  <span className="material-symbols-outlined text-2xl">folder</span>
                </a>
              </Link>
              <button
                onClick={disconnect}
                className="hover:bg-gray-300 flex items-center justify-center w-10 h-10 rounded-full"
              >
                <span className="material-symbols-outlined text-2xl">logout</span>
              </button>
            </div>
          </div>
          {/* Main body */}
          <div className="flex h-full w-full">
            {/* Side bar TODO: add responsive bar */}
            <div className="hidden sm:block h-full w-[15rem] border-r-2">
              <div className="flex space-x-0 gap-x-2 items-center justify-center bg-gray-200 py-3">
                <FaRegUserCircle fontSize={24} />
                <p className="font-semibold">Account details</p>
              </div>
            </div>
            {/* Main body */}
            <div>
              <UserDetails />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
