import Head from 'next/head'
import Script from 'next/script'
import { FaPen, FaGlobe, FaMotorcycle, FaCar, FaShippingFast, FaPlane, FaMobileAlt, FaArrowDown } from 'react-icons/fa'
import React, { useState } from 'react'

function OpenNoteBtn() {
  const [noteId, setNoteId] = useState('')
  return (
    <form onSubmit={(e) => {e.preventDefault(); if(noteId) window.location = '/note/' + noteId}} className='flex flex-row gap-4 items-center ins border-2 border-primary bg-white rounded-xl overflow-hidden'>
      <input required name='code' className='placeholder-gray-400 text-gray-700 mx-3 w-20 sm:w-52' placeholder='Code' onChange={e => setNoteId(e.target.value)} />
      <button className='flex flex-row gap-4 items-center bg-primary hover:bg-primary-dark duration-200 px-5 h-full py-[0.55rem] border-0'>Open note</button>
    </form>
  )
}

function CreateNoteBtn() {
  const chars = "abcdefghijklmnopqrstufwxyzABCDEFGHIJKLMNOPQRSTUFWXYZ1234567890"
  const len = 6
  const id = Array(6).fill(0).map(x => chars[Math.floor(Math.random() * chars.length)]).join('')
  return (
    <button onClick={() => window.location = '/note/' + id} className='flex flex-row gap-6 items-center justify-center bg-primary hover:bg-primary-dark duration-200 py-3 px-6 rounded-xl'>Create new note<FaPen className='mx-1'/></button>
  )
}

function Item({ title, text, Icon }) {
  return (
    <div className='flex flex-col items-center gap-4'>
      <Icon className='text-6xl text-primary' />
      <h2 className='text-xl font-bold'>{ title }</h2>
      <p className='w-56 text-center'>{ text }</p>
    </div>
  )
}

export default function Canvas() {
  return (
    <div className='touch-none'>
      <Head>
        <title>Inck</title>
        <meta name="description" content="The only ink that you will ever need" />
        <link rel="icon" href="/favicon.ico" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Shadows+Into+Light+Two&family=Varela+Round&display=swap" rel="stylesheet" />
      </Head>
      
      <main>
        <div className='w-full flex flex-col items-center min-h-[100vh] px-0 py-20 justify-center bg-notes bg-cover'>
          <div className='lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl lg:w-full'>
            <div className='relative max-w-fit'>
              <div className='absolute -inset-4 bg-white blur-lg'></div>
              <p className='text-6xl sm:text-8xl font-cursive blur-0 font-bold'>Welcome to Inck!</p>
            </div>
            <div className='h-2 w-20 bg-primary rounded-xl my-10' />
            <div className='relative max-w-fit'>
              <div className='absolute -inset-2 bg-white blur-md'></div>
              <p className='text-4xl sm:text-5xl font-cursive italic blur-0'>the only ink you'll ever&nbsp;need</p>
            </div>
            <div className='flex flex-col lg:flex-row mt-20 gap-5 text-lg sm:text-3xl font-round text-white'>
              <OpenNoteBtn />
              <CreateNoteBtn />
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
            <h1 className='text-6xl text-center'>Try now</h1>
            <FaArrowDown className='text-5xl text-primary mt-12 mb-4' />
            <iframe className='w-full aspect-square sm:aspect-video rounded-xl shadow-lg' src='/note/stest' />
          </div>

          <p className='mt-20 -mb-20 py-5'>© Inck team 2022</p>
        </div>
      </main>
    </div>
  )
}