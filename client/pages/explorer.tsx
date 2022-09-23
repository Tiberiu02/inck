import Head from "next/head";
import React, { useState, useEffect, PointerEvent, ReactNode } from "react";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { FaAngleDown, FaAngleRight, FaPencilAlt, FaBook, FaFolder, FaFolderOpen } from "react-icons/fa";
import { getAuthToken, disconnect } from "../components/AuthToken";
import GetApiPath from "../components/GetApiPath";
import Link from "next/link";
import { TrackFolderCreation, TrackNoteCreation } from "../components/Analytics";
import { NoteToPdf } from "../canvas/PDF/PdfExport";
import download from "downloadjs";
import JSZip from "jszip";
import { Spinner } from "../components/Spinner";
import { IconType } from "react-icons/lib";
import { twMerge } from "tailwind-merge";

enum FileTypes {
  NOTE = "note",
  FOLDER = "folder",
}

enum AccessTypes {
  NONE = "private",
  READ = "read_only",
  WRITE = "read_write",
}

type FileInfo = {
  _id: string;
  name: string;
  type: FileTypes;
};

type FolderInfo = FileInfo & {
  type: FileTypes.FOLDER;
  children: FileInfo[];
};

type NoteInfo = FileInfo & {
  type: FileTypes.NOTE;
  fileId: string;
  defaultAccess: AccessTypes;
};

type FileTree = { [id: string]: FolderInfo | NoteInfo };

type RawFile = {
  _id: string;
  type: FileTypes;
  name: string;
  parentDir: string;
  owner?: string;
  fileId?: string;
  defaultAccess?: AccessTypes;
};

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
  return (
    <div className="relative rounded-xl overflow-hidden">
      <button className="relative select-none flex flex-col items-center justify-center w-32 h-24 sm:w-40 sm:h-32 bg-note border-2 border-slate-800 rounded-xl shadow-inner duration-100 overflow-hidden">
        <p className="relative py-1 px-2 border-slate-800 bg-slate-800 w-full shadow-md text-white text-sm sm:text-lg text-center line-clamp-3">
          {title}
        </p>
      </button>
      {isSelected && <div className="absolute inset-0 bg-select opacity-select"></div>}
    </div>
  );
}

function Book({ title, isSelected = false }) {
  return (
    <button className="relative select-none w-32 h-24 sm:w-40 sm:h-32 text-white duration-100 flex flex-col">
      <div className="relative bg-slate-800 h-7 w-14 rounded-t-xl -mb-2 overflow-hidden">
        {isSelected && <div className="absolute inset-0 bg-select opacity-select"></div>}
      </div>
      <div className="relative bottom-0 h-full w-full flex flex-col justify-center p-2 items-center bg-slate-800 rounded-b-xl rounded-tr-xl overflow-hidden">
        <p className="text-sm sm:text-lg text-center line-clamp-3"> {title} </p>
        {isSelected && <div className="absolute inset-0 bg-select opacity-select"></div>}
      </div>
    </button>
  );
}

function AddButton({ onClick }) {
  return (
    <>
      <button
        onClick={onClick}
        className="relative w-32 h-24 sm:w-40 sm:h-32 text-gray-200 border-4 rounded-xl text-9xl select-none overflow-hidden"
      >
        +
      </button>
    </>
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
        className="px-2 sm:px-4 py-1 rounded-full cursor-pointer max-w-[18rem] line-clamp-1"
      >
        {files[path[i]].name}
      </p>
    );
  }

  return (
    <div className="text-md sm:text-xl text-gray-700 font-bold flex flex-row items-center -ml-3 flex-wrap">{p}</div>
  );
}

