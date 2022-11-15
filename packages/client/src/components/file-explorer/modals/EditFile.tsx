import { AccessTypes, FileTypes } from "@inck/common-types/Files";
import { BackgroundOptions, BackgroundTypes } from "@inck/common-types/Notes";
import { useContext, useState } from "react";
import { HttpServer } from "../../../ServerConnector";
import { getAuthToken } from "../../AuthToken";
import { FileInfo, NoteInfo } from "../types";
import { Modal, ModalButtons, ModalTitle } from "../../common/Modals";
import { BackgroundSelector } from "../../common/BgSpacingSelector";
import { PDFDropZone } from "./utils/PdfDropZone";
import { ErrorContext } from "../AlertManager";
import GetApiPath from "../../GetApiPath";
import { ApiUrlStrings } from "@inck/common-types/ApiUrlStrings";

type EditFileModalProps = {
  file: FileInfo;
  onCancel: () => void;
  onSuccess: () => void;
};

export function EditFileModal({ file, onCancel, onSuccess }: EditFileModalProps) {
  const isNote = file.type == FileTypes.NOTE;
  const noteInfo = file as NoteInfo;

  const [newName, setNewName] = useState(file.name);
  const [newNoteAccess, setNewNoteAccess] = useState(isNote ? noteInfo.defaultAccess : AccessTypes.NONE);
  const [newBackground, setNewBackground] = useState(isNote ? noteInfo.backgroundType : BackgroundTypes.blank);

  const oldSpacing = (noteInfo?.backgroundOptions?.spacing || 0) * screen.width;
  const [newBgSpacing, setNewBgSpacing] = useState(oldSpacing);

  const [disableSubmitButton, setDisableSubmitButton] = useState(false);
  const [buttonText, setButtonText] = useState("Save");
  const [fileSize, setFileSize] = useState(0);
  const [pdfContent, setPdfContent] = useState<File>(null);
  const fileSizeFormat = (Math.round(fileSize * 1e-4) * 1e-2).toFixed(2);
  const pushError = useContext(ErrorContext);

  const saveEdits = async () => {
    if (isNote) {
      let bgOptions: BackgroundOptions = {
        spacing: newBgSpacing / screen.width,
      };
      if (noteInfo.backgroundType == BackgroundTypes.pdf && (!noteInfo.backgroundOptions.fileHash || pdfContent)) {
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
          setButtonText("Save");
          setDisableSubmitButton(false);
          setPdfContent(null);
          setFileSize(0);
          return;
        }

        const { fileHash } = jsonReply;
        bgOptions.fileHash = fileHash;
      }

      await HttpServer.files.editNoteInfo(getAuthToken(), file._id, {
        name: newName,
        publicAccess: newNoteAccess,
        backgroundType: newBackground,
        backgroundOptions: {
          ...noteInfo.backgroundOptions,
          ...bgOptions,
        },
      });
    } else {
      await HttpServer.files.editFolderInfo(getAuthToken(), file._id, {
        name: newName,
      });
    }

    onSuccess();
  };

  return (
    <Modal onCancel={onCancel} className="flex flex-col items-center">
      <ModalTitle>Edit {file.type == FileTypes.FOLDER ? "folder" : "note"}</ModalTitle>
      <div className="flex flex-col gap-6 my-10">
        <div className="flex gap-4">
          Name
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="bg-gray-100 w-full border-[1px] px-2 border-gray-400 rounded-md"
          />
        </div>
        {isNote && (
          <>
            <div className="flex gap-4">
              Public&nbsp;access
              <select
                value={newNoteAccess}
                onChange={(e) => setNewNoteAccess(e.target.value as AccessTypes)}
                className="bg-gray-100 w-full border-[1px] px-2 border-gray-400 rounded-md"
              >
                <option value={AccessTypes.EDIT}>View &amp; edit</option>
                <option value={AccessTypes.VIEW}>View only</option>
                <option value={AccessTypes.NONE}>None</option>
              </select>
            </div>

            {newBackground == BackgroundTypes.pdf ? (
              <div>
                <p className="text-sm">Upload new PDF:</p>
                <PDFDropZone setFileSize={setFileSize} setPdfContent={setPdfContent} />
                <p className={`text-sm text-right italic ${fileSize > 0.0 ? "" : "invisible"}`}>
                  File size: {fileSizeFormat} MB
                </p>
              </div>
            ) : (
              <BackgroundSelector
                background={newBackground}
                setBackground={setNewBackground}
                spacing={newBgSpacing}
                setSpacing={setNewBgSpacing}
              />
            )}
          </>
        )}
      </div>
      <ModalButtons disabled={disableSubmitButton} onCancel={onCancel} onSubmit={saveEdits} submitText={buttonText} />
    </Modal>
  );
}
