import { useState } from "react";
import { MaterialSymbol } from "../../MaterialSymbol";
import { FileTree, FolderInfo } from "../types";
import { FaAngleDown, FaAngleRight, FaPencilAlt, FaBook, FaFolder, FaFolderOpen } from "react-icons/fa";
import { AccessTypes, FileTypes } from "@inck/common-types/Files";
import { HttpServer } from "../../../ServerConnector";
import { getAuthToken } from "../../AuthToken";
import { Modal, ModalButtons, ModalTitle } from "../../common/Modals";
import { BackgroundOptions, BackgroundTypes } from "@inck/common-types/Notes";
import GetApiPath from "../../GetApiPath";
import { ApiUrlStrings } from "@inck/common-types/ApiUrlStrings";
import { twMerge } from "tailwind-merge";
import { useDropzone } from "react-dropzone";
import { Dropdown, TextField } from "../../common/Input";
import { LocalStorage } from "../../../LocalStorage";

function CreateNoteSubmodal({ onSuccess, path }) {
  const [name, setName] = useState("");
  const [publicAccess, setPublicAccess] = useState(AccessTypes.NONE);
  const [background, setBackground] = useState(BackgroundTypes.blank);
  const [bgSpacing, setBgSpacing] = useState(50);

  const submit = async () => {
    let backgroundOptions: BackgroundOptions;
    if (background == BackgroundTypes.lines) {
      backgroundOptions = {
        spacing: bgSpacing / screen.width,
      };
      LocalStorage.updateLastSpacing(background, bgSpacing);
    } else if (background == BackgroundTypes.grid) {
      backgroundOptions = {
        spacing: bgSpacing / screen.width / 2,
      };
      LocalStorage.updateLastSpacing(background, bgSpacing);
    }

    await HttpServer.files.createNote(getAuthToken(), path.at(-1), {
      name,
      publicAccess,
      backgroundType: background,
      backgroundOptions,
    });
    onSuccess();
  };

  return (
    <div className="flex flex-col mt-10 gap-6">
      <div className="flex gap-4">
        Name
        <TextField value={name} onChange={setName} />
      </div>
      <div className="flex gap-4">
        Public&nbsp;access
        <Dropdown className="w-full" value={publicAccess} onChange={setPublicAccess}>
          <option value={AccessTypes.NONE}>None</option>
          <option value={AccessTypes.VIEW}>View only</option>
          <option value={AccessTypes.EDIT}>View &amp; edit</option>
        </Dropdown>
      </div>
      <div className="flex gap-4">
        Background
        <Dropdown
          className="w-full"
          value={background}
          onChange={(bg) => {
            setBackground(bg);
            setBgSpacing(LocalStorage.lastSpacing(bg));
          }}
        >
          <option value={BackgroundTypes.blank}>None</option>
          <option value={BackgroundTypes.grid}>Grid</option>
          <option value={BackgroundTypes.lines}>Lines</option>
        </Dropdown>
      </div>
      {(background == BackgroundTypes.grid || background == BackgroundTypes.lines) && (
        <>
          <div className="flex gap-4">
            Spacing
            <input
              className="w-full"
              type="range"
              min="30"
              max="120"
              value={bgSpacing}
              onChange={(e) => setBgSpacing(+e.target.value)}
            />
          </div>
          {background == BackgroundTypes.lines && (
            <div
              className="relative w-full h-40 -mb-6 border-[1px] border-slate-400 rounded-lg bg-note"
              style={{ backgroundSize: `${bgSpacing}px ${bgSpacing}px` }}
            ></div>
          )}
          {background == BackgroundTypes.grid && (
            <div
              className="relative w-full h-40 -mb-6 border-[1px] border-slate-400 rounded-lg bg-grid"
              style={{ backgroundSize: `${bgSpacing / 2}px ${bgSpacing / 2}px` }}
            ></div>
          )}
        </>
      )}

      <CreateFileButton className="mt-6" onClick={submit} text="Create note" />
    </div>
  );
}

function CreateFolderSubmodal({ onSuccess, path }) {
  const [name, setName] = useState("");

  const submit = async () => {
    await HttpServer.files.createFolder(getAuthToken(), path.at(-1), {
      name,
    });
    onSuccess();
  };

  return (
    <div className="flex flex-col pt-4 gap-6">
      <div className="flex gap-4">
        Name
        <TextField value={name} onChange={setName} />
      </div>
      <CreateFileButton className="mt-6" onClick={submit} text="Create folder" />
    </div>
  );
}

function PDFDropZone({ setPdfContent, setFileSize }) {
  const { acceptedFiles, getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const [file] = acceptedFiles;
        setFileSize(file.size);
        setPdfContent(file);
      }
    },
    accept: {
      "application/pdf": [".pdf"],
    },
  });

  const isFileSelected = acceptedFiles.length > 0;

  let dropZoneContent: string;

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

