import Head from "next/head";
import { setuid } from "process";
import React, { useState, useEffect, useRef, PointerEvent } from "react";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  FaAngleDown,
  FaAngleRight,
  FaPencilAlt,
  FaSearch,
  FaRegQuestionCircle,
  FaRegUserCircle,
  FaRegSun,
  FaRegClock,
  FaUsers,
  FaBookmark,
  FaTrash,
  FaBook,
  FaFolder,
  FaFolderOpen,
  FaRegWindowClose,
  FaExchangeAlt,
  FaBars,
} from "react-icons/fa";
import Cookies from "universal-cookie";
import { authCookieName, getAuthToken, setAuthToken, disconnect } from "../components/AuthToken";
import GetApiPath, { postFetchAPI } from "../components/GetApiPath";
import Link from "next/link";
import { TrackFolderCreation, TrackNoteCreation } from "../components/Analytics";
import { NoteToPdf } from "../canvas/PDF/PdfExport";
import download from "downloadjs";
import JSZip from "jszip";
import { Spinner } from "../components/Spinner";

function DirListing({
  Symbol,
  symbolClassName,
  name,
  className,
  userPath,
  dirPath,
  style,
  onClick,
  children,
  link,
  openByDefault = false,
}) {
  let [open, setOpen] = useState(openByDefault);
  const selected = userPath && dirPath && userPath.toString() == dirPath.toString();
  if (
    !open &&
    userPath &&
    dirPath &&
    userPath.length > dirPath.length &&
    userPath.slice(0, dirPath.length).toString() == dirPath.toString()
  )
    setOpen(true);

  const Caret = open ? FaAngleDown : FaAngleRight;
  if (!Symbol) Symbol = open ? FaFolderOpen : FaFolder;
  if (link) open = false;

  const onClickCallback = () => {
    setOpen(!open || !selected);
    if (onClick !== undefined) {
      onClick();
    }
  };
  return (
    <div className="min-w-full w-fit">
      <button
        style={style}
        className={
          "flex flex-row items-center gap-2 px-4 py-2 outline-none min-w-full w-fit " +
          (selected ? "bg-gray-200 " : "hover:bg-gray-100 ") +
          (selected || open ? "text-black " : "") +
          className
        }
        onClick={onClickCallback}
      >
        <Caret className={(open ? "text-black" : "text-gray-400") + (link ? " opacity-0" : "")} />
        <Symbol className={symbolClassName + " text-2xl mr-1"} />
        <p className={"whitespace-nowrap mt-[0.15rem] font-bold " + (open ? "" : "")}>{name}</p>
      </button>
      <div className={open ? "" : "hidden"}>{children}</div>
    </div>
  );
}

function Note({ title, showSelect = false, isSelected = false }) {
  return (
    <button className="relative select-none flex flex-col items-center justify-center w-24 h-32 sm:w-32 sm:h-40 bg-note border-2 border-slate-800 rounded-xl shadow-inner duration-100 overflow-hidden">
      <p className="relative py-2 px-2 border-slate-800 bg-slate-800 w-[calc(100%+4px)] shadow-md text-white text-sm sm:text-lg text-center line-clamp-3">
        {title}
      </p>

      {showSelect && (
        <div
          className={`rounded-lg border-slate-800 border-4 bg-white px-2 font-bold absolute top-3 left-3 ${
            isSelected ? "text-slate-800" : "text-white"
          } text-center`}
        >
          x
        </div>
      )}
    </button>
  );
}

function Book({ title, showSelect = false, isSelected = false }) {
  return (
    <button className="relative select-none w-24 h-32 sm:w-32 sm:h-40 text-white duration-100 flex flex-col">
      <div className="bg-slate-800 h-5 w-12 rounded-t-xl -mb-2"></div>
      <div className="realtive bottom-0 h-full w-full flex flex-col justify-around p-2 items-center bg-slate-800 rounded-b-xl rounded-tr-xl overflow-hidden">
        {showSelect && (
          <div
            className={`rounded-lg border-slate-800 border-4 bg-white px-2 font-bold absolute top-3 left-3 ${
              isSelected ? "text-slate-800" : "text-white"
            } text-center`}
          >
            x
          </div>
        )}

        <FaPencilAlt className="text-3xl sm:text-4xl" />
        <p className="text-sm sm:text-lg text-center line-clamp-2"> {title} </p>
      </div>
    </button>
  );
}

function AddButton({ onClick }) {
  return (
    <>
      <button
        onClick={onClick}
        className="relative w-24 h-32 sm:w-32 sm:h-40 text-gray-200 border-4 rounded-xl text-9xl select-none"
      >
        +
      </button>
    </>
  );
}

