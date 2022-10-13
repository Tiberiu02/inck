import Head from "next/head";
import React, { useState, useEffect, PointerEvent, ReactNode } from "react";
import { FaAngleDown, FaAngleRight, FaBook, FaFolder, FaFolderOpen } from "react-icons/fa";
import { getAuthToken } from "../AuthToken";
import { IconType } from "react-icons/lib";
import { HttpServer } from "../../ServerConnector";

import { FileTypes, AccessTypes, FileData } from "@inck/common-types/Files";
import { LoadingPage } from "../LoadingPage";
import { InitTawkTo } from "../tawk.to/InitTawkTo";
import { NavBar } from "./NavBar";
import { ModalTypes, DisplayModal } from "./DisplayModal";
import { FolderInfo, NoteInfo, FileTree, FileInfo } from "./types";
import { SelectionOptionsWidget } from "./OptionsWidget";
import { NoteData } from "../../types/canvas";
import { MaterialSymbol } from "../MaterialSymbol";
import { resolve } from "path";
import { LocalStorage } from "../../LocalStorage";
import { SyncNote } from "./SyncNote";

type DirListingProps = {
  Symbol: IconType;
  dirName: string;
  dirPath: string[];
  userPath: string[];
  onClick: () => void;
  openByDefault?: boolean;
  children: ReactNode[];
};

function DirListing({ Symbol, dirName, dirPath, userPath, onClick, children, openByDefault = false }: DirListingProps) {
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

  const onClickCallback = () => {
    setOpen(!open || !selected);
    if (onClick !== undefined) {
      onClick();
    }
  };
  return (
    <div key={dirPath.toString()} className="min-w-full w-fit">
      <button
        style={{ paddingLeft: `${dirPath.length}rem` }}
        className={
          "flex flex-row items-center gap-2 px-4 py-2 outline-none min-w-full w-fit " +
          (selected ? "bg-gray-200 " : "hover:bg-gray-100 ") +
          (selected || open ? "text-black " : "")
        }
        onClick={onClickCallback}
      >
        <Caret className={open ? "text-black" : "text-gray-400"} />
        <Symbol className={" text-2xl mr-1"} />
        <p className={"whitespace-nowrap mt-[0.15rem] font-bold " + (open ? "" : "")}>{dirName}</p>
      </button>
      <div className={open ? "" : "hidden"}>{children}</div>
    </div>
  );
}

function FileTree({ className, files, path, setPath }) {
  const symbols = {
    "f/notes": FaBook,
  };

  const buildDirListing = (dir: FolderInfo, dirPath: string[], openByDefault = false) => {
    return (
      <DirListing
        Symbol={symbols[dir._id]}
        key={dir._id}
        dirName={dir.name}
        userPath={path}
        dirPath={dirPath}
        onClick={() => setPath(dirPath)}
        openByDefault={openByDefault}
      >
        {dir.children
          .filter((f) => f.type == FileTypes.FOLDER)
          .map((f: FolderInfo) => buildDirListing(f, dirPath.concat(f._id)))}
      </DirListing>
    );
  };

  return (
    <div className={`${className} h-full text-gray-500 sm:flex flex-col`} style={{ overflow: "overlay" }}>
      <div className="min-w-full w-fit">{buildDirListing(files["f/notes"], ["f/notes"], true)}</div>
    </div>
  );
}

function Note({ title, isSelected = false }) {
  const longest = Math.max(...title.split(" ").map((s) => s.length));
  const textSize = longest <= 10 ? "text-sm sm:text-lg" : longest <= 15 ? "text-xs sm:text-base" : "text-xs sm:text-sm";

  return (
    <button className="no-tap-highlight relative rounded-xl overflow-hidden">
      <div className="flex flex-col items-center justify-center w-32 h-24 sm:w-40 sm:h-32 bg-note border-2 border-slate-800 rounded-xl shadow-inner duration-100">
        <p
          className={`relative py-1 px-3 w-[calc(100%+0.5rem)] bg-slate-800 shadow-md text-white ${textSize} text-center line-clamp-3`}
        >
          {title}
        </p>
      </div>
      {isSelected && <div className="absolute inset-0 bg-select opacity-select"></div>}
    </button>
  );
}