function ImportPdfSubmodal({ onSuccess, path }) {
  const [name, setName] = useState("");
  const [publicAccess, setPublicAccess] = useState(AccessTypes.NONE);
  const [fileSize, setFileSize] = useState(0);
  const [pdfConent, setPdfContent] = useState<File>(null);

  const fileSizeFormat = (Math.round(fileSize * 1e-4) * 1e-2).toFixed(2);

  const submit = async () => {
    const formData = new FormData();
    formData.append("file", pdfConent);
    formData.append("token", getAuthToken());

    const response = await fetch(GetApiPath(ApiUrlStrings.POST_PDF), {
      method: "post",
      body: formData,
    });

    const jsonReply = await response.json();

    if (!response.ok) {
      throw new Error("Failed to upload PDF. " + jsonReply.error);
    }

    const { fileHash } = jsonReply;

    await HttpServer.files.createNote(getAuthToken(), path.at(-1), {
      name,
      publicAccess,
      backgroundType: BackgroundTypes.pdf,
      backgroundOptions: {
        fileHash,
      },
    });

    onSuccess();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-4 justify-between">
        Name
        <TextField value={name} onChange={setName} />
      </div>

      <div className="flex gap-4">
        Public&nbsp;access
        <Dropdown value={publicAccess} onChange={setPublicAccess}>
          <option value={AccessTypes.EDIT}>View &amp; edit</option>
          <option value={AccessTypes.VIEW}>View only</option>
          <option value={AccessTypes.NONE}>None</option>
        </Dropdown>
      </div>

      <div>
        <PDFDropZone setFileSize={setFileSize} setPdfContent={setPdfContent} />
        <p className={`text-sm text-right italic ${fileSize > 0.0 ? "" : "invisible"}`}>
          File size: {fileSizeFormat} MB
        </p>
      </div>
      <CreateFileButton onClick={submit} text="Import PDF" />
    </div>
  );
}

function CreateFileButton({ onClick, text, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={twMerge("bg-slate-800 hover:bg-slate-900 text-white px-4 py-1 rounded-md", className)}
    >
      {text}
    </button>
  );
}

export function CreateFileModal({ path, onCancel, onSuccess }) {
  enum States {
    SELECT_ACTION,
    CREATE_NOTE,
    CREATE_FOLDER,
    IMPORT_PDF,
  }

  const [state, setState] = useState(States.SELECT_ACTION);

  const ModalHeader = () => {
    const Element = ({ children, state }) => {
      return (
        <button
          onClick={() => setState(state)}
          className="p-4 text-xs sm:text-lg gap-2 rounded-md border-2 border-gray-300 text-slate-800  bg-gray-100 hover:bg-slate-800 hover:border-slate-800 hover:text-white"
        >
          {children}
        </button>
      );
    };

    return (
      <div className="flex flex-col items-center p-2">
        {/** Heading */}
        <div className="text-2xl sm:text-3xl text-center">Create new</div>

        {/** Vertical separator */}
        <div className="h-1 w-60 bg-gray-200 rounded-full my-8"></div>

        <div className="grid grid-cols-2 gap-3 w-fit">
          {/* New folder */}
          <Element state={States.CREATE_FOLDER}>
            <div className="flex gap-3 items-center">
              <MaterialSymbol name="folder" /> Folder
            </div>
          </Element>

          {/* New note */}
          <Element state={States.CREATE_NOTE}>
            <div className="flex gap-3 items-center">
              <MaterialSymbol name="description" /> Note
            </div>
          </Element>

          {/* Import PDF */}
          <div className="flex justify-center col-span-2">
            <Element state={States.IMPORT_PDF}>
              <div className="flex gap-3 items-center">
                <MaterialSymbol name="picture_as_pdf" /> PDF Note
              </div>
            </Element>
          </div>
        </div>
      </div>
    );
  };

  const modalBody = () => {
    if (state == States.SELECT_ACTION) {
      return <ModalHeader />;
    } else if (state == States.CREATE_NOTE) {
      return <CreateNoteSubmodal path={path} onSuccess={onSuccess} />;
    } else if (state == States.CREATE_FOLDER) {
      return <CreateFolderSubmodal path={path} onSuccess={onSuccess} />;
    } else if (state == States.IMPORT_PDF) {
      return <ImportPdfSubmodal path={path} onSuccess={onSuccess} />;
    }
  };

  return (
    <Modal
      onCancel={onCancel}
      className="flex flex-col text-lg"
      onBack={state != States.SELECT_ACTION && (() => setState(States.SELECT_ACTION))}
    >
      {modalBody()}
    </Modal>
  );
}
