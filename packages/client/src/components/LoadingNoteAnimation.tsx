import { Spinner } from "./Spinner";

function LoadingMessage({ children, id, className = "" }) {
  return (
    <div
      id={id}
      className={`hidden flex-row items-center bg-white px-4 py-3 rounded-xl drop-shadow shadow ${className}`}
    >
      <Spinner className="w-5 mr-4" />
      {children}
    </div>
  );
}

export function LoadingNoteAnimation() {
  return (
    <div className="flex flex-col items-center absolute top-4 left-1/2 -translate-x-1/2 opacity-0">
      <LoadingMessage id="note-spinner" className="mb-2">
        Loading note
      </LoadingMessage>
      <LoadingMessage id="pdf-spinner">Loading PDF</LoadingMessage>
    </div>
  );
}