function Modal({ children, onCancel, className = "", onBack = null }) {
  return (
    <div className={"absolute inset-0 w-screen h-screen bg-opacity-50 bg-black flex justify-center items-center"}>
      <div onClick={onCancel} className="absolute inset-0"></div>

      <div className="relative bg-white rounded-3xl shadow-lg p-5 flex flex-col text-lg">
        <div className="flex flex-row-reverse justify-between mb-2">
          <button className="self-end hover:text-red-500" onClick={onCancel}>
            <span className="material-symbols-outlined">close</span>
          </button>
          {onBack && (
            <button className="self-end hover:text-blue-500" onClick={onBack}>
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
        </div>
        <div className={className}>{children}</div>
      </div>
    </div>
  );
}

function ModalTitle({ children }) {
  return <div className="text-2xl font-semibold w-full text-center">{children}</div>;
}

function ModalButtons({ submitText, onSubmit, onCancel, submitEnabled = true, submitButtonClassName = "" }) {
  return (
    <div className="flex w-full justify-between items-center">
      <button className="text-gray-600 hover:bg-gray-200 w-fit px-4 py-1 rounded-full self-center" onClick={onCancel}>
        Cancel
      </button>
      <button
        onClick={onSubmit}
        disabled={!submitEnabled}
        className={twMerge(
          "hover:bg-slate-800 bg-slate-600 text-white w-fit px-4 py-1 rounded-full self-center ",
          submitButtonClassName
        )}
      >
        {submitText}
      </button>
    </div>
  );
}

function RemoveFilesModal({ onCancel, onSuccess, selectedFiles }) {
  const onRemoveClick = async () => {
    await PostFileRemoval(Object.values(selectedFiles));
    onSuccess();
  };

  return (
    <Modal onCancel={onCancel} className="relative w-96 h-52 flex flex-col text-lg justify-between">
      <ModalTitle>Remove notes</ModalTitle>

      <div>
        <div>Are you sure you want to delete these notes?</div>
        <div className="text-red-500 font-bold mt-2">This connot be undone!</div>
      </div>

      <ModalButtons
        onCancel={onCancel}
        onSubmit={onRemoveClick}
        submitText="Delete"
        submitButtonClassName="bg-red-600 hover:bg-red-700"
      />
    </Modal>
  );
}

type MoveModalListingProps = {
  files: FileTree;
  selectedFiles: FileTree;
  target: string;
  setTarget: (taget: string) => void;
};

function MoveModalListing({ files, selectedFiles, target, setTarget }: MoveModalListingProps) {
  if (files == null) {
    return <></>;
  }

  const forbidden = new Set(Object.values(selectedFiles).map((x) => x._id));

  const TreeRepr = (folder: FolderInfo, prefixLength = 0) => {
    const folders = folder.children.filter((x) => x.type == FileTypes.FOLDER) as FolderInfo[];
    const [isOpen, setOpen] = useState(folder._id == "f/notes");

    const Folder = isOpen ? FaFolderOpen : FaFolder;
    const children = folders.map((folder) => TreeRepr(folder, prefixLength + 1));
    const prefix = "\u00a0".repeat(prefixLength * 4);

    let onDoubleClick = null;
    let onClick = null;
    let renderChildren = !forbidden.has(folder._id);

    if (renderChildren) {
      onDoubleClick = () => setOpen(!isOpen);
      onClick = () => setTarget(folder._id);
    }

    return (
      <div key={folder._id}>
        <div
          onDoubleClick={onDoubleClick}
          onClick={onClick}
          className={`pl-2 flex items-center text-md select-none ${
            target == folder._id ? "bg-gray-600 hover:bg-gray-800 text-white" : ""
          } ${forbidden.has(folder._id) ? "cursor-not-allowed text-gray-300" : "cursor-pointer hover:bg-gray-200"}`}
        >
          {prefix} <Folder className="h-4 w-4 shrink-0" /> &nbsp; <div className="line-clamp-1">{folder.name}</div>
        </div>
        {renderChildren && isOpen && children}
      </div>
    );
  };

  const tree = files ? TreeRepr(files["f/notes"] as FolderInfo) : <></>;

  return <div className="overflow-auto border-4 rounded-lg h-44">{tree}</div>;
}

type MoveFilesModalProps = {
  files: FileTree;
  selectedFiles: FileTree;
  onCancel: () => void;
  onSuccess: () => void;
};

function MoveFilesModal({ files, selectedFiles, onCancel, onSuccess }: MoveFilesModalProps) {
  const [target, setTarget] = useState(null);

  const onMoveClick = async () => {
    await PostFileMove(selectedFiles, target);
    onSuccess();
  };

  const canMove = target != null;

  return (
    <Modal onCancel={onCancel} className="relative w-96 flex flex-col text-lg justify-between">
      <ModalTitle>Move notes</ModalTitle>

      <div className="my-8">
        <MoveModalListing files={files} setTarget={setTarget} target={target} selectedFiles={selectedFiles} />
        <div className="italic text-sm text-right mt-1">Click to select, double-click to open.</div>
      </div>

      <ModalButtons
        onCancel={onCancel}
        onSubmit={onMoveClick}
        submitText="Move"
        submitEnabled={canMove}
        submitButtonClassName={!canMove && "bg-slate-300 hover:bg-slate-300"}
      />
    </Modal>
  );
}

type ExportFilesModalProps = {
  selectedFiles: FileTree;
  onCancel: () => void;
  onSuccess: () => void;
};

function ExportFilesModal({ selectedFiles = {}, onCancel, onSuccess }: ExportFilesModalProps) {
  const [exporting, setExporting] = useState(false);

  const downloadNotes = async () => {
    const files = Object.values(selectedFiles);

    const exportFiles = async (root, files) => {
      for (const file of files) {
        if (file.type == FileTypes.NOTE) {
          const bytes = await NoteToPdf(file.fileId);
          root.file(file.name + ".pdf", bytes);
        } else if (file.type == FileTypes.FOLDER) {
          const newFolder = root.folder(file.name);
          await exportFiles(newFolder, file.children);
        }
      }
    };

    setExporting(true);

    if (files.length == 1 && files[0].type == FileTypes.NOTE) {
      const bytes = await NoteToPdf(files[0].fileId);
      download(bytes, files[0].name + ".pdf", "application/pdf");
    } else {
      let zip = new JSZip();
      await exportFiles(zip, files);
      const zipBytes = await zip.generateAsync({ type: "blob" });

      download(zipBytes, `Inck Notes Export.zip`, "application/zip");
    }

    setExporting(false);
    onSuccess();
  };

  return (
    <Modal onCancel={onCancel}>
      <ModalTitle>Export to PDF</ModalTitle>

      <div className="text-center my-8">Would you like to download selected notes as PDF?</div>

      <div className="h-12 flex flex-col justify-end w-full">
        {exporting ? (
          <Spinner className="h-12" />
        ) : (
          <ModalButtons onCancel={onCancel} onSubmit={downloadNotes} submitText="Download" />
        )}
      </div>
    </Modal>
  );
}

type EditFileModalProps = {
  file: FileInfo;
  onCancel: () => void;
  onSuccess: () => void;
};

function EditFileModal({ file, onCancel, onSuccess }: EditFileModalProps) {
  const isNote = file.type == FileTypes.NOTE;

  const [newName, setNewName] = useState(file.name);
  const [newNoteAccess, setNewNoteAccess] = isNote ? useState((file as NoteInfo).defaultAccess) : [];

  const saveEdits = async () => {
    await PostFileEdit(file._id, newName.trim(), newNoteAccess, {});

    onSuccess();
  };

  return (
    <Modal onCancel={onCancel} className="w-96 flex flex-col items-center text-lg justify-between">
      <ModalTitle>Edit {file.type == FileTypes.FOLDER ? "folder" : "note"}</ModalTitle>
      <div className="flex flex-col my-12 w-full px-6">
        <div className="flex">
          Name
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="bg-gray-100 ml-4 w-full border-[1px] px-2 border-gray-400 rounded-md"
          />
        </div>
        {isNote && (
          <div className="flex mt-4">
            Public&nbsp;access
            <select
              value={newNoteAccess}
              onChange={(e) => setNewNoteAccess(e.target.value as AccessTypes)}
              className="bg-gray-100 ml-4 w-full border-[1px] px-2 border-gray-400 rounded-md"
            >
              <option value={AccessTypes.WRITE}>View &amp; edit</option>
              <option value={AccessTypes.READ}>View only</option>
              <option value={AccessTypes.NONE}>No public access</option>
            </select>
          </div>
        )}
      </div>
      <ModalButtons onCancel={onCancel} onSubmit={saveEdits} submitText="Save" />
    </Modal>
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

function CreateFolderSubmodal({ name, setName }) {
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

async function CreateNote(name: string, parentFolderId: string, publicAccess: AccessTypes) {
  TrackNoteCreation("simple");
  await PostFileCreation(name, FileTypes.NOTE, parentFolderId, {
    publicAccess,
  });
}

async function CreateFolder(name, parentDir) {
  TrackFolderCreation();
  await PostFileCreation(name, FileTypes.FOLDER, parentDir);
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
    return ProcessFilesData(jsonReply.files);
  } else {
    throw Error("Failed to import PDF");
  }
}

function CreateFileModal({ path, onCancel, onSuccess }) {
  enum States {
    SELECT_ACTION,
    CREATE_NOTE,
    CREATE_FOLDER,
    IMPORT_PDF,
  }

  const [state, setState] = useState(States.SELECT_ACTION);

  const [name, setName] = useState("");
  const [publicAccess, setPublicAccess] = useState(AccessTypes.NONE);
  const [pdfContent, setPdfContent] = useState(null);

  const ModalHeader = () => {
    const Element = ({ children, state }) => {
      return (
        <button
          onClick={() => setState(state)}
          className="p-4 gap-2 rounded-md border-2 border-gray-300 text-slate-800  bg-gray-100 hover:bg-slate-800 hover:border-slate-800 hover:text-white"
        >
          {children}
        </button>
      );
    };

    return (
      <div className="flex items-center">
        {/** Heading */}
        <div className="text-3xl text-center">
          Create
          <br />
          new
        </div>

        {/** Vertical separator */}
        <div className="w-1 h-60 bg-gray-200 rounded-full mx-8"></div>

        <div className="grid grid-cols-1 gap-3 w-fit">
          {/* New folder */}
          <Element state={States.CREATE_FOLDER}>
            <div className="grid grid-cols-[auto_auto] w-fit gap-3">
              <MaterialSymbol name="folder" /> Folder
            </div>
          </Element>

          {/* New note */}
          <Element state={States.CREATE_NOTE}>
            <div className="grid grid-cols-[auto_auto] w-fit gap-3">
              <MaterialSymbol name="description" /> Note
            </div>
          </Element>

          {/* Import PDF */}
          <Element state={States.IMPORT_PDF}>
            <div className="grid grid-cols-[auto_auto] w-fit gap-3">
              <MaterialSymbol name="picture_as_pdf" /> PDF Note
            </div>
          </Element>
        </div>
      </div>
    );
  };

  const submit = async () => {
    const parentDir = path.at(-1);

    if (state == States.CREATE_NOTE) {
      await CreateNote(name, parentDir, publicAccess);
    } else if (state == States.CREATE_FOLDER) {
      await CreateFolder(name, parentDir);
    } else if (state == States.IMPORT_PDF) {
      await importPDFSubmit(name, parentDir, publicAccess, pdfContent);
    }

    onSuccess();
  };

  const modalBody = () => {
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
      return <CreateFolderSubmodal name={name} setName={setName} />;
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
    }
  };

  return (
    <Modal
      onCancel={onCancel}
      className="w-96 h-72 flex flex-col text-lg"
      onBack={state != States.SELECT_ACTION && (() => setState(States.SELECT_ACTION))}
    >
      <div className="flex flex-col basis-full justify-center items-center">{modalBody()}</div>

      {state != States.SELECT_ACTION && (
        <button
          onClick={submit}
          className="w-full bg-slate-800 hover:bg-black text-white px-4 py-1 rounded-md self-center"
        >
          Create
        </button>
      )}
    </Modal>
  );
}

// Backend functions
function ProcessFilesData(rawFileList: RawFile[]): FileTree {
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
      };
      fileDict[f._id] = note;
    }
  }
  fileDict["f/notes"] = { name: "My Notes", children: [], type: FileTypes.FOLDER, _id: "f/notes" };
  fileDict["f/trash"] = { name: "Trash", children: [], type: FileTypes.FOLDER, _id: "f/trash" };

  for (const f of rawFileList) {
    (fileDict[f.parentDir] as FolderInfo).children.push(fileDict[f._id]);
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
  const response = await fetch(GetApiPath("/api/explorer/getfiles"), {
    method: "post",
    body: JSON.stringify({ token: getAuthToken() }),
    headers: {
      "Content-type": "application/json;charset=UTF-8",
    },
  });
  const json = await response.json();

  console.log(json.files);

  return ProcessFilesData(json.files);
}

async function PostFileCreation(name, type, parentDir, options = {}): Promise<boolean> {
  const response = await fetch(GetApiPath("/api/explorer/addfile"), {
    method: "post",
    body: JSON.stringify({ token: getAuthToken(), name, type, parentDir, options }),
    headers: {
      "Content-type": "application/json;charset=UTF-8",
    },
  });

  return response.status == 200;
}

async function PostFileEdit(id, newName, newVisibility = null, options = {}): Promise<boolean> {
  const response = await fetch(GetApiPath("/api/explorer/editfile"), {
    method: "post",
    body: JSON.stringify({
      token: getAuthToken(),
      id: id,
      newName: newName,
      newVisibility: newVisibility || AccessTypes.NONE,
      options: options,
    }),
    headers: {
      "Content-type": "application/json;charset=UTF-8",
    },
  });

  return response.status == 200;
}

async function PostFileRemoval(notes): Promise<boolean> {
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

  return response.status == 200;
}

async function PostFileMove(notes: FileTree, targetId: string): Promise<boolean> {
  // Send only required stuff
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
      target: targetId,
    }),
    headers: {
      "Content-type": "application/json;charset=UTF-8",
    },
  });

  return response.status == 200;
}