function MobileMenu() {
  let [open, setOpen] = useState(false);

  function toggleOpen() {
    if (!open) {
      // disable scrolling
      document.body.style.position = "fixed";
      document.body.style.top = `-${window.scrollY}px`;
    } else {
      // enable scrolling
      document.body.style.position = "";
      document.body.style.top = "";

      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      window.scrollTo(0, parseInt(scrollY || "0") * -1);
    }

    setOpen(!open);
  }

  return (
    <>
      <button className="sm:hidden flex items-center justify-center w-10 h-10 rounded-full" onClick={toggleOpen}>
        <FaBars className="text-3xl text-gray-500" />
      </button>
      <div
        className={`fixed h-screen w-screen bg-black z-10 ${
          open ? "opacity-50" : "opacity-0 pointer-events-none"
        } transition-all duration-200 top-0 left-0`}
        onClick={toggleOpen}
      ></div>
      <div
        className={`fixed h-screen p-0 w-[70vw] bg-white z-20 ${
          open ? "translate-x-0" : "-translate-x-full"
        } transition-all duration-200 top-0 left-0 overflow-scroll`}
      >
        <FileTree className="pt-10 pb-52 w-full" />
      </div>
    </>
  );
}

function FileTree({ className, files, path, setPath }) {
  const symbols = {
    "f/notes": FaBook,
  };

  const buildDirListing = (dir, dirPath, openByDefault = false) => {
    return (
      <DirListing
        key={dir._id}
        Symbol={symbols[dir._id]}
        name={dir.name}
        userPath={path}
        dirPath={dirPath}
        style={{ paddingLeft: `${dirPath.length}rem` }}
        onClick={() => setPath(dirPath)}
        openByDefault={openByDefault}
      >
        {dir.children.filter((f) => f.type == "folder").map((f) => buildDirListing(f, dirPath.concat(f._id)))}
      </DirListing>
    );
  };

  return (
    <div className={`${className} h-full text-gray-500 sm:flex flex-col`} style={{ overflow: "overlay" }}>
      <div className="min-w-full w-fit">
        {/*
        <DirListing Symbol={FaRegClock} symbolClassName="mt-[0.1rem]" name="Recent" link></DirListing>
        <DirListing Symbol={FaUsers} symbolClassName="mt-[0.1rem]" name="Shared with me" link></DirListing>
        <DirListing Symbol={FaBookmark} name="Homework" link></DirListing>
        <DirListing Symbol={FaTrash} name="Trash" link></DirListing>
        <div className="mt-5"></div>
        */}

        {files && buildDirListing(files["f/notes"], ["f/notes"], true)}
      </div>
    </div>
  );
}

function PathNavigator({ files, path, setPath }) {
  let p = [];

  p.push(
    <div
      key={p.length}
      onClick={() => setPath(path.slice(0, 1))}
      className="flex flex-row items-center gap-3 -ml-4 px-4 py-1 rounded-full cursor-pointer"
    >
      <FaBook />
      {files && files[path[0]].name}
    </div>
  );

  for (let i = 1; i < path.length; i++) {
    p.push(<FaAngleRight key={p.length} className="sm:mx-4" />);
    p.push(
      <p
        key={p.length}
        onClick={() => setPath(path.slice(0, i + 1))}
        className="px-2 sm:px-4 py-1 rounded-full cursor-pointer"
      >
        {files[path[i]].name}
      </p>
    );
  }

  return (
    <div className="text-md sm:text-xl text-gray-700 font-bold flex flex-row items-center -ml-3 flex-wrap">{p}</div>
  );
}

