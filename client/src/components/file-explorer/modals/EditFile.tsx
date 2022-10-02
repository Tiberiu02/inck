import { AccessTypes, FileTypes } from "@inck/common-types/Files";
import { BackgroundTypes } from "@inck/common-types/Notes";
import { useState } from "react";
import { HttpServer } from "../../../ServerConnector";
import { getAuthToken } from "../../AuthToken";
import { FileInfo, NoteInfo } from "../types";
import { Modal, ModalButtons, ModalTitle } from "../../common/Modals";

type EditFileModalProps = {
  file: FileInfo;
  onCancel: () => void;
  onSuccess: () => void;
};

export function EditFileModal({ file, onCancel, onSuccess }: EditFileModalProps) {
  const isNote = file.type == FileTypes.NOTE;

  const [newName, setNewName] = useState(file.name);
  const [newNoteAccess, setNewNoteAccess] = useState(isNote ? (file as NoteInfo).defaultAccess : AccessTypes.NONE);

  const saveEdits = async () => {
    if (isNote) {
      await HttpServer.files.editNoteInfo(getAuthToken(), file._id, {
        name: newName,
        publicAccess: newNoteAccess,
        backgroundType: BackgroundTypes.blank,
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
      <div className="flex flex-col my-12 w-full">
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
              <option value={AccessTypes.EDIT}>View &amp; edit</option>
              <option value={AccessTypes.VIEW}>View only</option>
              <option value={AccessTypes.NONE}>None</option>
            </select>
          </div>
        )}
      </div>
      <ModalButtons onCancel={onCancel} onSubmit={saveEdits} submitText="Save" />
    </Modal>
  );
}
