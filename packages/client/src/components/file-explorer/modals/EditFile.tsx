import { AccessTypes, FileTypes } from "@inck/common-types/Files";
import { BackgroundTypes } from "@inck/common-types/Notes";
import { useState } from "react";
import { HttpServer } from "../../../ServerConnector";
import { getAuthToken } from "../../AuthToken";
import { FileInfo, NoteInfo } from "../types";
import { Modal, ModalButtons, ModalTitle } from "../../common/Modals";
import { BackgroundSelector } from "../../common/BgSpacingSelector";

type EditFileModalProps = {
  file: FileInfo;
  onCancel: () => void;
  onSuccess: () => void;
};

export function EditFileModal({ file, onCancel, onSuccess }: EditFileModalProps) {
  const isNote = file.type == FileTypes.NOTE;

  const [newName, setNewName] = useState(file.name);
  const [newNoteAccess, setNewNoteAccess] = useState(isNote ? (file as NoteInfo).defaultAccess : AccessTypes.NONE);
  const [newBackground, setNewBackground] = useState(
    isNote ? (file as NoteInfo).backgroundType : BackgroundTypes.blank
  );

  const oldSpacing = ((file as NoteInfo)?.backgroundOptions?.spacing || 0) * screen.width;
  const [newBgSpacing, setNewBgSpacing] = useState(oldSpacing);

  const saveEdits = async () => {
    if (isNote) {
      await HttpServer.files.editNoteInfo(getAuthToken(), file._id, {
        name: newName,
        publicAccess: newNoteAccess,
        backgroundType: newBackground,
        backgroundOptions: {
          spacing: newBgSpacing / screen.width,
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
              <div className="flex italic text-sm">You cannot change the background of a PDF file</div>
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
      <ModalButtons onCancel={onCancel} onSubmit={saveEdits} submitText="Save" />
    </Modal>
  );
}