enum Modals {
  NONE,
  CREATE_FILE,
  EDIT_FILE,
  REMOVE_FILES,
  MOVE_FILES,
  EXPORT_FILES,
}

function MaterialSymbol({ name, className = "" }: { name: string; className?: string }) {
  return <span className={"material-symbols-outlined " + className}>{name}</span>;
}

function NavBar({ children }) {
  return (
    <div className="flex flex-row gap-10 sm:gap-10 justify-between h-16 items-center px-4 sm:px-6 border-b-[1px] bg-white border-gray-300">
      {/** Logo */}
      <div className="hidden sm:flex flex-row gap-3 items-center text-gray-800">
        <FaPencilAlt className="text-2xl" />
        <p className="font-extrabold tracking-wider text-2xl text-gr mt-[0.1rem]">Inck</p>
      </div>

      {/** Selection options */}
      <div className="justify-center align-middle">{children}</div>

      {/* Spacer invisible div */}
      <div className="w-full" />

      {/** User Options */}
      <div className="flex flex-row gap-2">
        {/** Settings */}
        <Link href="/settings">
          <div className="hover:bg-gray-300 flex items-center justify-center w-10 h-10 rounded-full cursor-pointer">
            <MaterialSymbol name="settings" className="text-2xl" />
          </div>
        </Link>

        {/** Log out */}
        <button
          onClick={() => disconnect()}
          className="hover:bg-gray-300 flex items-center justify-center w-10 h-10 rounded-full"
        >
          <MaterialSymbol name="logout" className="text-2xl" />
        </button>
      </div>
    </div>
  );
}

