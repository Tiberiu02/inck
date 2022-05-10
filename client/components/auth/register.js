import Head from 'next/head'
import Script from 'next/script'
import React, { useState } from 'react'
import Cookies from 'universal-cookie'
import { authCookieName } from '../../../utils'




export default function Register({
  toLoginCallback,
}) {

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [repeatedPass, setRepeatedPass] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [subscribeUpdates, setSubscribeUpdates] = useState(false)
  const toggleTerms = () => setAcceptTerms(!acceptTerms)
  const toggleUpdates = () => setSubscribeUpdates(!subscribeUpdates)



  const register = async () => {
    const endpoint = process.env.NODE_ENV == "development" ?
      "http://localhost:8080/" : "http://inck.io/"

    const credentials = {
      firstName: firstName,
      lastName: lastName,
      email: email,
      password: password,
    }


    const response = await fetch(
      endpoint + "api/auth/register",
      {
        method: "post",
        body: JSON.stringify(credentials),
        headers: {
          "Content-type": "application/json;charset=UTF-8"
        },
        credentials: 'include',
      }
    )
    const jsonResponse = await response.json()

    if (response.status == 201) {
      alert("Account created")
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
      alert('Acount could not be created: ' + jsonResponse["error"])
    }
  }

  const textFieldStyle = "bg-gray-200 placeholder-gray-400 text-gray-900 h-10 rounded-md px-3 font-bold focus:outline-none focus:ring-4 focus:ring-gray-300"
  return (
    <div className="mx-5 max-w-2xl">
      <h2 className="text-center font-bold text-4xl mb-5">
        Create an account
      </h2>
      {/* Main pane */}
      <div className="flex flex-col bg-gray-50 rounded-xl py-5 px-10 shadow-md space-y-6">
        <div className="flex flex-row  justify-between gap-6">
          <input
            className={textFieldStyle}
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          ></input>
          <input
            className={textFieldStyle}
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          ></input>
        </div>

        <input
          className={textFieldStyle}
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        ></input>

        <input
          className={textFieldStyle}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          className={textFieldStyle}
          type="password"
          placeholder="Repeat password"
          value={repeatedPass}
          onChange={(e) => setRepeatedPass(e.target.value)}
        />

        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            className="accent-green-500 h-10"
            checked={acceptTerms}
            onChange={toggleTerms}
          />
          <div
            className="text-justify text-gray-500 font-bold text-sm"
            onClick={toggleTerms}
          >I have read and accept Inck&apos;s terms of service</div>
        </div>

        <div
          className="flex items-center space-x-3 text-gray-500 font-bold text-sm"
          onClick={toggleUpdates}
        >
          <input
            type="checkbox"
            className="accent-green-500"
            onChange={toggleUpdates}
            checked={subscribeUpdates}
          />
          <div>I want to be updated about Inck&apos;s new features</div>
        </div>

        <button
          onClick={() => register(
            firstName,
            lastName,
            email,
            password,
            repeatedPass,
            acceptTerms,
            subscribeUpdates
          )}
          className="bg-green-500 hover:bg-green-400 hover:text-white text-green-50 w-full h-10 rounded-md font-bold tracking-wider text-sm">
          Register
        </button>


        <div className="flex justify-end uppercase font-extrabold text-sm text-gray-500 mt-3">
          Already have an account ? Login
          <div
            onClick={toLoginCallback}
            className="pl-1 cursor-pointer underline decoration-gray-500 decoration decoration-[3px] hover:text-gray-600 hover:decoration-gray-600">
            here
          </div>
        </div>

      </div>
    </div>
  )
}