import Head from 'next/head'
import Script from 'next/script'
import { FaPen } from 'react-icons/fa'
import React, { useState } from 'react'

function OpenNoteBtn() {
  const [noteId, setNoteId] = useState('')
  return (
    <form onSubmit={(e) => {e.preventDefault(); if(noteId) window.location = '/note/' + noteId}} className='flex flex-row gap-4 items-center ins border-2 border-primary bg-white rounded-xl overflow-hidden'>
      <input required name='code' className='placeholder-gray-400 text-gray-700 mx-3 w-52' placeholder='Code' onChange={e => setNoteId(e.target.value)} />
      <button className='flex flex-row gap-4 items-center bg-primary px-5 h-full border-primary border-2'>Open note</button>
    </form>
  )
}

function CreateNoteBtn() {
  const chars = "abcdefghijklmnopqrstufwxyzABCDEFGHIJKLMNOPQRSTUFWXYZ1234567890"
  const len = 6
  const id = Array(6).fill(0).map(x => chars[Math.floor(Math.random() * chars.length)]).join('')
  return (
    <button onClick={() => window.location = '/note/' + id} className='flex flex-row gap-4 items-center bg-primary py-3 px-5 rounded-xl'>Create note<FaPen className='mx-1'/></button>
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
        <div className='w-full flex flex-col items-center h-[100vh] justify-center bg-notes bg-cover'>
          <div className='lg:max-w-4xl xl:max-w-5xl lg:w-full'>
            <div className='relative max-w-fit'>
              <div className='absolute -inset-4 bg-white blur-lg'></div>
              <p className='text-8xl font-cursive blur-0 font-bold'>Welcome to Inck!</p>
            </div>
            <div className='h-2 w-20 bg-primary rounded-xl my-10' />
            <div className='relative max-w-fit'>
              <div className='absolute -inset-2 bg-white blur-md'></div>
              <p className='text-5xl font-cursive italic blur-0'>the only ink you'll ever need</p>
            </div>
            <div className='flex flex-col sm:flex-row mt-20 gap-5 text-3xl font-round text-white'>
              <OpenNoteBtn />
              <CreateNoteBtn />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}