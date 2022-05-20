import { faClock } from '@fortawesome/free-solid-svg-icons'
import Head from 'next/head'
import Script from 'next/script'
import React, { useState } from 'react'

import { FaAngleDown, FaAngleRight, FaPencilAlt, FaSearch, FaRegQuestionCircle, FaRegUserCircle, FaRegSun,
         FaRegClock, FaUsers, FaBookmark, FaTrash, FaBook, FaFolder, FaFolderOpen,
         FaBars } from 'react-icons/fa'
//import { FcOpenedFolder, FcFolder, FcClock, FcGlobe, FcBookmark, FcFullTrash, FcNook } from 'react-icons/fc'

let freeSelected = () => {}

function DirListing({ Symbol, symbolClassName, name, className, children, link }) {
  let [open, setOpen] = useState(false)
  let [selected, setSelected] = useState(false)
  const Caret = open ? FaAngleDown : FaAngleRight
  if (!Symbol)
    Symbol = open ? FaFolderOpen : FaFolder
  if (link)
    open = false
  return (
    <div className='min-w-full w-fit'>
      <button className={'flex flex-row items-center gap-2 px-4 py-2 outline-none min-w-full w-fit ' + (selected ? 'bg-gray-200 ' : 'hover:bg-gray-100 ') + (selected || open ? 'text-black ':'') + className}
      onClick={() => {setOpen(!open); freeSelected(); setSelected(true); freeSelected = () => setSelected(false)}}>
        <Caret className={(open ? 'text-black' : 'text-gray-400') + (link ? ' opacity-0' : '')} />
        <Symbol className={symbolClassName + ' text-2xl mr-1'} />
        <p className={'whitespace-nowrap mt-[0.15rem] font-bold ' + (open ? '' : '')}>{ name }</p>
      </button>
      <div className={!open && 'hidden'}>
        {children}
      </div>
    </div>
  )
}

function Note({ title }) {
  return (
    <button className='relative w-24 h-32 sm:w-32 sm:h-40 bg-[url("/img/note-sample.png")] bg-cover border-2 border-slate-800 rounded-xl shadow-inner hover:scale-110 duration-100'>
      
        <p className='absolute bottom-[10%] py-1 -mx-[2px] border-slate-800 bg-slate-800 w-[calc(100%+4px)] text-white text-sm sm:text-lg text-center line-clamp-2'>
          { title }
        </p>
    </button>
  )
}


function Book({ title }) {
  return (
    <button className='relative w-24 h-32 sm:w-32 sm:h-40 text-white hover:scale-110 duration-100 flex flex-col'>
      <div className='bg-slate-800 h-5 w-12 rounded-t-xl -mb-2'></div>
      <div className='realtive bottom-0 h-full w-full flex flex-col justify-around p-2 items-center bg-slate-800 rounded-b-xl rounded-tr-xl overflow-hidden'>
        <FaPencilAlt className='text-3xl sm:text-4xl' />
        <p className='text-sm sm:text-lg text-center line-clamp-2'> { title } </p>
      </div>
    </button>
  )
}

function AddButton() {
  return <>
    <button className='relative w-24 h-32 sm:w-32 sm:h-40 text-gray-200 border-4 rounded-xl text-9xl hover:scale-110 duration-100'>
      +
    </button>
  </>
}

