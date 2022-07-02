import { useRouter } from 'next/router'
import React, { useState } from 'react'
import { setAuthToken } from '../AuthToken'
import GetApiPath from '../GetApiPath'


export default function Register({ toLoginCallback }) {

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [repeatedPass, setRepeatedPass] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [subscribeUpdates, setSubscribeUpdates] = useState(false)
  const toggleTerms = () => setAcceptTerms(!acceptTerms)
  const toggleUpdates = () => setSubscribeUpdates(!subscribeUpdates)

  const router = useRouter()
  
  const [error, setError] = useState("")

  const register = async () => {
    setError("")

    const inputs = {
      firstName: firstName,
      lastName: lastName,
      email: email,
      password: password,
      confirmPassword: repeatedPass,
      acceptTerms: acceptTerms,
      subscribeUpdates: subscribeUpdates
    }

    const response = await fetch(
      GetApiPath('/api/auth/register'),
      {
        method: "post",
        body: JSON.stringify(inputs),
        headers: {
          "Content-type": "application/json;charset=UTF-8"
        },
      }
    )
    const jsonResponse = await response.json()

    if (response.status == 201) {
      setAuthToken(jsonResponse.token)
      router.push("/explorer")
    } else {
      setError('Could not register: ' + jsonResponse["error"])
    }
  }
  
  const textFieldStyle = "bg-white placeholder-gray-400 text-gray-900 h-10 rounded-md shadow-md px-3 font-bold1 focus:outline-none focus:ring-4 focus:ring-gray-300"
  const buttonStyle = "bg-primary hover:bg-primary-light hover:shadow-sm duration-100 text-white w-full h-10 rounded-md shadow-lg font-bold tracking-wider text-sm"
  const undelineStyle = "pl-1 underline decoration-gray-500 decoration underline-offset-2 decoration-[2px] hover:text-gray-800 hover:decoration-gray-800 cursor-pointer"
  
  return (
    <div className="mx-5 max-w-2xl flex flex-col items-center">
      <h2 className="font-semibold text-4xl mb-4">Sign up</h2>
      <h3 className="text-lg mb-8">Create an Inck account</h3>
      {/* Main pane */}
      <div className="flex flex-col rounded-xl py-5 px-10 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-6">
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

        <div className='flex flex-col text-gray-600 text-sm gap-2'>
          <div className="flex items-center">
            <input type="checkbox" onClick={toggleTerms} className="accent-primary mr-3" checked={acceptTerms}/>
            <div onClick={toggleTerms}>I have read and accepted Inck&apos;s
            <a target='_blank' href='/tos' className={undelineStyle}>terms of service</a>
            &nbsp;and
            <a target='_blank' href='/privacy' className={undelineStyle}>privacy policy</a></div>
          </div>

          <div className="flex items-center" onClick={toggleUpdates} >
            <input type="checkbox" className="accent-primary text-white mr-3" checked={subscribeUpdates} />
            <div>I want to be updated about Inck&apos;s new features</div>
          </div>
        </div>
        
        <div className={`${error == "" ? "hidden" : ""} text-center bg-red-500 w-full py-2 rounded-md shadow-md text-white`}>
          {error}
        </div>

        <button onClick={register} className={buttonStyle}>Register</button>

        <div className="flex justify-end font-extrabold text-sm text-gray-500 mt-3">
          Already have an account?
          <div onClick={toLoginCallback} className={undelineStyle}> LOGIN </div>
        </div>

      </div>
    </div>
  )
}