function RemoveFilesModal({ visible, setVisible, removeFiles }) {
  const onRemoveClick = () => {
    removeFiles();
    setVisible(false);
  };
  return (
    <div
      className={
        (!visible ? "hidden" : "") +
        " absolute inset-0 w-screen h-screen bg-opacity-50 bg-black flex justify-center items-center"
      }
    >
      <div onClick={() => setVisible(false)} className="absolute inset-0"></div>
      <div className={`relative w-96 h-72 bg-white rounded-lg shadow-lg p-5 flex flex-col text-lg justify-between`}>
        <div className="flex grid-cols-2 w-full gap-4 font-semibold justify-center">Remove notes</div>

        <div>
          <div>Are you sure you want to delete these notes?</div>
          <div className="text-red-500 font-bold mt-2">This connot be undone</div>
        </div>

        <div className="flex justify-between">
          <button
            className="text-gray-600 hover:bg-gray-200 w-fit px-4 py-1 rounded-full self-center"
            onClick={() => setVisible(false)}
          >
            Cancel
          </button>
          <button
            onClick={onRemoveClick}
            className="bg-red-600 hover:bg-red-700 text-white w-fit px-4 py-1 rounded-full self-center"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function MoveModalListing({ files, setSelected, selectedFiles, target }) {
  if (files == null) {
    return <></>;
  }

  const forbidden = new Set(Object.values(selectedFiles).map((x) => x._id));

  const TreeRepr = (folder, setSelected, prefixLength = 0) => {
    const folders = folder.children.filter((x) => x.type == "folder");
    const [isOpen, setOpen] = useState(folder.name == "My Notes");

    const Folder = isOpen ? FaFolderOpen : FaFolder;
    const children = folders.map((folder) => TreeRepr(folder, setSelected, prefixLength + 1));
    const prefix = "\u00a0".repeat(prefixLength);

    let onDoubleClick = null;
    let onClick = null;
    let renderChildren = !forbidden.has(folder._id);

    if (renderChildren) {
      onDoubleClick = () => setOpen(!isOpen);
      onClick = () => setSelected(folder._id);
    }

    return (
      <div key={folder._id || -1}>
        <div
          onDoubleClick={onDoubleClick}
          onClick={onClick}
          className={`flex items-center hover:bg-gray-200 ${
            target == folder._id ? "bg-gray-600 hover:bg-gray-800 text-white" : ""
          } text-md`}
        >
          {prefix} <Folder className="h-4 w-4" /> &nbsp;{" "}
          <span className={forbidden.has(folder._id) ? "line-through" : ""}>{folder.name}</span>
        </div>
        {renderChildren && isOpen && children}
      </div>
    );
  };

  const tree = files ? TreeRepr(files["f/notes"], setSelected) : <></>;

  return <div className="overflow-scroll border-4 rounded-lg h-44 cursor-pointer select-none">{tree}</div>;
}

function MoveFilesModal({ visible, setVisible, files = [], selectedFiles = {}, moveFiles }) {
  const [target, setTarget] = useState(null);
  const onMoveClick = () => {
    moveFiles(target);
    setVisible(false);
  };

  const closeModal = () => {
    setTarget(null);
    setVisible(false);
  };

  const canMove = target != null;

  return (
    <div
      className={
        (!visible ? "hidden" : "") +
        " absolute inset-0 w-screen h-screen bg-opacity-50 bg-black flex justify-center items-center"
      }
    >
      <div onClick={closeModal} className="absolute inset-0"></div>
      <div className={`relative w-96 h-84 bg-white rounded-lg shadow-lg p-5 flex flex-col text-lg justify-between`}>
        <div className="flex grid-cols-2 w-full gap-4 font-semibold justify-center mb-8">Move notes</div>

        <div>
          <MoveModalListing files={files} setSelected={setTarget} target={target} selectedFiles={selectedFiles} />
        </div>

        <div className="italic text-sm text-center">
          * Click to select, double-click to open. Impossible to move to dashed folders.
        </div>

        <div className="flex justify-between mt-8">
          <button
            className="text-gray-600 hover:bg-gray-200 w-fit px-4 py-1 rounded-full self-center"
            onClick={closeModal}
          >
            Cancel
          </button>
          <button
            disabled={!canMove}
            onClick={onMoveClick}
            className={` ${
              canMove ? "hover:bg-slate-700 bg-slate-600" : "bg-slate-400"
            } text-white w-fit px-4 py-1 rounded-full self-center`}
          >
            Move files
          </button>
        </div>
      </div>
    </div>
  );
}

function ExportFilesModal({ setVisible, selectedFiles = {}, setSelectedFiles }) {
  const [exporting, setExporting] = useState(false);

  const downloadNotes = async () => {
    const files = Object.values(selectedFiles);

    const exportFiles = async (root, files) => {
      for (const file of files) {
        if (file.type == "note") {
          const bytes = await NoteToPdf(file.fileId);
          root.file(file.name + ".pdf", bytes);
        } else if (file.type == "folder") {
          const newFolder = root.folder(file.name);
          await exportFiles(newFolder, file.children);
        }
      }
    };

    setExporting(true);

    if (files.length == 1 && files[0].type == "note") {
      const bytes = await NoteToPdf(files[0].fileId);
      download(bytes, files[0].name + ".pdf", "application/pdf");
    } else {
      let zip = new JSZip();
      await exportFiles(zip, files);
      const zipBytes = await zip.generateAsync({ type: "blob" });

      download(zipBytes, `Inck Notes Export.zip`, "application/zip");
    }

    setExporting(false);
    setVisible(false);
    setSelectedFiles({});
  };

  return (
    <div className={"absolute inset-0 w-screen h-screen bg-opacity-50 bg-black flex justify-center items-center"}>
      <div onClick={() => setVisible(false)} className="absolute inset-0"></div>
      <div className={`relative w-96 h-84 bg-white rounded-lg shadow-lg p-5 flex flex-col text-lg justify-between`}>
        <div className="flex grid-cols-2 w-full gap-4 font-semibold justify-center mb-8">Export to PDF</div>

        <div className="text-sm text-center mb-8">Would you like to download selected notes as PDF?</div>

        <div className="flex justify-between ">
          {exporting ? (
            <Spinner className="h-10 mx-auto" />
          ) : (
            <>
              <button
                className="text-gray-600 hover:bg-gray-200 w-fit px-4 py-1 rounded-full self-center"
                onClick={() => setVisible(false)}
              >
                Cancel
              </button>
              <button
                onClick={downloadNotes}
                className="hover:bg-slate-700 bg-slate-600 text-white w-fit px-4 py-1 rounded-full self-center"
              >
                Download
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EditFileModal({ visible, setVisible, file, save }) {
  // menuType is either 'note' or 'folder'
  const [newName, setNewName] = useState("");
  const [newNoteAccess, setNewNoteAccess] = useState(file.defaultAccess || "private");

  const fileType = file !== undefined ? file.type : "";
  const isAccessVisible = fileType == "note";

  const hideModal = () => {
    setNewName("");
    setNewNoteAccess("");
    setVisible(false);
  };

  const saveEdits = () => {
    const trimmedNewName = newName.trim();
    let name = "";
    if (trimmedNewName == "") {
      name = file.name;
    } else {
      name = trimmedNewName;
    }
    save(file._id, name, newNoteAccess);
    hideModal();
  };

  return (
    <div
      className={
        (!visible ? "hidden" : "") +
        " absolute inset-0 w-screen h-screen bg-opacity-50 bg-black flex justify-center items-center"
      }
    >
      <div onClick={hideModal} className="absolute inset-0"></div>
      <div className={`relative w-96 h-72 bg-white rounded-lg shadow-lg p-5 flex flex-col text-lg justify-between`}>
        <div className="flex grid-cols-2 w-full gap-4 font-semibold justify-center">
          Edit {file !== undefined && file.type}
        </div>
        <div className={"flex" + " flex-col gap-6"}>
          <div className="flex gap-4">
            Name
            <input
              placeholder={file.name}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="bg-gray-100 w-full border-[1px] px-2 border-gray-400 rounded-md"
            />
          </div>
          <div className={`flex gap-4 ${isAccessVisible ? "" : "hidden"}`}>
            Public&nbsp;access
            <select
              value={newNoteAccess}
              onChange={(e) => setNewNoteAccess(e.target.value)}
              className="bg-gray-100 w-full border-[1px] px-2 border-gray-400 rounded-md"
            >
              <option value="read_write">View &amp; edit</option>
              <option value="read_only">View only</option>
              <option value="private">No public access</option>
            </select>
          </div>
        </div>
        <button
          onClick={saveEdits}
          className="bg-slate-800 hover:bg-black text-white w-fit px-4 py-1 rounded-full self-center"
        >
          Save modifications
        </button>
      </div>
    </div>
  );
}

function CreateNoteSubmodal({ name, setName, publicAccess, setPublicAccess }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-4">
        Name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-gray-100 w-full border-[1px] px-2 border-gray-400 rounded-md"
        />
      </div>
      <div className="flex gap-4">
        Public&nbsp;access
        <select
          value={publicAccess}
          onChange={(e) => setPublicAccess(e.target.value)}
          className="bg-gray-100 w-full border-[1px] px-2 border-gray-400 rounded-md"
        >
          <option value="read_write">View &amp; edit</option>
          <option value="read_only">View only</option>
          <option value="private">No public access</option>
        </select>
      </div>
    </div>
  );
}

function CreateFolderSubmodal({ name, setName, publicAccess, setPublicAccess }) {
  return (
    <div className="folder flex-col gap-6">
      <div className="flex gap-4">
        Name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-gray-100 w-full border-[1px] px-2 border-gray-400 rounded-md"
        />
      </div>
    </div>
  );
}

function PDFDropZone({ setPdfContent, setFileSize }) {
  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const [file] = acceptedFiles;
        setFileSize(file.size);

        const formData = new FormData();
        formData.append("file", file);
        setPdfContent(formData);
      }
    },
    [setPdfContent, setFileSize]
  );
  const { acceptedFiles, getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
  });

  const isFileSelected = acceptedFiles.length > 0;

  let dropZoneContent;

  if (isDragActive) {
    dropZoneContent = "Drop the files here ...";
  } else if (acceptedFiles.length == 0) {
    dropZoneContent = "Drop file here, or click to select ...";
  } else {
    dropZoneContent = acceptedFiles[0].name;
  }

  return (
    <div
      {...getRootProps({
        className: `rounded-md p-3 border-dashed border-slate-500 border-2 text-sm h-16 italic 
                  ${isFileSelected ? "" : "justify-center"} flex items-center  focus:none hover:bg-slate-100 ${
          isDragActive ? "bg-slate-100" : ""
        }
                  
                  `,
      })}
    >
      <input {...getInputProps()} />
      <p className="truncate text-ellipsis w-72">{dropZoneContent}</p>
    </div>
  );
}

function ImportPDFSubmodal({ name, setName, publicAccess, setPublicAccess, setPdfContent }) {
  const [fileSize, setFileSize] = useState(0);
  const fileSizeFormat = (Math.round(fileSize * 1e-4) * 1e-2).toFixed(2);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-4">
        Name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-gray-100 w-full border-[1px] px-2 border-gray-400 rounded-md"
        />
      </div>

      <div className="flex gap-4">
        Public&nbsp;access
        <select
          value={publicAccess}
          onChange={(e) => setPublicAccess(e.target.value)}
          className="bg-gray-100 w-full border-[1px] px-2 border-gray-400 rounded-md"
        >
          <option value="read_write">View &amp; edit</option>
          <option value="read_only">View only</option>
          <option value="private">No public access</option>
        </select>
      </div>

      <div>
        <PDFDropZone setFileSize={setFileSize} setPdfContent={setPdfContent} />
        <p className={`text-sm text-right italic ${fileSize > 0.0 ? "" : "invisible"}`}>
          File size: {fileSizeFormat} MB
        </p>
      </div>
    </div>
  );
}

