import { CreateFileModal } from "./modals/CreateFile";
import { EditFileModal } from "./modals/EditFile";
import { ExportFilesModal } from "./modals/ExportNotes";
import { MoveFilesModal } from "./modals/MoveFiles";
import { RemoveFilesModal } from "./modals/RemoveFiles";

export enum ModalTypes {
  NONE,
  CREATE_FILE,
  EDIT_FILE,
  REMOVE_FILES,
  MOVE_FILES,
  EXPORT_FILES,
}

export function DisplayModal({ modal, path, files, selectedFiles, closeModal, reloadFiles }) {
  const closeModalAndReload = async () => {
    closeModal();
    await reloadFiles();
  };

  const firstSelectedFile = selectedFiles[Object.keys(selectedFiles)[0]];

  switch (modal) {
    case ModalTypes.CREATE_FILE:
      return <CreateFileModal onCancel={closeModal} onSuccess={closeModalAndReload} path={path} />;
    case ModalTypes.EDIT_FILE:
      return <EditFileModal file={firstSelectedFile} onCancel={closeModal} onSuccess={closeModalAndReload} />;
    case ModalTypes.REMOVE_FILES:
      return <RemoveFilesModal onCancel={closeModal} onSuccess={closeModalAndReload} selectedFiles={selectedFiles} />;
    case ModalTypes.MOVE_FILES:
      return (
        <MoveFilesModal
          onCancel={closeModal}
          onSuccess={closeModalAndReload}
          files={files}
          selectedFiles={selectedFiles}
        />
      );
    case ModalTypes.EXPORT_FILES:
      return <ExportFilesModal selectedFiles={selectedFiles} onCancel={closeModal} onSuccess={closeModalAndReload} />;
  }
}
