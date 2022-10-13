import { AccessTypes, FileTypes } from "@inck/common-types/Files";
import { BackgroundTypes } from "@inck/common-types/Notes";
import { useEffect, useState } from "react";
import { HttpServer } from "../../../ServerConnector";
import { getAuthToken } from "../../AuthToken";
import { FileInfo, NoteInfo } from "../types";
import { Modal, ModalButtons, ModalTitle } from "../../common/Modals";
import { Dropdown } from "../../common/Input";
import { BgSpacingSelector } from "../../common/BgSpacingSelector";
import { LocalStorage } from "../../../LocalStorage";

type EditFileModalProps = {
  file: FileInfo;
  onCancel: () => void;
  onSuccess: () => void;
};

function bgRatio(bg: BackgroundTypes) {
  if (bg == BackgroundTypes.grid) {
    return 2;
  } else {
    return 1;
  }
}

export function EditFileModal({ file, onCancel, onSuccess }: EditFileModalProps) {
  const isNote = file.type == FileTypes.NOTE;

  const [newName, setNewName] = useState(file.name);
  const [newNoteAccess, setNewNoteAccess] = useState(isNote ? (file as NoteInfo).defaultAccess : AccessTypes.NONE);
  const [newBackground, setNewBackground] = useState(
    isNote ? (file as NoteInfo).backgroundType : BackgroundTypes.blank
  );

  const defaultSpacing =
    isNote && newBackground != BackgroundTypes.blank ? (file as NoteInfo).backgroundOptions.spacing : 80 / screen.width;
  const [newBgSpacing, setNewBgSpacing] = useState(defaultSpacing * screen.width * bgRatio(newBackground));

  const saveEdits = async () => {
    if (isNote) {
      await HttpServer.files.editNoteInfo(getAuthToken(), file._id, {
        name: newName,
        publicAccess: newNoteAccess,
        backgroundType: newBackground,
        backgroundOptions: {
          spacing: newBgSpacing / screen.width / bgRatio(newBackground),
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
        {isNote && newBackground == BackgroundTypes.pdf && (
          <div className="flex mt-8 italic text-sm">You cannot change the background of a PDF file</div>
        )}
        {isNote && newBackground != BackgroundTypes.pdf && (
          <div className="flex gap-4 mt-4">
            Background
            <Dropdown
              className="w-full"
              value={newBackground}
              onChange={(bg) => {
                setNewBackground(bg);
              }}
            >
              <option value={BackgroundTypes.blank}>None</option>
              <option value={BackgroundTypes.grid}>Grid</option>
              <option value={BackgroundTypes.lines}>Lines</option>
            </Dropdown>
          </div>
        )}
        {isNote &&
          newBackground != BackgroundTypes.pdf &&
          (newBackground == BackgroundTypes.grid || newBackground == BackgroundTypes.lines) && (
            <BgSpacingSelector background={newBackground} spacing={newBgSpacing} setSpacing={setNewBgSpacing} />
          )}
      </div>
      <ModalButtons onCancel={onCancel} onSubmit={saveEdits} submitText="Save" />
    </Modal>
  );
}
