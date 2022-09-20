import Head from "next/head";
import { useState } from "react";
import { useRouter } from "next/router";
import Router from "next/router";
import { postFetchAPI } from "../components/GetApiPath";
import { disconnect } from "../components/AuthToken";

export default function ResetPassword() {
  const [newPass, setNewPass] = useState("");
  const [repeatPass, setRepeatPass] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  let token = "";
  let email = "";

  if (router.query) {
    token = router.query.token;
    email = router.query.email;
  }

  const sendResetRequest = async () => {
    if (newPass != repeatPass) {
      setError("Passwords don't match");
      setTimeout(() => setError(""), 10_000);
      return;
    }

    try {
      const result = await postFetchAPI("/api/auth/change-password", {
        newPassword: newPass,
        resetToken: token,
        email: email,
      });

      if (result.status == "success") {
        disconnect(false);
        Router.push("/auth");
      } else {
        setError("Error: " + result.error);
        setTimeout(() => setError(""), 10_000);
      }
    } catch (err) {
      console.log(err);
      setError("Impossible to reset password");
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
    <div>
      <Head>
        <title>Inck - Reset Password</title>
        <meta name="description" content="The only ink that you will ever need" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <div
          className={`${
            error == "" ? "hidden" : ""
          } absolute text-center bg-red-500 mt-2 ml-2 px-4 py-2 rounded-md shadow-md text-white`}
        >
          Error: {error}
        </div>
        <div className="flex items-center justify-center h-screen">
          <div className="flex flex-col items-center mx-5">
            <h2 className="font-semibold text-4xl mb-4">Reset password</h2>
            <h3 className="text-lg mb-8">Choose a new password to access your account</h3>

            <div className="flex flex-col w-full space-y-4">
              <input
                placeholder="New password"
                type="password"
                className={textFieldStyle}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
              />
              <input
                placeholder="Repeat new password"
                type="password"
                className={textFieldStyle}
                value={repeatPass}
                onChange={(e) => setRepeatPass(e.target.value)}
              />

              <button className={buttonStyle} onClick={sendResetRequest}>
                Reset password
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