function MobileMenu() {
  let [open, setOpen] = useState(false)

  function toggleOpen() {
    if (!open) { // disable scrolling
      document.body.style.position = 'fixed';
      document.body.style.top = `-${window.scrollY}px`;
    } else { // enable scrolling
      document.body.style.position = '';
      document.body.style.top = '';
            
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    
    setOpen(!open)
  }

  return (
    <>
      <button className='sm:hidden flex items-center justify-center w-10 h-10 rounded-full' onClick={toggleOpen}>
        <FaBars className='text-3xl text-gray-500' />
      </button>
      <div className={`fixed h-screen w-screen bg-black z-10 ${open ? 'opacity-50' : 'opacity-0 pointer-events-none'} transition-all duration-200 top-0 left-0`} onClick={toggleOpen}>

      </div>
      <div className={`fixed h-screen p-0 w-[70vw] bg-white z-20 ${open ? 'translate-x-0' : '-translate-x-full'} transition-all duration-200 top-0 left-0 overflow-scroll`}>
        <FileTree className='pt-10 pb-52 w-full' />
      </div>
    </>
  )
}

function FileTree({ className }) {
  return (
    <div className={`${className} h-full text-gray-500 sm:flex flex-col`} style={{overflow: 'overlay'}}>
      <div className='min-w-full w-fit'>

        <DirListing Symbol={FaRegClock} symbolClassName='mt-[0.1rem]' name='Recent' link></DirListing>
        <DirListing Symbol={FaUsers} symbolClassName='mt-[0.1rem]' name='Shared with me' link></DirListing>
        <DirListing Symbol={FaBookmark} name='Homework' link></DirListing>
        <DirListing Symbol={FaTrash} name='Trash' link></DirListing>

        <DirListing Symbol={FaBook} className='mt-10' name='My Notes'>
          <DirListing name='Epfl' className='pl-12'>
            <DirListing name='Analyse' className='pl-20'>
              <DirListing name='w1' className='pl-28'></DirListing>
              <DirListing name='w2' className='pl-28'></DirListing>
              <DirListing name='w3' className='pl-28'></DirListing>
              <DirListing name='w4' className='pl-28'></DirListing>
              <DirListing name='w5' className='pl-28'></DirListing>
              <DirListing name='w6' className='pl-28'></DirListing>
              <DirListing name='w7' className='pl-28'></DirListing>
            </DirListing>
            <DirListing name='AICC 2' className='pl-20'>
              <DirListing name='w1' className='pl-28'></DirListing>
              <DirListing name='w2' className='pl-28'></DirListing>
              <DirListing name='w3' className='pl-28'></DirListing>
              <DirListing name='w4' className='pl-28'></DirListing>
              <DirListing name='w5' className='pl-28'></DirListing>
              <DirListing name='w6' className='pl-28'></DirListing>
              <DirListing name='w7' className='pl-28'></DirListing>
            </DirListing>
            <DirListing name='Pratique de la programation orientée objet' className='pl-20'>
              <DirListing name='w1' className='pl-28'></DirListing>
              <DirListing name='w2' className='pl-28'></DirListing>
              <DirListing name='w3' className='pl-28'></DirListing>
              <DirListing name='w4' className='pl-28'></DirListing>
              <DirListing name='w5' className='pl-28'></DirListing>
              <DirListing name='w6' className='pl-28'></DirListing>
              <DirListing name='w7' className='pl-28'></DirListing>
            </DirListing>
            <DirListing name='Digital system design' className='pl-20'>
              <DirListing name='w1' className='pl-28'></DirListing>
              <DirListing name='w2' className='pl-28'></DirListing>
              <DirListing name='w3' className='pl-28'></DirListing>
              <DirListing name='w4' className='pl-28'></DirListing>
              <DirListing name='w5' className='pl-28'></DirListing>
              <DirListing name='w6' className='pl-28'></DirListing>
              <DirListing name='w7' className='pl-28'></DirListing>
            </DirListing>
          </DirListing>
        </DirListing>
      
      </div>
    </div>
  )
}

export default function Explorer() {
  return (
    <div>
      <Head>
        <title>Inck</title>
        <meta name="description" content="The only ink that you will ever need" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <main>
        <div className='relative flex flex-col w-[100vw] h-[100vh] font-round'>

          { /** Top bar */}
          <div className='flex flex-row gap-10 sm:gap-10 justify-between h-16 items-center px-4 sm:px-6 border-b-[1px] bg-white border-gray-300'>
            <MobileMenu />
            <div className='hidden sm:flex flex-row gap-3 items-center text-gray-800'>
              <FaPencilAlt className='text-2xl'/>
              <p className='font-extrabold tracking-wider text-2xl text-gr mt-[0.1rem]'>Inck</p>
            </div>
            <div className='flex bg-gray-100 border-[1px] border-gray-300 text-gray-500 flex-row items-center h-10 overflow-hidden w-full max-w-xl rounded-lg'>
              <button className='group pl-2 h-10 flex items-center justify-center'>
                <div className='group-hover:bg-gray-300 flex items-center justify-center w-8 h-8 rounded-full'>
                  <FaSearch />
                </div>
              </button>
              <input className='pl-2 bg-transparent focus:outline-none text-gray-900 placeholder-gray-400' placeholder='Search notes' />
            </div>
            <div className='hidden sm:flex flex-row gap-2 text-gray-500'>
              <button className='hover:bg-gray-300 flex items-center justify-center w-10 h-10 rounded-full'>
                <FaRegQuestionCircle className='text-2xl' />
              </button>
              <button className='hover:bg-gray-300 flex items-center justify-center w-10 h-10 rounded-full'>
                <FaRegUserCircle className='text-2xl' />
              </button>
              <button className='hover:bg-gray-300 flex items-center justify-center w-10 h-10 rounded-full'>
                <FaRegSun className='text-2xl' />
              </button>
            </div>
          </div>

          <div className='h-full w-full flex flex-row pt-4 overflow-hidden'>
            <FileTree className='hidden sm:visible w-96 border-r-[1px] border-gray-300' />

            <div className='relative flex flex-col w-full h-full px-10 gap-12 py-3 overflow-scroll'>
              <div className='text-xl text-gray-700 font-bold hidden sm:flex flex-row items-center -ml-3 flex-wrap'>
                <div className='flex flex-row items-center gap-3 hover:bg-gray-200 px-4 py-1 rounded-full cursor-pointer'>
                  <FaBook />
                  My Notes
                </div>
                <FaAngleRight className='mx-4' />
                <p className='hover:bg-gray-200 px-4 py-1 rounded-full cursor-pointer'>Epfl</p>
                <FaAngleRight className='mx-4' />
                <p className='hover:bg-gray-200 px-4 py-1 rounded-full cursor-pointer'>Digital system design</p>
                <FaAngleRight className='mx-4' />
                <p className='hover:bg-gray-200 px-4 py-1 rounded-full cursor-pointer'>w1</p>
              </div>

              {/** Notes */}
              <div className='flex flex-row flex-wrap gap-4 sm:gap-8 mx-auto justify-evenly'>

                <Book title='Analyse w1' />
                <Note title='Analyse w1' />
                <Note title='Analyse w1' />
                <Note title='Analyse w1' />
                <Note title='Analyse w1' />
                <Note title='Analyse w1' />
                <Note title='Analyse w1' />

                <AddButton />

              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  )
}