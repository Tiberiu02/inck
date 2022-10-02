import { MaterialSymbol } from "../MaterialSymbol";
import { ModalTypes } from "./DisplayModal";

export function SelectionOptionsWidget({ selectedFiles, setSelectedFiles, setModal }) {
  const numSelectedFiles = Object.values(selectedFiles).length;

  return (
    numSelectedFiles > 0 && (
      <div className="flex w-full justify-between rounded-xl border-2 overflow-clip">
        <button
          onClick={() => setModal(ModalTypes.EDIT_FILE)}
          disabled={numSelectedFiles != 1}
          className="hover:bg-gray-300 flex items-center justify-center disabled:opacity-20 disabled:hover:bg-inherit px-4 py-1"
        >
          <MaterialSymbol name="settings" className="text-xl" />
        </button>
        <button
          onClick={() => setModal(ModalTypes.MOVE_FILES)}
          className="hover:bg-gray-300 flex items-center justify-center disabled:opacity-20 disabled:hover:bg-inherit px-4 py-1"
        >
          <MaterialSymbol name="drive_file_move" className="text-xl" />
        </button>
        <button
          onClick={() => setModal(ModalTypes.EXPORT_FILES)}
          className="hover:bg-gray-300 flex items-center justify-center disabled:opacity-20 disabled:hover:bg-inherit px-4 py-1"
        >
          <MaterialSymbol name="download" className="text-xl" />
        </button>
        <button
          onClick={() => setModal(ModalTypes.REMOVE_FILES)}
          className="hover:bg-gray-300 flex items-center justify-center disabled:opacity-20 disabled:hover:bg-inherit px-4 py-1"
        >
          <MaterialSymbol name="delete" className="text-xl" />
        </button>
      </div>
    )
  );
}
