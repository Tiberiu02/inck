import { useRouter } from "next/router";
import Router from "next/router";
import React, { useState } from "react";
import { disconnect, getAuthToken, setAuthToken } from "../AuthToken";
import GetApiPath, { postFetchAPI } from "../GetApiPath";

export default function ResetPassword({ toLoginCallback, toRegisterCallback }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  let [finished, setFinished] = useState(false);

  const resetPassword = () => {
    postFetchAPI("/api/auth/reset-password-with-email", { email });
    setFinished(true);
  };

  const textFieldStyle =
    "bg-white placeholder-gray-400 text-gray-900 h-10 rounded-md shadow-md px-3 focus:outline-none focus:ring-4 focus:ring-gray-300";
  const buttonStyle =
    "bg-primary hover:bg-primary-light hover:shadow-sm duration-100 text-white w-full h-10 rounded-md shadow-lg font-bold tracking-wider text-sm";
  const undelineStyle =
    "pl-1 underline decoration-gray-500 decoration underline-offset-2 decoration-[2px] hover:text-gray-800 hover:decoration-gray-800 cursor-pointer";

  return (
    <div className="flex flex-col items-center mx-5">
      <h2 className="font-semibold text-4xl mb-4">Forgot your password?</h2>
      <h3 className="text-lg mb-8">Enter your emaill to reset your password</h3>

      {finished ? (
        <div className="bg-primary text-white w-96 p-6 rounded-2xl shadow-md">
          Your password reset was initiated. Please check your email for further instructions.
        </div>
      ) : (
        <div className="flex flex-col w-full space-y-4">
          <input
            placeholder="Email address"
            className={textFieldStyle}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div
            className={`${
              error == "" ? "hidden" : ""
            } text-center bg-red-500 w-full p-2 rounded-md shadow-md text-white`}
          >
            {error}
          </div>

          <button className={buttonStyle} onClick={resetPassword}>
            Reset password
          </button>
        </div>
      )}

      <div className="flex flex-col gap-y-2 justify-end self-end h-fit mt-6">
        <div className="flex justify-end self-end font-extrabold text-sm text-gray-500">
          No account?
          <div onClick={toRegisterCallback} className={undelineStyle}>
            {" "}
            SIGN UP{" "}
          </div>
        </div>

        <div className="flex justify-end self-end font-extrabold text-sm text-gray-500">
          Remember your password?
          <div onClick={toLoginCallback} className={undelineStyle}>
            {" "}
            LOG IN{" "}
          </div>
        </div>
      </div>
    </div>
  );
}
