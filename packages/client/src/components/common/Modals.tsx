import { twMerge } from "tailwind-merge";

export function Modal({ children, onCancel, className = "", onBack = null }) {
  return (
    <div className={"absolute inset-0 w-screen h-screen backdrop-blur-sm flex flex-col justify-center items-center"}>
      <div onClick={onCancel} className="absolute inset-0 bg-opacity-50 bg-black"></div>

      <div className="relative bg-white rounded-3xl shadow-sm p-5 flex flex-col text-lg mx-10">
        <div className="flex flex-row-reverse justify-between mb-2">
          <button className="self-end hover:text-red-500" onClick={onCancel}>
            <span className="material-symbols-outlined">close</span>
          </button>
          {onBack && (
            <button className="self-end hover:text-blue-500" onClick={onBack}>
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
        </div>
        <div className="my-2 mx-3">
          <div className={className}>{children}</div>
        </div>
      </div>
    </div>
  );
}

export function ModalTitle({ children }) {
  return <div className="text-2xl font-semibold w-full text-center">{children}</div>;
}

export function ModalButtons({
  submitText,
  onSubmit,
  onCancel,
  submitEnabled = true,
  submitButtonClassName = "",
  disabled = false,
}) {
  return (
    <div className="flex w-full justify-between items-center">
      <button
        className="text-gray-600 hover:bg-gray-200 w-fit px-4 py-1 rounded-full self-center"
        onClick={onCancel}
        disabled={disabled}
      >
        Cancel
      </button>
      <button
        onClick={onSubmit}
        disabled={!submitEnabled || disabled}
        className={twMerge(
          "hover:bg-slate-800 bg-slate-600 text-white w-fit px-4 py-1 rounded-full self-center ",
          submitButtonClassName
        )}
      >
        {submitText}
      </button>
    </div>
  );
}
