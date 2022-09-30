import { useRouter } from "next/router";
import React, { useState } from "react";
import { TrackLogin } from "../Analytics";
import { setAuthToken } from "../AuthToken";
import GetApiPath from "../GetApiPath";

export default function Login({ toSignUpCallback, toPasswordResetCallback }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const login = async () => {
    setError("");

    const endpoint = GetApiPath("/api/auth/login");
    console.log(endpoint);

    const credentials = {
      email: email,
      password: password,
    };

    const response = await fetch(endpoint, {
      method: "post",
      body: JSON.stringify(credentials),
      headers: {
        "Content-type": "application/json;charset=UTF-8",
      },
    });
    const jsonResponse = await response.json();

    if (response.status == 200) {
      TrackLogin(email);
      setAuthToken(jsonResponse.token);
      router.reload();
    } else {
      setError("Error: " + jsonResponse["error"]);
      setTimeout(() => setError(""), 10_000);
    }
  };

  const textFieldStyle =
    "bg-white placeholder-gray-400 text-gray-900 h-10 rounded-md shadow-md px-3 focus:outline-none focus:ring-4 focus:ring-gray-300";
  const buttonStyle =
    "bg-primary hover:bg-primary-light hover:shadow-sm duration-100 text-white w-full h-10 rounded-md shadow-lg font-bold tracking-wider text-sm";
  const undelineStyle =
    "pl-1 underline decoration-gray-500 decoration underline-offset-2 decoration-[2px] hover:text-gray-800 hover:decoration-gray-800 cursor-pointer";

  return (
    <div className="flex flex-col items-center mx-5 w-72">
      <h2 className="font-semibold text-4xl mb-4">Sign in</h2>
      <h3 className="text-lg mb-8">Connect to your Inck account</h3>
      {/* Main pane
      <div className="hidden flex flex-col items-center space-y-5">
        <button
          onClick={facebookCallback}
          className=" bg-blue-800 text-blue-50 w-full h-10 rounded-md font-bold tracking-wider hover:bg-blue-600 hover:text-white text-sm">
          Connect with Facebook
        </button>
        <button
          onClick={googleCallback}
          className="bg-red-600 hover:bg-red-500 hover:text-white text-red-50 w-full h-10 rounded-md font-bold tracking-wider text-sm">
          Connect with Google
        </button>

        <div className="flex items-center justify-between my-6">
          <div className="bg-gray-300 w-32 h-[2px]"></div>
          <span className="uppercase font-extrabold text-gray-400 text-md tracking-widest px-3">
            or
          </span>

          <div className="bg-gray-300 w-32 h-[2px]"></div>

        </div>
      </div> */}

      <div className="flex flex-col w-full space-y-4">
        <input
          placeholder="Email address"
          className={textFieldStyle}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          placeholder="Password"
          type="password"
          className={textFieldStyle}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div
          className={`${error == "" ? "hidden" : ""} text-center bg-red-500 w-full p-2 rounded-md shadow-md text-white`}
        >
          {error}
        </div>

        <button className={buttonStyle} onClick={() => login()}>
          Sign in
        </button>
      </div>

      <div className="flex flex-col gap-y-2 justify-end self-end h-fit mt-4">
        <div className="flex justify-end self-end font-extrabold text-sm text-gray-500">
          No account?
          <div onClick={toSignUpCallback} className={undelineStyle}>
            {" "}
            SIGN UP{" "}
          </div>
        </div>

        <div className="flex justify-end self-end font-extrabold text-sm text-gray-500">
          Forgot password?
          <div onClick={toPasswordResetCallback} className={undelineStyle}>
            {" "}
            RESET{" "}
          </div>
        </div>
      </div>
    </div>
  );
}
