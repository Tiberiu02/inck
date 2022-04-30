import Head from 'next/head'
import Script from 'next/script'
import React, { useState } from 'react'
import Cookies from 'universal-cookie'
import { authCookieName } from '../../../utils'




export default function Login({
  facebookCallback,
  googleCallback,
  toSignUpCallback
}) {

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")


  const login = async () => {
    const endpoint = process.env.NODE_ENV == "development" ?
      "http://localhost:8080/" : "http://inck.io/"
  
    const credentials = {
      email: email,
      password: password,
    }
  
  
    const response = await fetch(
      endpoint + "api/auth/login",
      {
        method: "post",
        body: JSON.stringify(credentials),
        headers: {
          "Content-type": "application/json;charset=UTF-8"
        },
      }
    )
    const jsonResponse = await response.json()

  
    if (response.status == 200) {
      alert("Successfully logged in")
      const cookies = new Cookies()
      const authContent = {
        email: jsonResponse.email,
        token: jsonResponse.token
      }
      cookies.set(
        authCookieName,
        authContent,
        {
          path: "/",
          withCredentials: true,
        }, // Allows the cookie to be accessible on all pages of the domain
      )
    } else {
      alert('Could not log in: ' + jsonResponse["error"])
    }
  }

  return (
    <div className="mx-5 max-w-sm">
      <h2 className="text-center font-bold text-4xl mb-5">
        Connect to Inck
      </h2>
      {/* Main pane */}
      <div className="bg-gray-50 rounded-xl py-5 px-10 shadow-md">
        <div className="flex flex-col items-center space-y-5">
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
        </div>
        {/* Separator */}
        <div className="flex items-center justify-between my-6">
          <div className="bg-gray-300 w-32 h-1"></div>
          <span className="uppercase font-extrabold text-gray-400 text-md tracking-widest">
            or
          </span>

          <div className="bg-gray-300 w-32 h-1"></div>

        </div>

        <div className="flex flex-col space-y-4">
          <input
            placeholder="Email address"
            className="bg-gray-200 placeholder-gray-400 text-gray-900 h-10 rounded-md px-3 font-bold focus:outline-none focus:ring-4 focus:ring-gray-300"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          ></input>
          <input
            placeholder="Password"
            type="password"
            className="bg-gray-200 placeholder-gray-400 text-gray-900 h-10 rounded-md px-3 font-bold focus:outline-none focus:ring-4 focus:ring-gray-300"
            value={password}
            onChange={(e) => setPassword(e.target.value)}></input>
          <button
            className="bg-green-500 hover:bg-green-400 hover:text-white text-green-100 w-full h-10 rounded-md font-bold tracking-wider text-sm"
            onClick={() => login(email, password)}
            >
            Sign in
          </button>
        </div>

        <div className="flex justify-end uppercase font-extrabold text-sm text-gray-500 mt-3">
          New to Inck ? Sign up
          <div
            onClick={toSignUpCallback}
            className="pl-1 underline decoration-gray-500 decoration decoration-[3px] hover:text-gray-600 hover:decoration-gray-600 cursor-pointer">
            here
          </div>
        </div>

      </div>
    </div>
  )
}