function Book({ title = "", isSelected = false }) {
  const longest = Math.max(...title.split(" ").map((s) => s.length));
  const textSize = longest <= 10 ? "text-sm sm:text-lg" : longest <= 15 ? "text-xs sm:text-base" : "text-xs sm:text-sm";

  return (
    <button className="relative no-tap-highlight w-32 h-24 sm:w-40 sm:h-32 text-white duration-100 flex flex-col">
      <div className="relative bg-slate-800 h-7 w-14 rounded-t-xl -mb-2 overflow-hidden">
        {isSelected && <div className="absolute inset-0 bg-select opacity-select"></div>}
      </div>
      <div className="relative bottom-0 h-full w-full flex flex-col justify-center p-2 items-center bg-slate-800 rounded-b-xl rounded-tr-xl overflow-hidden">
        <p className={`${textSize} px-2 w-[calc(100%+0.5rem)] text-center line-clamp-3`}> {title} </p>
        {isSelected && <div className="absolute inset-0 bg-select opacity-select"></div>}
      </div>
    </button>
  );
}

function AddButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="relative w-32 h-24 sm:w-40 sm:h-32 text-gray-200 border-4 rounded-xl text-8xl sm:text-9xl overflow-hidden"
    >
      +
    </button>
  );
}

function PathNavigator({ files, path, setPath }) {
  let p = [];

  let ix = 0;
  function pushPathItem(children: ReactNode) {
    const currPath = path.slice(0, (ix += 1));
    p.push(
      <div
        key={p.length}
        onClick={() => setPath(currPath)}
        className="px-4 -mx-4 py-1 rounded-full cursor-pointer hover:bg-slate-200"
      >
        {children}
      </div>
    );
  }

  for (const folder of path) {
    if (folder == "f/notes") {
      pushPathItem(
        <div className="flex flex-row items-center gap-3">
          <FaBook />
          {"My Notes"}
        </div>
      );
    } else {
      p.push(<FaAngleRight key={p.length} />);
      pushPathItem(files[folder].name);
    }
  }

  return (
    <div className="text-md sm:text-xl text-gray-700 font-bold flex flex-row items-center -ml-3 flex-wrap gap-4">
      {p}
    </div>
  );
}

// Backend functions
function ProcessFilesData(rawFileList: FileData[]): FileTree {
  // Process data for UI
  const fileDict: FileTree = {};

  for (const f of rawFileList) {
    if (f.type == FileTypes.FOLDER) {
      const folder: FolderInfo = {
        _id: f._id,
        name: f.name,
        type: FileTypes.FOLDER,
        children: [],
      };
      fileDict[f._id] = folder;
    } else if (f.type == FileTypes.NOTE) {
      const note: NoteInfo = {
        _id: f._id,
        name: f.name,
        fileId: f.fileId,
        type: FileTypes.NOTE,
        defaultAccess: f.defaultAccess,
        backgroundType: f.backgroundType,
        backgroundOptions: f.backgroundOptions || {},
      };
      fileDict[f._id] = note;
    }
  }
  fileDict["f/notes"] = { name: "My Notes", children: [], type: FileTypes.FOLDER, _id: "f/notes" };
  fileDict["f/trash"] = { name: "Trash", children: [], type: FileTypes.FOLDER, _id: "f/trash" };

  for (const f of rawFileList) {
    if (fileDict[f.parentDir]) {
      (fileDict[f.parentDir] as FolderInfo).children.push(fileDict[f._id]);
    } else {
      console.warn("detected orphan file", { f, rawFileList, fileDict });
    }
  }

  for (const f of Object.values(fileDict))
    if (f.type == FileTypes.FOLDER) {
      (f as FolderInfo).children.sort((a, b) => {
        if (a.type != b.type) return a.type == FileTypes.FOLDER ? -1 : 1;
        if (a.name != b.name) return a.name < b.name ? -1 : 1;
        return 0;
      });
    }

  return fileDict;
}

async function GetFiles(): Promise<FileTree> {
  if (!getAuthToken()) {
    throw new Error("not logged in");
  }
  const filesData = await HttpServer.files.getFiles(getAuthToken());
  return ProcessFilesData(filesData);
}