function ImportFreeNoteSubmodal({ name, setName, publicAccess, setPublicAccess, importNoteURL, setImportNoteURL }) {
  return <div className="flex flex-col italic">Soon</div>;
  return (
    <div>
      <div className="flex flex-col gap-6">
        <div className="flex gap-4">
          Note&nbsp;name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-gray-100 w-full border-[1px] px-2 border-gray-400 rounded-md"
          />
        </div>

        <div className="flex gap-4">
          Note&nbsp;URL
          <input
            value={importNoteURL}
            onChange={(e) => setImportNoteURL(e.target.value)}
            className="bg-gray-100 w-full border-[1px] px-2 border-gray-400 rounded-md"
          />
        </div>

        <div className="flex gap-4">
          Public&nbsp;access
          <select
            value={publicAccess}
            onChange={(e) => setPublicAccess(e.target.value)}
            className="bg-gray-100 w-full border-[1px] px-2 border-gray-400 rounded-md"
          >
            <option value="read_write">View &amp; edit</option>
            <option value="read_only">View only</option>
            <option value="private">No public access</option>
          </select>
        </div>
      </div>
    </div>
  );
}

async function CreateNote(name, parentDir, publicAccess) {
  TrackNoteCreation("simple");
  const files = addFile(name, "note", parentDir, {
    publicAccess,
  });
  return files;
}

