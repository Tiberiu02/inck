import { useState } from "react";
import { HttpServer } from "../../../ServerConnector";
import { getAuthToken } from "../../AuthToken";
import { FileTree, FolderInfo } from "../types";
import { Modal, ModalButtons, ModalTitle } from "../../common/Modals";
import { FaFolder, FaFolderOpen } from "react-icons/fa";
import { FileTypes } from "@inck/common-types/Files";

type MoveModalListingProps = {
  files: FileTree;
  selectedFiles: FileTree;
  target: string;
  setTarget: (taget: string) => void;
};

function MoveModalListing({ files, selectedFiles, target, setTarget }: MoveModalListingProps) {
  const forbidden = new Set(Object.values(selectedFiles).map((x) => x._id));

  const TreeRepr = (folder: FolderInfo, prefixLength = 0) => {
    const folders = folder.children.filter((x) => x.type == FileTypes.FOLDER) as FolderInfo[];
    const [isOpen, setOpen] = useState(folder._id == "f/notes");

    const Folder = isOpen ? FaFolderOpen : FaFolder;
    const children = folders.map((folder) => TreeRepr(folder, prefixLength + 1));
    const prefix = "\u00a0".repeat(prefixLength * 4);

    const allowed = !forbidden.has(folder._id);

    const onClick = () => {
      if (allowed) {
        if (target != folder._id) {
          setTarget(folder._id);
          setOpen(true);
        } else {
          setOpen(!isOpen);
        }
      }
    };

    return (
      <div key={folder._id}>
        <div
          onClick={onClick}
          className={`pl-2 flex items-center text-md select-none w-72 ${
            target == folder._id ? "bg-gray-600 hover:bg-gray-800 text-white" : ""
          } ${forbidden.has(folder._id) ? "cursor-not-allowed text-gray-300" : "cursor-pointer hover:bg-gray-200"}`}
        >
          {prefix} <Folder className="h-4 w-4 shrink-0" /> &nbsp; <div className="line-clamp-1">{folder.name}</div>
        </div>
        {allowed && isOpen && children}
      </div>
    );
  };

  return <div className="overflow-auto border-4 rounded-lg h-44">{TreeRepr(files["f/notes"] as FolderInfo)}</div>;
}

type MoveFilesModalProps = {
  files: FileTree;
  selectedFiles: FileTree;
  onCancel: () => void;
  onSuccess: () => void;
};

export function MoveFilesModal({ files, selectedFiles, onCancel, onSuccess }: MoveFilesModalProps) {
  const [target, setTarget] = useState(null);

  const onMoveClick = async () => {
    await HttpServer.files.moveFiles(getAuthToken(), Object.keys(selectedFiles), target);
    onSuccess();
  };

  const canMove = target != null;

  return (
    <Modal onCancel={onCancel} className="flex flex-col">
      <ModalTitle>Move notes</ModalTitle>

      <div className="my-8">
        <div className="text-left mb-1">Select new destination:</div>
        <MoveModalListing files={files} setTarget={setTarget} target={target} selectedFiles={selectedFiles} />
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