function FileExplorer({ files, path, selectedFiles, setPath, setSelectedFiles, setModal }) {
  const isSelecting = Object.keys(selectedFiles).length > 0;
  const currentFolder = files[path.at(-1)];

  const fileClickAction = (f: FileInfo) => {
    if (isSelecting) {
      const newState = { ...selectedFiles };
      if (f._id in newState) {
        delete newState[f._id];
      } else {
        newState[f._id] = f;
      }
      setSelectedFiles(newState);
    } else {
      if (f.type == FileTypes.FOLDER) {
        setPath(path.concat([f._id]));
      } else if (f.type == FileTypes.NOTE) {
        const noteId = (f as NoteInfo).fileId;
        window.open(`/note/${noteId}`, "_blank");
      }
    }
  };

  const drawExplorerItem = (f: FileInfo) => {
    const isSelected = f._id in selectedFiles;

    const LONG_PRESS_DURAION = 500;
    let longPressTimeout: number;

    const startPress = (e: PointerEvent) => {
      if (e.button == 0) {
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
      console.log(longPressTimeout);
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

    const Component = f.type == FileTypes.FOLDER ? Book : Note;

    return (
      <div
        onPointerDown={startPress}
        onPointerCancel={cancelPress}
        onContextMenu={(e) => e.preventDefault()}
        onClick={handleClick}
        key={f._id}
      >
        <Component isSelected={isSelected} title={f.name} />
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-row pt-4 overflow-hidden select-none">
      <FileTree
        files={files}
        path={path}
        setPath={(path) => {
          setSelectedFiles({});
          setPath(path);
        }}
        className="hidden sm:flex pb-10 w-96 border-r-[1px] border-gray-300"
      />

      <div className="relative flex flex-col w-full h-full px-10 py-3 overflow-scroll">
        <PathNavigator files={files} path={path} setPath={setPath} />

        {/** Notes */}
        <div className="flex flex-row flex-wrap gap-4 sm:gap-8 pt-8 sm:pt-16 pb-40 justify-around sm:justify-start">
          {currentFolder.children.map(drawExplorerItem)}

          <AddButton key="#add-button" onClick={() => setModal(ModalTypes.CREATE_FILE)} />
        </div>
      </div>
    </div>
  );
}

function NoteCacheSync() {
  const [syncing, setSyncing] = useState(false);

  function sync() {
    let cancelSync = false;

    (async () => {
      const cachedNotes = LocalStorage.cachedNotes();
      console.log(cachedNotes);
      if (cachedNotes.length) {
        setSyncing(true);
        for (const noteId of cachedNotes) {
          if (!cancelSync) {
            console.log("Syncing", noteId);
            await SyncNote(noteId);
          }
        }
        if (!cancelSync) {
          setSyncing(false);
        }
      }
    })();

    return () => {
      cancelSync = true;
    };
  }

  useEffect(() => {
    return sync();
  }, []);

  return (
    syncing && (
      <div className="flex flex-row gap-2 bg-slate-200 py-2 px-3 rounded-lg">
        <div className="flex animate-spin">
          <div className="flex -scale-x-100">
            <MaterialSymbol name="sync" className="" />
          </div>
        </div>
        <div className="font-bold mr-1">Syncing...</div>
      </div>
    )
  );
}

function Explorer({ files, refreshFiles, openSettings }) {
  const [modal, setModal] = useState(ModalTypes.NONE);
  const [path, setPath] = useState(["f/notes"]);
  const [selectedFiles, setSelectedFiles] = useState({});

  const reload = async () => {
    await refreshFiles();
    setSelectedFiles({});
  };

  return (
    <div>
      <Head>
        <title>Inck - File Explorer</title>
        <meta name="description" content="The only ink that you will ever need" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="font-round bg-white">
        <div className="relative flex flex-col w-[100vw] h-[100vh]">
          {/** Top bar */}
          <NavBar openSettings={openSettings}>
            <NoteCacheSync />
            <SelectionOptionsWidget
              selectedFiles={selectedFiles}
              setSelectedFiles={setSelectedFiles}
              setModal={setModal}
            />
          </NavBar>

          <FileExplorer
            files={files}
            path={path}
            selectedFiles={selectedFiles}
            setPath={setPath}
            setSelectedFiles={setSelectedFiles}
            setModal={setModal}
          />
        </div>

        <DisplayModal
          modal={modal}
          path={path}
          files={files}
          selectedFiles={selectedFiles}
          closeModal={() => setModal(ModalTypes.NONE)}
          reloadFiles={reload}
        />
      </main>
    </div>
  );
}

export function ExplorerLoader({ openSettings }) {
  const [files, setFiles] = useState(null);

  const refreshFiles = async () => {
    const newFiles = await GetFiles();
    setFiles(newFiles);
  };

  useEffect(() => {
    refreshFiles();
    InitTawkTo();
  }, []);

  if (files) {
    return <Explorer openSettings={openSettings} files={files} refreshFiles={refreshFiles} />;
  } else {
    return <LoadingPage />;
  }
}
