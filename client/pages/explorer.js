import Head from 'next/head'
import React, { useState, useEffect } from 'react'

import {
  FaAngleDown, FaAngleRight, FaPencilAlt, FaSearch, FaRegQuestionCircle, FaRegUserCircle, FaRegSun,
  FaRegClock, FaUsers, FaBookmark, FaTrash, FaBook, FaFolder, FaFolderOpen, FaRegWindowClose, FaExchangeAlt,
  FaBars
} from 'react-icons/fa'
import Cookies from 'universal-cookie'
import { authCookieName, getAuthToken, setAuthToken, disconnect } from '../components/AuthToken.js'
import GetApiPath from '../components/GetApiPath'


function DirListing({ Symbol, symbolClassName, name, className, userPath, dirPath, style, onClick, children, link }) {
  let [open, setOpen] = useState(false)
  const selected = userPath && dirPath && userPath.toString() == dirPath.toString()
  if (!open && userPath && dirPath && userPath.length > dirPath.length && userPath.slice(0, dirPath.length).toString() == dirPath.toString())
    setOpen(true)

  const Caret = open ? FaAngleDown : FaAngleRight
  if (!Symbol)
    Symbol = open ? FaFolderOpen : FaFolder
  if (link)
    open = false

  const onClickCallback = () => {
    setOpen(!open || !selected);
    if (onClick !== undefined) {
      onClick()
    }
  }
  return (
    <div className='min-w-full w-fit'>
      <button style={style} className={'flex flex-row items-center gap-2 px-4 py-2 outline-none min-w-full w-fit ' + (selected ? 'bg-gray-200 ' : 'hover:bg-gray-100 ') + (selected || open ? 'text-black ' : '') + className}
        onClick={onClickCallback}>
        <Caret className={(open ? 'text-black' : 'text-gray-400') + (link ? ' opacity-0' : '')} />
        <Symbol className={symbolClassName + ' text-2xl mr-1'} />
        <p className={'whitespace-nowrap mt-[0.15rem] font-bold ' + (open ? '' : '')}>{name}</p>
      </button>
      <div className={!open && 'hidden'}>
        {children}
      </div>
    </div>
  )
}

function Note({ title, onClick, showSelect = false, isSelected = false }) {
  return (
    <button onClick={onClick} className='relative w-24 h-32 sm:w-32 sm:h-40 bg-[url("/img/note-sample.png")] bg-cover border-2 border-slate-800 rounded-xl shadow-inner hover:scale-110 duration-100'>
      {showSelect && <div className={`rounded-lg border-slate-800 border-4 bg-white px-2 font-bold absolute top-3 left-3 ${isSelected ? "text-slate-800" : "text-white"} text-center`}>x</div>}

      <p className='absolute bottom-[10%] py-1 -mx-[2px] border-slate-800 bg-slate-800 w-[calc(100%+4px)] text-white text-sm sm:text-lg text-center line-clamp-2'>
        {title}
      </p>
    </button>
  )
}


function Book({ title, onClick, showSelect = false, isSelected = false }) {
  // console.log(isSelected, showSelect)

  return (
    <button onClick={onClick} className='relative w-24 h-32 sm:w-32 sm:h-40 text-white hover:scale-110 duration-100 flex flex-col'>
      <div className='bg-slate-800 h-5 w-12 rounded-t-xl -mb-2'></div>
      <div className='realtive bottom-0 h-full w-full flex flex-col justify-around p-2 items-center bg-slate-800 rounded-b-xl rounded-tr-xl overflow-hidden'>
        {showSelect && <div className={`rounded-lg border-slate-800 border-4 bg-white px-2 font-bold absolute top-3 left-3 ${isSelected ? "text-slate-800" : "text-white"} text-center`}>x</div>}

        <FaPencilAlt className='text-3xl sm:text-4xl' />
        <p className='text-sm sm:text-lg text-center line-clamp-2'> {title} </p>
      </div>
    </button>
  )
}

