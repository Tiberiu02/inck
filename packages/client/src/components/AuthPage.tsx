import React, { useEffect, useState } from "react";
import Register from "./auth/register";
import Login from "./auth/login";
import ResetPassword from "./auth/resetPassword";
import { getAuthToken } from "./AuthToken";
import Router from "next/router";
import Head from "next/head";

// "@next/swc-win32-x64-msvc": "^12.1.5",

export default function AuthPage() {
  enum States {
    LOGIN,
    SIGN_UP,
    RESET_PASSWORD,
  }

  const [state, setState] = useState(States.LOGIN);

  let displayedComponent;
  const toSignUp = () => setState(States.SIGN_UP);
  const toLogin = () => setState(States.LOGIN);
  const toResetPassword = () => setState(States.RESET_PASSWORD);

  if (state == States.LOGIN) {
    displayedComponent = <Login toSignUpCallback={toSignUp} toPasswordResetCallback={toResetPassword} />;
  } else if (state == States.SIGN_UP) {
    displayedComponent = <Register toLoginCallback={toLogin} toResetPasswordCallback={toResetPassword} />;
  } else if (state == States.RESET_PASSWORD) {
    displayedComponent = <ResetPassword toLoginCallback={toLogin} toRegisterCallback={toSignUp} />;
  }

  const pageTitle = {
    [States.LOGIN]: "Inck - Log in",
    [States.SIGN_UP]: "Inck - Sign up",
    [States.RESET_PASSWORD]: "Inck - Reset password",
  };

  return (
    <div>
      <Head>
        <title>{pageTitle[state]}</title>
        <meta name="description" content="The only ink that you will ever need" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

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
    </div>
  );
}