function SelectionOptionsWidget({ selectedFiles, setSelectedFiles, setModal }) {
  const numSelectedFiles = Object.values(selectedFiles).length;

  return (
    numSelectedFiles > 0 && (
      <div className="flex w-full justify-between rounded-xl border-2 overflow-clip">
        <button
          onClick={() => setModal(Modals.EDIT_FILE)}
          disabled={numSelectedFiles != 1}
          className="hover:bg-gray-300 flex items-center justify-center disabled:opacity-20 disabled:hover:bg-inherit px-4 py-1"
        >
          <MaterialSymbol name="settings" className="text-xl" />
        </button>
        <button
          onClick={() => setModal(Modals.MOVE_FILES)}
          className="hover:bg-gray-300 flex items-center justify-center disabled:opacity-20 disabled:hover:bg-inherit px-4 py-1"
        >
          <MaterialSymbol name="drive_file_move" className="text-xl" />
        </button>
        <button
          onClick={() => setModal(Modals.EXPORT_FILES)}
          className="hover:bg-gray-300 flex items-center justify-center disabled:opacity-20 disabled:hover:bg-inherit px-4 py-1"
        >
          <MaterialSymbol name="download" className="text-xl" />
        </button>
        <button
          onClick={() => setModal(Modals.REMOVE_FILES)}
          className="hover:bg-gray-300 flex items-center justify-center disabled:opacity-20 disabled:hover:bg-inherit px-4 py-1"
        >
          <MaterialSymbol name="delete" className="text-xl" />
        </button>
      </div>
    )
  );
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
    const cancelPress = (e) => {
      console.log("canceling...", e);
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
    <div className="h-full w-full flex flex-row pt-4 overflow-hidden">
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

          <AddButton key="#add-button" onClick={() => setModal(Modals.CREATE_FILE)} />
        </div>
      </div>
    </div>
  );
}

