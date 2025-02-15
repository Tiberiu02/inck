import { useContext, useState } from "react";
import { MaterialSymbol } from "../../MaterialSymbol";
import { AccessTypes } from "@inck/common-types/Files";
import { HttpServer } from "../../../ServerConnector";
import { getAuthToken } from "../../AuthToken";
import { Modal } from "../../common/Modals";
import { BackgroundOptions, BackgroundTypes } from "@inck/common-types/Notes";
import GetApiPath from "../../GetApiPath";
import { ApiUrlStrings } from "@inck/common-types/ApiUrlStrings";
import { twMerge } from "tailwind-merge";
import { Dropdown, TextField } from "../../common/Input";
import { LocalStorage } from "../../../LocalStorage";
import { BackgroundSelector } from "../../common/BgSpacingSelector";
import { ErrorContext } from "../AlertManager";
import { PDFDropZone } from "./utils/PdfDropZone";

function CreateNoteSubmodal({ onSuccess, path }) {
  const [name, setName] = useState("");
  const [publicAccess, setPublicAccess] = useState(AccessTypes.NONE);
  const [background, setBackground] = useState(BackgroundTypes.blank);
  const [bgSpacing, setBgSpacing] = useState(null);

  const submit = async () => {
    let backgroundOptions: BackgroundOptions;
    if (background == BackgroundTypes.lines || background == BackgroundTypes.grid) {
      backgroundOptions = {
        spacing: bgSpacing / screen.width,
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

      <BackgroundSelector
        background={background}
        setBackground={setBackground}
        spacing={bgSpacing}
        setSpacing={setBgSpacing}
      />

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

function ImportPdfSubmodal({ onSuccess, path }) {
  const [name, setName] = useState("");
  const [publicAccess, setPublicAccess] = useState(AccessTypes.NONE);
  const [fileSize, setFileSize] = useState(0);
  const [pdfContent, setPdfContent] = useState<File>(null);
  const [disableSubmitButton, setDisableSubmitButton] = useState(false);
  const [buttonText, setButtonText] = useState("Import PDF");

  const fileSizeFormat = (Math.round(fileSize * 1e-4) * 1e-2).toFixed(2);
  const pushError = useContext(ErrorContext);

  const submit = async () => {
    const trimmedName = name.trim();
    if (trimmedName == "") {
      pushError("Please provide a file name");
      return;
    }
    if (pdfContent == null) {
      pushError("Please provide a PDF file");
      return;
    }

    setDisableSubmitButton(true);
    setButtonText("Uploading PDF...");
    const formData = new FormData();
    formData.append("file", pdfContent);
    formData.append("token", getAuthToken());

    const response = await fetch(GetApiPath(ApiUrlStrings.POST_PDF), {
      method: "post",
      body: formData,
    });

    const jsonReply = await response.json();

    if (!response.ok) {
      pushError("Invalid file");
      setButtonText("Import PDF");
      setDisableSubmitButton(false);
      setPdfContent(null);
      setFileSize(0);
      return;
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
      <CreateFileButton disabled={disableSubmitButton} onClick={submit} text={buttonText} />
    </div>
  );
}

function CreateFileButton({ onClick, text, className = "", disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={twMerge(
        `disabled:bg-slate-300 bg-slate-800 hover:bg-slate-900 text-white px-4 py-1 rounded-md`,
        className
      )}
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
