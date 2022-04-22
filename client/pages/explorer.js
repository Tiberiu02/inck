import Head from 'next/head'
import Script from 'next/script'
import React, { useState } from 'react'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
const Icon = { ...require('react-icons/fa'),  ...require('react-icons/io'),  ...require('react-icons/io5'),  ...require('react-icons/md'),  ...require('react-icons/ti'),  ...require('react-icons/go'),  ...require('react-icons/fi'),  ...require('react-icons/gi'),  ...require('react-icons/wi'),  ...require('react-icons/di'),  ...require('react-icons/ai'),  ...require('react-icons/bs'),  ...require('react-icons/ri'),  ...require('react-icons/fc'),  ...require('react-icons/gr'),  ...require('react-icons/hi'),  ...require('react-icons/si'),  ...require('react-icons/im'),  ...require('react-icons/bi'),  ...require('react-icons/cg'),  ...require('react-icons/vsc'),}

let freeSelected = () => {}

function DirListing({ Symbol, symbolClassName, name, className, children, link }) {
  let [open, setOpen] = useState(false)
  let [selected, setSelected] = useState(false)
  const Caret = open ? Icon.FaAngleDown : Icon.FaAngleRight
  if (!Symbol)
    Symbol = open ? Icon.FcOpenedFolder : Icon.FcFolder
  if (link)
    open = false
  return (
    <div className='min-w-full w-fit'>
      <button className={'flex flex-row items-center gap-2 px-4 py-2 outline-none min-w-full w-fit ' + (selected ? 'bg-gray-200 ' : '') + className}
      onClick={() => {setOpen(!open); freeSelected(); setSelected(true); freeSelected = () => setSelected(false)}}>
        <Caret className={(open ? 'text-black' : 'text-gray-400') + (link ? ' opacity-0' : '')} />
        <Symbol className={symbolClassName + ' text-2xl mr-1'} />
        <p className={'whitespace-nowrap mt-[0.15rem] ' + (open ? 'font-bold' : '')}>{ name }</p>
      </button>
      <div className={!open && 'hidden'}>
        {children}
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
        <div className='flex flex-col w-[100vw] h-[100vh] font-round'>

          { /** Navigation bar */}
          <div className='flex flex-row justify-between h-16 items-center px-6 border-b-[1px] bg-gray-100 border-gray-300'>
            <div className='flex flex-row gap-3 items-center text-gray-800'>
              <Icon.FaPencilAlt className='text-2xl'/>
              <p className='font-extrabold tracking-wider text-2xl text-gr mt-[0.1rem]'>Inck</p>
            </div>
            <div className='bg-white border-[1px] border-gray-300 text-gray-500 flex flex-row items-center h-10 w-full max-w-xl rounded-lg'>
              <button className='group pl-2 h-10 flex items-center justify-center'>
                <div className='group-hover:bg-gray-300 flex items-center justify-center w-8 h-8 rounded-full'>
                  <Icon.FaSearch />
                </div>
              </button>
              <input className='pl-2 bg-transparent focus:outline-none text-gray-900 placeholder-gray-400' placeholder='Search notes' />
            </div>
            <div className='flex flex-row gap-2 text-gray-500'>
              <button className='hover:bg-gray-300 flex items-center justify-center w-10 h-10 rounded-full'>
                <Icon.FaRegQuestionCircle className='text-2xl' />
              </button>
              <button className='hover:bg-gray-300 flex items-center justify-center w-10 h-10 rounded-full'>
                <Icon.FaRegUserCircle className='text-2xl' />
              </button>
              <button className='hover:bg-gray-300 flex items-center justify-center w-10 h-10 rounded-full'>
                <Icon.FaRegSun className='text-2xl' />
              </button>
            </div>
          </div>

          <div className='h-full w-full flex flex-row pt-4 overflow-hidden'>
            { /** Directory browser */}
            <div className='h-full w-96 border-r-[1px] border-gray-300 flex flex-col' style={{overflow: 'overlay'}}>
              <div className='min-w-full w-fit'>

                <DirListing Symbol={Icon.FcClock} symbolClassName='mt-[0.1rem]' name='Recent' link></DirListing>
                <DirListing Symbol={Icon.FcGlobe} symbolClassName='mt-[0.1rem]' name='Shared with me' link></DirListing>
                <DirListing Symbol={Icon.FcBookmark} name='Homework' link></DirListing>
                <DirListing Symbol={Icon.FcFullTrash} name='Trash' link></DirListing>

                <DirListing Symbol={Icon.FcNook} className='mt-10' name='My Notes'>
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
          </div>

        </div>
      </main>
    </div>
  )
}