async function newFolderSubmit(name, parentDir) {
  TrackFolderCreation();
  const files = addFile(name, "folder", parentDir);
  return files;
}

async function importPDFSubmit(name, parentDir, publicAccess, pdfFileContent) {
  if (!pdfFileContent) {
    return;
  }
  // Add fields to formData
  pdfFileContent.set("name", name);
  pdfFileContent.set("parentDir", parentDir);
  pdfFileContent.set("token", getAuthToken());
  pdfFileContent.set("defaultAccess", publicAccess);

  const response = await fetch(GetApiPath("/api/pdf/receive-pdf"), {
    method: "post",
    body: pdfFileContent,
  });
  const jsonReply = await response.json();

  if (jsonReply.status == "success") {
    TrackNoteCreation("pdf");
    return processFilesData(jsonReply.files);
  } else {
    throw Error("Failed to import PDF");
  }
}

async function importFreeNoteSubmit(name, parentDir, publicAccess, publicNoteURL) {
  TrackNoteCreation("public-import");
  return await importFreeNote(name, parentDir, publicAccess, publicNoteURL);
}

function CreateFileModal({ close, path, setFiles, reloadFiles }) {
  enum States {
    SELECT_ACTION,
    CREATE_NOTE,
    CREATE_FOLDER,
    IMPORT_PDF,
    IMPORT_NOTE,
  }

  const [state, setState] = useState(States.SELECT_ACTION);

  const [name, setName] = useState("");
  const [publicAccess, setPublicAccess] = useState("private");
  const [pdfContent, setPdfContent] = useState(null);
  const [importNoteURL, setImportNoteURL] = useState("");

  function ModalHeader() {
    function Element({ children, state }) {
      return (
        <button
          onClick={() => setState(state)}
          className={
            "p-4 gap-2 rounded-md border-2 border-gray-300 text-slate-800  bg-gray-100 hover:bg-slate-800 hover:border-slate-800 hover:text-white"
          }
        >
          {children}
        </button>
      );
    }

    return (
      <div className="flex items-center">
        <div className="text-3xl text-center">
          Create
          <br />
          new
        </div>
        <div className="w-1 h-60 bg-gray-200  rounded-full mx-8"></div>
        <div className="grid grid-cols-1 gap-3 w-fit">
          {/* New folder */}
          <Element state={States.CREATE_FOLDER}>
            <div className="grid grid-cols-[auto_auto] w-fit gap-3">
              <span className="material-symbols-outlined">folder</span> Folder
            </div>
          </Element>

          {/* New note */}
          <Element state={States.CREATE_NOTE}>
            <div className="grid grid-cols-[auto_auto] w-fit gap-3">
              <span className="material-symbols-outlined">description</span> Note
            </div>
          </Element>

          {/* Import PDF */}
          <Element state={States.IMPORT_PDF}>
            <div className="grid grid-cols-[auto_auto] w-fit gap-3">
              <span className="material-symbols-outlined">picture_as_pdf</span> PDF Note
            </div>
          </Element>
        </div>
      </div>
    );
  }

  const submit = async () => {
    const parentDir = path.at(-1);

    let newFiles;
    if (state == States.CREATE_NOTE) {
      newFiles = await CreateNote(name, parentDir, publicAccess);
    } else if (state == States.CREATE_FOLDER) {
      newFiles = await newFolderSubmit(name, parentDir);
    } else if (state == States.IMPORT_PDF) {
      newFiles = await importPDFSubmit(name, parentDir, publicAccess, pdfContent);
    } else if (state == States.IMPORT_NOTE) {
      newFiles = await importFreeNoteSubmit(name, parentDir, publicAccess, importNoteURL);
    }
    reloadFiles(newFiles);

    close();
  };

  function ModalBody() {
    if (state == States.SELECT_ACTION) {
      return <ModalHeader />;
    } else if (state == States.CREATE_NOTE) {
      return (
        <CreateNoteSubmodal
          name={name}
          setName={setName}
          publicAccess={publicAccess}
          setPublicAccess={setPublicAccess}
        />
      );
    } else if (state == States.CREATE_FOLDER) {
      return (
        <CreateFolderSubmodal
          name={name}
          setName={setName}
          publicAccess={publicAccess}
          setPublicAccess={setPublicAccess}
        />
      );
    } else if (state == States.IMPORT_PDF) {
      return (
        <ImportPDFSubmodal
          name={name}
          setName={setName}
          publicAccess={publicAccess}
          setPublicAccess={setPublicAccess}
          setPdfContent={setPdfContent}
        />
      );
    } else if (state == States.IMPORT_NOTE) {
      return (
        <ImportFreeNoteSubmodal
          name={name}
          setName={setName}
          publicAccess={publicAccess}
          setPublicAccess={setPublicAccess}
          importNoteURL={importNoteURL}
          setImportNoteURL={setImportNoteURL}
        />
      );
    }
  }

  return (
    <div className={`absolute inset-0 w-screen h-screen bg-opacity-50 bg-black flex justify-center items-center`}>
      <div onClick={() => close(false)} className="absolute inset-0"></div>
      <div className="relative w-96 h-96 bg-white rounded-lg shadow-lg p-5 flex flex-col text-lg">
        <div className="flex flex-row-reverse justify-between">
          <button className="self-end hover:text-red-500" onClick={close}>
            <span className="material-symbols-outlined">close</span>
          </button>
          {state != States.SELECT_ACTION && (
            <button className="self-end hover:text-blue-500" onClick={() => setState(States.SELECT_ACTION)}>
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
        </div>

        <div className="flex flex-col basis-full justify-center items-center">{ModalBody()}</div>

        {state != States.SELECT_ACTION && (
          <button
            onClick={submit}
            className="w-full bg-slate-800 hover:bg-black text-white px-4 py-1 rounded-md self-center"
          >
            Create
          </button>
        )}
      </div>
    </div>
  );
}

function processFilesData(fileList) {
  // Process data for UI
  const fileDict = {};

  for (const f of fileList) {
    fileDict[f._id] = f;
    if (f.type == "folder") fileDict[f._id].children = [];
  }
  fileDict["f/notes"] = { name: "My Notes", children: [], type: "folder", _id: -1 };
  fileDict["f/trash"] = { name: "Trash", children: [] };

  for (const f of fileList) {
    fileDict[f.parentDir].children.push(fileDict[f._id]);
  }

  for (const f of Object.values(fileDict))
    if (f.children) {
      f.children.sort((a, b) => {
        if (a.type != b.type) return a.type == "folder" ? -1 : 1;
        if (a.name != b.name) return a.name < b.name ? -1 : 1;
        return 0;
      });
    }

  return fileDict;
}

async function LoadFiles() {
  const response = await fetch(GetApiPath("/api/explorer/getfiles"), {
    method: "post",
    body: JSON.stringify({ token: getAuthToken() }),
    headers: {
      "Content-type": "application/json;charset=UTF-8",
    },
  });
  const json = await response.json();

  const fileList = json.files;
  return processFilesData(fileList);
}

async function addFile(name, type, parentDir, options = {}) {
  const response = await fetch(GetApiPath("/api/explorer/addfile"), {
    method: "post",
    body: JSON.stringify({ token: getAuthToken(), name, type, parentDir, options }),
    headers: {
      "Content-type": "application/json;charset=UTF-8",
    },
  });

  const jsonReply = await response.json();
  const filesDict = processFilesData(jsonReply.files);
  return filesDict;
}

async function importFreeNote(name, parentDir, visibility, freeNoteURL) {
  const response = await fetch(GetApiPath("/api/explorer/import-free-note"), {
    method: "post",
    body: JSON.stringify({
      token: getAuthToken(),
      name,
      parentDir,
      visibility,
      freeNoteURL,
    }),
    headers: {
      "Content-type": "application/json;charset=UTF-8",
    },
  });

  const jsonReply = await response.json();
  if (jsonReply.files != undefined) {
    return processFilesData(jsonReply.files);
  } else {
    throw Error("API failed to return new files");
  }
}

async function editFileAPICall(id, newName, newVisibility = null, options = {}) {
  const response = await fetch(GetApiPath("/api/explorer/editfile"), {
    method: "post",
    body: JSON.stringify({
      token: getAuthToken(),
      id: id,
      newName: newName,
      newVisibility: newVisibility,
      options: options,
    }),
    headers: {
      "Content-type": "application/json;charset=UTF-8",
    },
  });

  const jsonReply = await response.json();
  return processFilesData(jsonReply.files);
}

async function removeFilesAPICall(notes) {
  const notesData = notes.map((x) => ({
    type: x.type,
    _id: x._id,
  }));

  const response = await fetch(GetApiPath("/api/explorer/removefiles"), {
    method: "post",
    body: JSON.stringify({
      token: getAuthToken(),
      notesToRemove: notesData,
    }),
    headers: {
      "Content-type": "application/json;charset=UTF-8",
    },
  });

  const jsonReply = await response.json();
  return processFilesData(jsonReply.files);
}

async function moveFilesAPICall(notes, _target) {
  // Send only required stuff
  const target = _target == -1 ? "f/notes" : _target;
  const notesData = Object.values(notes).map((x) => {
    return {
      type: x.type,
      _id: x._id,
    };
  });

  const response = await fetch(GetApiPath("/api/explorer/movefiles"), {
    method: "post",
    body: JSON.stringify({
      token: getAuthToken(),
      notesToMove: notesData,
      target: target,
    }),
    headers: {
      "Content-type": "application/json;charset=UTF-8",
    },
  });

  const jsonReply = await response.json();
  const filesDict = processFilesData(jsonReply.files);
  return filesDict;
}

enum Modals {
  NONE,
  CREATE_FILE,
  EDIT_FILE,
  REMOVE_FILES,
  MOVE_FILES,
  EXPORT_FILES,
}

export default function Explorer() {
  const [files, setFiles] = useState(null);
  const [path, setPath] = useState(["f/notes"]);
  const [modal, setModal] = useState(Modals.NONE);
  const closeModal = () => setModal(Modals.NONE);

  const [selectedFiles, setSelectedFiles] = useState({});
  const firstSelectedElement = selectedFiles[Object.keys(selectedFiles)[0]];

  const isSelecting = Object.keys(selectedFiles).length > 0;

  const updateFiles = (newFiles) => {
    setFiles(newFiles);
    setSelectedFiles({});
  };

  let selectionWidget;

  // Toggle file selection
  if (isSelecting) {
    const oneSelected = Object.keys(selectedFiles).length == 1;

    selectionWidget = (
      <div className="flex w-full justify-between rounded-xl border-2 overflow-clip">
        <button
          className="hover:bg-gray-300 px-3 flex items-center justify-center"
          onClick={() => setSelectedFiles({})}
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
        <button
          onClick={() => setModal(Modals.REMOVE_FILES)}
          className="hover:bg-gray-300 disabled:opacity-20 disabled:hover:bg-inherit px-4 py-3"
        >
          <FaTrash />
        </button>
        <button
          onClick={() => setModal(Modals.EDIT_FILE)}
          disabled={!oneSelected}
          className="hover:bg-gray-300 disabled:opacity-20 disabled:hover:bg-inherit px-4 py-3"
        >
          <FaRegSun />
        </button>
        <button
          onClick={() => setModal(Modals.MOVE_FILES)}
          className="hover:bg-gray-300 flex items-center justify-center disabled:opacity-20 disabled:hover:bg-inherit px-4"
        >
          <span className="material-symbols-outlined text-xl">drive_file_move</span>
        </button>
        <button
          onClick={() => setModal(Modals.EXPORT_FILES)}
          className="hover:bg-gray-300 flex items-center justify-center disabled:opacity-20 disabled:hover:bg-inherit px-4"
        >
          <span className="material-symbols-outlined text-xl">download</span>
        </button>
      </div>
    );
  } else {
    selectionWidget = <></>;
  }

  const fileClickAction = (f) => {
    if (isSelecting) {
      const newState = { ...selectedFiles };
      if (f._id in newState) {
        delete newState[f._id];
      } else {
        newState[f._id] = f;
      }
      setSelectedFiles(newState);
    } else {
      if (f.type == "folder") {
        setPath(path.concat([f._id]));
      } else {
        window.open("/note/" + f.fileId, "_blank");
      }
    }
  };

  const drawExplorerItem = (f, idx, _) => {
    const isSelected = isSelecting && f._id in selectedFiles;

    const LONG_PRESS_DURAION = 500;
    let longPressTimeout: number;

    const startPress = (e: PointerEvent) => {
      if (isSelecting) {
        fileClickAction(f);
      } else if (e.button == 0) {
        if (longPressTimeout) {
          window.clearTimeout(longPressTimeout);
          longPressTimeout = null;
        }
        longPressTimeout = window.setTimeout(handleLongPress, LONG_PRESS_DURAION);
      } else {
        handleLongPress();
        e.preventDefault();
      }
    };
    const cancelPress = () => {
      if (longPressTimeout) {
        window.clearTimeout(longPressTimeout);
        longPressTimeout = null;
      }
    };

    const handleClick = () => {
      if (longPressTimeout) {
        cancelPress();
        fileClickAction(f);
      }
    };
    const handleLongPress = () => {
      if (!isSelecting) {
        longPressTimeout = null;
        setSelectedFiles({ [f._id]: f });
      }
    };

    const Component = f.type == "folder" ? Book : Note;

    return (
      <div
        onPointerDown={startPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        onContextMenu={(e) => e.preventDefault()}
        onClick={handleClick}
        key={f.fileId}
      >
        <Component isSelected={isSelected} showSelect={isSelecting} title={f.name} />
      </div>
    );
  };

  const reload = async () => {
    setSelectedFiles({});
    setFiles(await LoadFiles());
  };

  useEffect(() => {
    reload();
  }, []);

  return (
    <div>
      <Head>
        <title>Inck - Explorer</title>
        <meta name="description" content="The only ink that you will ever need" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="font-round">
        <div className="relative flex flex-col w-[100vw] h-[100vh]">
          {/** Top bar */}
          <div className="flex flex-row gap-10 sm:gap-10 justify-between h-16 items-center px-4 sm:px-6 border-b-[1px] bg-white border-gray-300">
            {/* A menu that slides from the left
            Maybe add back one day
            <MobileMenu />*/}

            <div className="hidden sm:flex flex-row gap-3 items-center text-gray-800">
              <FaPencilAlt className="text-2xl" />
              <p className="font-extrabold tracking-wider text-2xl text-gr mt-[0.1rem]">Inck</p>
            </div>

            <div className="justify-center align-middle">{selectionWidget}</div>
            {/* Spacer invisible div */}
            <div className="w-full" />
            {/*
            // SEARCH BAR
            <div className="flex bg-gray-100 border-[1px] border-gray-300 text-gray-500 flex-row items-center h-10 overflow-hidden w-full max-w-xl rounded-lg">
              <button className="group pl-2 h-10 flex items-center justify-center">
                <div className="group-hover:bg-gray-300 flex items-center justify-center w-8 h-8 rounded-full">
                  <FaSearch />
                </div>
              </button>
              <input
                className="pl-2 bg-transparent focus:outline-none text-gray-900 placeholder-gray-400"
                placeholder="Search notes"
              />

            </div>
            
            */}

            <div className="flex flex-row gap-2">
              {/*}
              <Link href="/faq">
                <a className="hover:bg-gray-300 flex items-center justify-center w-10 h-10 rounded-full cursor-pointer">
                  <FaRegQuestionCircle className="text-2xl" />
                </a>
              </Link>
          */}

              <Link href="/settings">
                <a className="hover:bg-gray-300 flex items-center justify-center w-10 h-10 rounded-full cursor-pointer">
                  <FaRegSun className="text-2xl" />
                </a>
              </Link>

              <button
                onClick={() => disconnect()}
                className="hover:bg-gray-300 flex items-center justify-center w-10 h-10 rounded-full"
              >
                <span className="material-symbols-outlined text-2xl">logout</span>
              </button>
            </div>
          </div>

          <div className="h-full w-full flex flex-row pt-4 overflow-hidden">
            <FileTree
              files={files}
              path={path}
              setPath={setPath}
              className="hidden sm:flex pb-10 w-96 border-r-[1px] border-gray-300"
            />

            <div className="relative flex flex-col w-full h-full px-10 py-3 overflow-scroll">
              <PathNavigator files={files} path={path} setPath={setPath} />

              {/** Notes */}
              <div className="flex flex-row flex-wrap gap-4 sm:gap-8 pt-8 sm:pt-16 pb-40 justify-around sm:justify-start">
                {files && files[path.at(-1)].children.map(drawExplorerItem)}

                <AddButton
                  onClick={() => {
                    setModal(Modals.CREATE_FILE);
                    //reloadFiles();
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Create file modal */}
        {modal == Modals.CREATE_FILE && <CreateFileModal close={closeModal} reload={reload} path={path} />}
        {/* Edit file modal */}
        {modal == Modals.EDIT_FILE && (
          <EditFileModal
            file={firstSelectedElement}
            close={closeModal}
            setFiles={setFilesAfterChange}
            save={(id, newName, newVisibility, options) => {
              editFileAPICall(id, newName, setFilesAfterChange, newVisibility, options);
              setSelectedFiles({});
            }}
          />
        )}
        {/* Remove files modal */}
        {modal == Modals.REMOVE_FILES && (
          <RemoveFilesModal
            close={closeModal}
            setFiles={setFilesAfterChange}
            removeFiles={() => {
              removeFilesAPICall(Object.values(selectedFiles), setFilesAfterChange);
              setSelectedFiles({});
            }}
          />
        )}
        {/* Move files modal */}
        {modal == Modals.MOVE_FILES && (
          <MoveFilesModal
            files={files}
            selectedFiles={selectedFiles}
            close={closeModal}
            setFiles={setFilesAfterChange}
            moveFiles={(target) => {
              moveFilesAPICall(selectedFiles, target, setFilesAfterChange);
              setSelectedFiles({});
            }}
          />
        )}
        {modal == Modals.EXPORT_FILES && (
          <ExportFilesModal selectedFiles={selectedFiles} setSelectedFiles={setSelectedFiles} close={closeModal} />
        )}
      </main>
    </div>
  );
}