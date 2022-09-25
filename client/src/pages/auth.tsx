import Head from "next/head";
import Script from "next/script";
import React, { useEffect, useState } from "react";
import Register from "../components/auth/register";
import Login from "../components/auth/login";
import { useRouter } from "next/router";
import { getAuthToken } from "../components/AuthToken";
import ResetPassword from "../components/auth/resetPassword";

// "@next/swc-win32-x64-msvc": "^12.1.5",

export default function AuthPage() {
  /*
   * Possible display states:
   * login
   * sign-up
   * reset-password
   */
  const [displayLogin, setDisplayLogin] = useState(true);
  const [displayState, setDisplayState] = useState("login");

  let displayedComponent;
  const toSignUp = () => setDisplayState("sign-up");
  const toLogin = () => setDisplayState("login");
  const toResetPassword = () => setDisplayState("reset-password");

  if (displayState == "login") {
    displayedComponent = <Login toSignUpCallback={toSignUp} toPasswordResetCallback={toResetPassword} />;
  } else if (displayState == "sign-up") {
    displayedComponent = <Register toLoginCallback={toLogin} toResetPasswordCallback={toResetPassword} />;
  } else if (displayState == "reset-password") {
    displayedComponent = <ResetPassword toLoginCallback={toLogin} toRegisterCallback={toSignUp} />;
  }

  return (
    <div className="flex flex-row justify-around pt-10 pb-20 min-h-screen h-full font-round bg-gray-100 items-center">
      <div className="hidden flex-col gap-y-10">
        <div className="w-32 h-32 bg-blue-800 rounded-full"></div>
        <h1 className=" font-bold text-4xl">Welcome to the future of note taking</h1>
        <div className="text-gray-500  font-bold italic">
          Join the revolution today: never lose your precious notes, available on all your devices 24/7.
        </div>

        <div className="text-gray-500  font-bold text-sm">
          Don’t want to miss any update ? Want to get in touch ? See our Twitter account!
        </div>
      </div>

      <div className="flex justify-center">{displayedComponent}</div>
    </div>
  );
}
