import Head from 'next/head'
import { FaPen, FaGlobe, FaCar, FaShippingFast, FaPlane, FaMobileAlt, FaArrowDown } from 'react-icons/fa'
import React, { useState } from 'react'

function OpenNoteBtn() {
  const [noteId, setNoteId] = useState('')
  return (
    <form onSubmit={(e) => {e.preventDefault(); if(noteId) window.location = '/free-note/' + noteId}} className='flex flex-row gap-4 items-center justify-between border-2 border-primary bg-white rounded-xl w-full'>
      <input required name='code' className='placeholder-gray-400 text-gray-700 mx-3 w-full' placeholder='Code' onChange={e => setNoteId(e.target.value)} />
      <button className='flex flex-row items-center bg-primary hover:bg-primary-dark duration-200 px-5 h-full py-[0.55rem] border-0 w-full justify-center -mr-1 -my-[2px] rounded-r-xl'>Open&nbsp;note</button>
    </form>
  )
}

function CreateNoteBtn({ className }) {
  const chars = "abcdefghijklmnopqrstufwxyzABCDEFGHIJKLMNOPQRSTUFWXYZ1234567890"
  const len = 6
  const id = Array(6).fill(0).map(x => chars[Math.floor(Math.random() * chars.length)]).join('')
  return (
    <button onClick={() => window.location = '/free-note/' + id} className={`${className} flex flex-row items-center justify-center bg-primary hover:bg-primary-dark duration-200 py-3 px-6 rounded-xl w-full`}>
      Create new note
      <FaPen className='mr-1 ml-7'/>
    </button>
  )
}

function Item({ title, text, Icon }) {
  return (
    <div className='flex flex-col items-center'>
      <Icon className='text-6xl text-primary' />
      <h2 className='text-xl font-bold pt-4 text-center'>{ title }</h2>
      <p className='w-56 text-center pt-4'>{ text }</p>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div>
      <Head>
        <title>Inck</title>
        <meta name="description" content="The only ink that you will ever need" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <main>
        <div className='w-full flex flex-col items-center min-h-[100vh] px-10 py-20 justify-center bg-notes bg-cover'>
          <div className='lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl w-full'>
            <div className='relative max-w-fit'>
              <div className='absolute -inset-4 bg-white blur-lg'></div>
              <p className='text-6xl sm:text-8xl font-cursive blur-0 font-bold'>Welcome to Inck!</p>
            </div>
            <div className='h-2 w-20 bg-primary rounded-xl my-10' />
            <div className='relative max-w-fit'>
              <div className='absolute -inset-2 bg-white blur-md'></div>
              <p className='text-4xl sm:text-5xl font-cursive italic blur-0'>the only ink you&apos;ll ever&nbsp;need&nbsp;&nbsp;</p>
            </div>
            <div className='flex flex-col lg:flex-row mt-20 text-lg sm:text-3xl font-round text-white max-w-fit'>
              <OpenNoteBtn />
              <CreateNoteBtn className='mt-4 lg:mt-0 lg:ml-4' />
            </div>
          </div>
        </div>
        
        <div className='font-round w-full flex flex-col items-center py-20 px-10 min-h-[100vh] justify-center bg-white border-t-4 drop-shadow-md border-t-gray-100'>
          <div className='flex flex-col items-center max-w-md lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl lg:w-full'>
            <h1 className='text-4xl text-center'>The Google Docs of hand-written notes</h1>
            <div className='grid sm:grid-cols-2 mt-32 gap-20'>
              <Item title='Live collaboration' Icon={FaGlobe} text='Collaborating in real time with your friends is as easy as sharing a link.' />
              <Item title='Fast and reliable' Icon={FaShippingFast} text="Enjoy native performace thanks to the most advanced web technologies." />
              <Item title='Access from anywhere' Icon={FaPlane} text='Take and review notes wherever you are.' />
              <Item title='Cross-platform' Icon={FaMobileAlt} text='All you need is a web browser.' />
            </div>
          </div>
        </div>
        
        <div className='font-round w-full flex flex-col items-center py-20 px-0 justify-center bg-gray-100'>
          <div className='flex flex-col items-center w-[80vw]'>
            <p className='text-2xl mt-4 text-gray-900 italic mb-2'>Still not convinced?</p>
            <h1 className='text-6xl text-center'>Try it out</h1>
            <FaArrowDown className='text-5xl text-primary mt-12 mb-4' />
            <iframe className='w-full h-[80vw] sm:h-[50vw] rounded-xl shadow-lg' src='/note/demo' />
          </div>

          <p className='mt-20 -mb-20 py-5'>© Inck team 2022</p>
        </div>
      </main>
    </div>
  )
}