function DisplayModal({ modal, path, files, selectedFiles, closeModal, reloadFiles }) {
  const closeModalAndReload = async () => {
    closeModal();
    await reloadFiles();
  };

  const firstSelectedFile = selectedFiles[Object.keys(selectedFiles)[0]];

  switch (modal) {
    case Modals.CREATE_FILE:
      return <CreateFileModal onCancel={closeModal} onSuccess={closeModalAndReload} path={path} />;
    case Modals.EDIT_FILE:
      return <EditFileModal file={firstSelectedFile} onCancel={closeModal} onSuccess={closeModalAndReload} />;
    case Modals.REMOVE_FILES:
      return <RemoveFilesModal onCancel={closeModal} onSuccess={closeModalAndReload} selectedFiles={selectedFiles} />;
    case Modals.MOVE_FILES:
      return (
        <MoveFilesModal
          onCancel={closeModal}
          onSuccess={closeModalAndReload}
          files={files}
          selectedFiles={selectedFiles}
        />
      );
    case Modals.EXPORT_FILES:
      return <ExportFilesModal selectedFiles={selectedFiles} onCancel={closeModal} onSuccess={closeModalAndReload} />;
  }
}

function Explorer({ files, refreshFiles }) {
  const [modal, setModal] = useState(Modals.NONE);
  const [path, setPath] = useState(["f/notes"]);
  const [selectedFiles, setSelectedFiles] = useState({});

  const reload = async () => {
    await refreshFiles();
    setSelectedFiles({});
  };

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
          <NavBar>
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
          closeModal={() => setModal(Modals.NONE)}
          reloadFiles={reload}
        />
      </main>
    </div>
  );
}

export default function ExplorerLoader() {
  const [files, setFiles] = useState(null);

  const refreshFiles = async () => {
    const newFiles = await GetFiles();
    setFiles(newFiles);
  };

  useEffect(() => {
    refreshFiles();
  }, []);

  if (files) {
    return <Explorer files={files} refreshFiles={refreshFiles} />;
  } else {
    return <Spinner className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10" />;
  }
}