function AddButton({ onClick }) {
  return <>
    <button onClick={onClick} className='relative w-24 h-32 sm:w-32 sm:h-40 text-gray-200 border-4 rounded-xl text-9xl hover:scale-110 duration-100'>
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

function FileTree({ className, files, path, setPath }) {
  const symbols = {
    'f/notes': FaBook
  }

  const buildDirListing = (dir, dirPath) => {
    const symbol = (dir == '')
    //console.log(path)
    return (
      <DirListing Symbol={symbols[dir._id]} name={dir.name} userPath={path} dirPath={dirPath}
        style={{ paddingLeft: `${dirPath.length}rem` }} onClick={() => setPath(dirPath)}>
        {
          dir.children.filter(f => f.type == 'folder').map(f => buildDirListing(f, dirPath.concat(f._id)))
        }
      </DirListing>
    )
  }

  return (
    <div className={`${className} h-full text-gray-500 sm:flex flex-col`} style={{ overflow: 'overlay' }}>
      <div className='min-w-full w-fit'>

        <DirListing Symbol={FaRegClock} symbolClassName='mt-[0.1rem]' name='Recent' link></DirListing>
        <DirListing Symbol={FaUsers} symbolClassName='mt-[0.1rem]' name='Shared with me' link></DirListing>
        <DirListing Symbol={FaBookmark} name='Homework' link></DirListing>
        <DirListing Symbol={FaTrash} name='Trash' link></DirListing>

        <div className='mt-5'></div>

        {
          files && buildDirListing(files['f/notes'], ['f/notes'])
        }

      </div>
    </div>
  )
}

function PathNavigator({ files, path, setPath }) {
  let p = [];

  p.push(
    <div key={p.length} onClick={() => setPath(path.slice(0, 1))} className='flex flex-row items-center gap-3 hover:bg-gray-200 -ml-4 px-4 py-1 rounded-full cursor-pointer'>
      <FaBook />
      {files && files[path[0]].name}
    </div>
  )

  for (let i = 1; i < path.length; i++) {
    p.push(
      <FaAngleRight key={p.length} className='sm:mx-4' />
    )
    p.push(
      <p key={p.length} onClick={() => setPath(path.slice(0, i + 1))} className='hover:bg-gray-200 px-2 sm:px-4 py-1 rounded-full cursor-pointer'>{files[path[i]].name}</p>
    )
  }

  return (
    <div className='text-md sm:text-xl text-gray-700 font-bold flex flex-row items-center -ml-3 flex-wrap'>
      {p}
    </div>
  )
}


function RemoveFilesModal({ visible, setVisible, reloadFiles, removeFiles }) {
  const onRemoveClick = () => {
    removeFiles()
    setVisible(false)
    document.location.reload(true)
  }
  return (
    <div className={(!visible ? 'hidden' : '') + ' absolute inset-0 w-screen h-screen bg-opacity-50 bg-black flex justify-center items-center'}>
      <div onClick={() => setVisible(false)} className='absolute inset-0'></div>
      <div className={`relative w-96 h-72 bg-white rounded-lg shadow-lg p-5 flex flex-col text-lg justify-between`}>
        <div className='flex grid-cols-2 w-full gap-4 font-semibold justify-center'>
          Remove notes
        </div>

        <div>
          <div>
            Are you sure you want to remove your beloved notes ?
          </div>
          <div className='text-sm italic mt-3'>
          *They will be put in the trash for 15 days before definitive removal. Notes inside removed folder will be deleted recursively.
          </div>
        </div>

        <div className='flex justify-between'>
          <button className="text-gray-600 hover:bg-gray-200 w-fit px-4 py-1 rounded-full self-center" onClick={() => setVisible(false)}>Cancel</button>
          <button onClick={onRemoveClick} className="bg-red-600 hover:bg-red-700 text-white w-fit px-4 py-1 rounded-full self-center">Remove</button>
        </div>
      </div>
    </div>
  )
}


function EditFileModal({ visible, setVisible, file, reloadFiles, save }) {
  // menuType is either 'note' or 'folder'
  const [newName, setNewName] = useState("")
  const [newNoteAccess, setNewNoteAccess] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  const fileType = file !== undefined ? file.type : ""
  const isAccessVisible = fileType == 'note'

  const hideErrorMessage = errorMessage == null

  const hideModal = () => {
    setNewName("")
    setNewNoteAccess("")
    setErrorMessage(null)
    setVisible(false)
  }

  const saveEdits = () => {
    console.log(file)
    console.log("id: " + file._id)
    const trimmedNewName = newName.trim()
    if (trimmedNewName == "") {
      setErrorMessage(fileType + "'s name cannot be empty")
      return
    }
    // TODO: solve this
    console.log("Saved edits")
    save(file._id, newName, newNoteAccess)
    hideModal()
    document.location.reload(true)
    reloadFiles()
  }

  return (
    <div className={(!visible ? 'hidden' : '') + ' absolute inset-0 w-screen h-screen bg-opacity-50 bg-black flex justify-center items-center'}>
      <div onClick={hideModal} className='absolute inset-0'></div>
      <div className={`relative w-96 h-72 bg-white rounded-lg shadow-lg p-5 flex flex-col text-lg justify-between`}>
        <div className='flex grid-cols-2 w-full gap-4 font-semibold justify-center'>
          Edit {file !== undefined && file.type}
        </div>
        <div className={'flex' + ' flex-col gap-6'}>
          <div className='flex gap-4'>
            Name
            <input value={newName} onChange={e => setNewName(e.target.value)} className='bg-gray-100 w-full border-[1px] px-2 border-gray-400 rounded-md' />
          </div>
          <div className={`flex gap-4 ${isAccessVisible ? '' : 'hidden'}`}>
            Public&nbsp;access
            <select value={newNoteAccess} onChange={e => setNewNoteAccess(e.target.value)} className='bg-gray-100 w-full border-[1px] px-2 border-gray-400 rounded-md'>
              <option value='edit'>View &amp; edit</option>
              <option value='view'>View only</option>
              <option value='none'>None</option>
            </select>
          </div>
        </div>
        <button onClick={saveEdits} className='bg-slate-800 hover:bg-black text-white w-fit px-4 py-1 rounded-full self-center'>Save modifications</button>
        <div className={`${hideErrorMessage ? 'hidden' : ''}`}>
          <span className="font-semibold text-red-600">Error:</span> {errorMessage}
        </div>
      </div>
    </div>
  )
}

function CreateFileModal({ visible, setVisible, path, reloadFiles }) {
  const [menu, setMenu] = useState('note')
  const [noteName, setNoteName] = useState('')
  const [notePublicAccess, setNotePublicAccess] = useState('view')
  const [folderName, setFolderName] = useState('')

  const submit = () => {
    if (menu == 'note')
      addFile(noteName, menu, path.at(-1), {
        publicAccess: notePublicAccess
      })
    else
      addFile(folderName, menu, path.at(-1))

    setMenu('note')
    setNoteName('')
    setNotePublicAccess('view')
    setFolderName('')

    setVisible(false)
    reloadFiles()
  }

  return (
    <div className={(!visible ? 'hidden' : '') + ' absolute inset-0 w-screen h-screen bg-opacity-50 bg-black flex justify-center items-center'}>
      <div onClick={() => setVisible(false)} className='absolute inset-0'></div>
      <div className='relative w-96 h-72 bg-white rounded-lg shadow-lg p-5 flex flex-col text-lg justify-between'>
        <div className='grid grid-cols-2 w-full gap-4'>
          <button onClick={() => setMenu('note')} className={'w-full rounded-full flex justify-center p-1 gap-2 ' + (menu == 'note' ? 'bg-gray-200' : 'hover:bg-gray-200')}><FaBook className='text-sm mt-2' /> New note</button>
          <button onClick={() => setMenu('folder')} className={'w-full rounded-full flex justify-center p-1 gap-2 ' + (menu == 'folder' ? 'bg-gray-200' : 'hover:bg-gray-200')}><FaFolder className='text-sm mt-2' /> New folder</button>
        </div>
        <div className={(menu == 'note' ? 'flex' : 'hidden') + ' flex-col gap-6'}>
          <div className='flex gap-4'>
            Name
            <input value={noteName} onChange={e => setNoteName(e.target.value)} className='bg-gray-100 w-full border-[1px] px-2 border-gray-400 rounded-md' />
          </div>
          <div className='flex gap-4'>
            Public&nbsp;access
            <select value={notePublicAccess} onChange={e => setNotePublicAccess(e.target.value)} className='bg-gray-100 w-full border-[1px] px-2 border-gray-400 rounded-md'>
              <option value='edit'>View &amp; edit</option>
              <option value='view'>View only</option>
              <option value='none'>None</option>
            </select>
          </div>
        </div>
        <div className={(menu == 'folder' ? 'flex' : 'hidden') + ' flex-col gap-6'}>
          <div className='flex gap-4'>
            Name
            <input value={folderName} onChange={e => setFolderName(e.target.value)} className='bg-gray-100 w-full border-[1px] px-2 border-gray-400 rounded-md' />
          </div>
        </div>
        <button onClick={submit} className='bg-slate-800 hover:bg-black text-white w-fit px-4 py-1 rounded-full self-center'>Create {menu}</button>
      </div>
    </div>
  )
}

async function LoadFiles(callback) {

  // TODO bug: no refresh after name change

  const response = await fetch(GetApiPath('/api/explorer/getfiles'), {
    method: 'post',
    body: JSON.stringify({ token: getAuthToken() }),
    headers: {
      "Content-type": "application/json;charset=UTF-8"
    },
  });
  const json = await response.json();

  const fileList = json.files;

  const fileDict = {};
  for (const f of fileList) {
    fileDict[f._id] = f;
    if (f.type == 'folder')
      fileDict[f._id].children = [];
  }
  fileDict['f/notes'] = { name: 'My Notes', children: [] };
  fileDict['f/trash'] = { name: 'Trash', children: [] };

  for (const f of fileList)
    fileDict[f.parentDir].children.push(fileDict[f._id]);

  for (const f of Object.values(fileDict))
    if (f.children) {
      f.children.sort((a, b) => {
        if (a.type != b.type)
          return a.type == 'folder' ? -1 : 1
        if (a.name != b.name)
          return a.name < b.name ? -1 : 1
        return 0
      })
    }

  // console.log(fileDict);
  callback(fileDict);
}

async function addFile(name, type, parentDir, options = {}) {
  await fetch(GetApiPath('/api/explorer/addfile'), {
    // TODO: check, shouldnt have to put the token, it should be in the header by default
    method: 'post',
    body: JSON.stringify({ token: getAuthToken(), name, type, parentDir, options }),
    headers: {
      "Content-type": "application/json;charset=UTF-8"
    },
  });

  // console.log('Created file!');
}

async function editFileAPICall(id, newName, newVisibility = null, options = {}) {
  await fetch(GetApiPath("/api/explorer/editfile"), {
    method: 'post',
    body: JSON.stringify({
      token: getAuthToken(),
      id: id,
      newName: newName,
      newVisibility: newVisibility,
      options: options
    }),
    headers: {
      "Content-type": "application/json;charset=UTF-8"
    },
  })
}

async function removeFilesAPICall(notes) {

  const notesData = notes.map(x => {
    return {
      type: x.type,
      _id: x._id,
    }
  })

  console.log(notesData)
  console.log("Simulating deletion")

  await fetch(GetApiPath("/api/explorer/removefiles"), {
    method: 'post',
    body: JSON.stringify({
      token: getAuthToken(),
      notesToRemove: notesData

    }),
    headers: {
      "Content-type": "application/json;charset=UTF-8"
    },
  })
}

export default function Explorer() {
  const [files, setFiles] = useState(null);
  const [path, setPath] = useState(['f/notes']);
  const [createFileModal, setCreateFileModal] = useState(false)
  const [editFileModal, setEditFileModal] = useState(false)
  const [removeFileModal, setRemoveFileModal] = useState(false)

  const [isSelecting, setIsSelecting] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState({})
  const firstSelectedElement = selectedFiles[Object.keys(selectedFiles)[0]]

  let selectionWidget


  // TODO: something fishy with selection: when edit opens, resets the selection set.
  const toggleFileSelection = (newVal) => {
    if (newVal) {
      setSelectedFiles({})
    }
    setIsSelecting(newVal)
  }

  

  // Toggle file selection
  if (isSelecting) {

    const noSelection = Object.keys(selectedFiles).length == 0
    const oneSelected = Object.keys(selectedFiles).length == 1

    selectionWidget =
      <div className='flex w-full justify-between rounded-xl border-2 overflow-clip'>
        <button className='hover:bg-gray-300 px-4 py-3 hover' onClick={() => toggleFileSelection(false)}><FaRegWindowClose /></button>
        <button onClick={() => setRemoveFileModal(true)} disabled={noSelection} className='hover:bg-gray-300 disabled:opacity-20 disabled:hover:bg-inherit px-4 py-3'><FaTrash /></button>
        <button onClick={() => setEditFileModal(true)} disabled={!oneSelected} className='hover:bg-gray-300 disabled:opacity-20 disabled:hover:bg-inherit px-4 py-3'><FaRegSun /></button>
        <button disabled={noSelection} className='hover:bg-gray-300 disabled:opacity-20 disabled:hover:bg-inherit px-4 py-3'><FaExchangeAlt /></button>
      </div>

  } else {
    selectionWidget =
      <button
        onClick={() => toggleFileSelection(true)}
        className='py-2 text-l font-medium hover:text-gray-600 hover:bg-gray-300 flex items-center justify-center rounded-md px-3'>
        Select...
      </button>
  }

  let fileClickActionFactory
  let bookClickActionFactory
  // Set click action for explorer elements
  if (isSelecting) {
    function explorerItemClickActionFactory(f, idx) {
      const onClick = () => {
        const newState = { ...selectedFiles }
        if (f._id in newState) {
          delete newState[f._id]
        } else {
          newState[f._id] = f
        }
        setSelectedFiles(newState)
      }
      return onClick
    }

    bookClickActionFactory = explorerItemClickActionFactory
    fileClickActionFactory = explorerItemClickActionFactory
  } else {
    bookClickActionFactory = (f, idx) => (() => setPath(path.concat([f._id])))
    fileClickActionFactory = (f, idx) => (() => window.open("/note/" + f.fileId, "_blank"))
  }

  //
  const drawExplorerItem = (f, idx, _) => {
    const isSelected = isSelecting && f._id in selectedFiles
    if (f.type == 'folder') {
      return <Book key={f.name} isSelected={isSelected} showSelect={isSelecting} title={f.name} onClick={bookClickActionFactory(f, idx)} />

    } else {
      return <Note key={f.fileId} isSelected={isSelected} showSelect={isSelecting} title={f.name} onClick={fileClickActionFactory(f, idx)} />

    }
  }



  //console.log(path, path.at(-1))

  const reloadFiles = () => LoadFiles(setFiles);

  useEffect(() => {
    reloadFiles();
  }, []);

  return (
    <div>
      <Head>
        <title>Inck</title>
        <meta name="description" content="The only ink that you will ever need" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className='font-round'>
        <div className='relative flex flex-col w-[100vw] h-[100vh]'>

          { /** Top bar */}
          <div className='flex flex-row gap-10 sm:gap-10 justify-between h-16 items-center px-4 sm:px-6 border-b-[1px] bg-white border-gray-300'>
            <MobileMenu />
            <div className='hidden sm:flex flex-row gap-3 items-center text-gray-800'>
              <FaPencilAlt className='text-2xl' />
              <p className='font-extrabold tracking-wider text-2xl text-gr mt-[0.1rem]'>Inck</p>
            </div>
            <div className="w-48 justify-center align-middle flex">
              {selectionWidget}
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
              <button onClick={disconnect} className='text-l font-medium hover:text-gray-600 hover:bg-gray-300 flex items-center justify-center rounded-md px-3'>
                Disconnect
              </button>
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
            <FileTree files={files} path={path} setPath={setPath}
              className='hidden sm:flex pb-10 w-96 border-r-[1px] border-gray-300' />

            <div className='relative flex flex-col w-full h-full px-10 gap-12 py-3 overflow-scroll'>
              <PathNavigator files={files} path={path} setPath={setPath} />

              {/** Notes */}
              <div className='flex flex-row flex-wrap gap-4 sm:gap-8 m-auto pb-40 justify-evenly'>

                {
                  files && files[path.at(-1)].children.map(drawExplorerItem)
                }

                <AddButton onClick={() => {
                  setCreateFileModal(true);
                  reloadFiles();
                }} />

              </div>

            </div>
          </div>
        </div>

        {/* Create file modal */}
        <CreateFileModal visible={createFileModal} setVisible={setCreateFileModal} path={path} reloadFiles={reloadFiles} />
        {/* Edit file modal */}
        <EditFileModal file={firstSelectedElement} visible={editFileModal} setVisible={setEditFileModal} reloadFiles={reloadFiles} save={editFileAPICall} />
        {/* Move files modal */}
        <RemoveFilesModal visible={removeFileModal} setVisible={setRemoveFileModal} reloadFiles={reloadFiles} removeFiles={() => removeFilesAPICall(Object.values(selectedFiles))} />
      </main>
    </div>
  )
}