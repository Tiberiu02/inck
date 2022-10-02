import { HttpServer } from "../../../ServerConnector";
import { getAuthToken } from "../../AuthToken";
import { FileTree } from "../types";
import { Modal, ModalButtons, ModalTitle } from "../../common/Modals";

type RemoveFilesModalProps = {
  onCancel: () => void;
  onSuccess: () => void;
  selectedFiles: FileTree;
};

export function RemoveFilesModal({ onCancel, onSuccess, selectedFiles }: RemoveFilesModalProps) {
  const onRemoveClick = async () => {
    const files = Object.keys(selectedFiles);
    await HttpServer.files.deleteFiles(getAuthToken(), files);
    onSuccess();
  };

  return (
    <Modal onCancel={onCancel} className="relative flex flex-col text-lg justify-between">
      <ModalTitle>Remove notes</ModalTitle>

      <div className="my-12">
        <div>Are you sure you want to delete these notes?</div>
        <div className="text-red-500 font-bold tracking-wide mt-2">This connot be undone!</div>
      </div>

      <ModalButtons
        onCancel={onCancel}
        onSubmit={onRemoveClick}
        submitText="Delete"
        submitButtonClassName="bg-red-500 hover:bg-red-600"
      />
    </Modal>
  );
}
