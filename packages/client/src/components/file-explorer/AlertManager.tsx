import { createContext, useEffect, useRef, useState } from "react";

export const ErrorContext = createContext((str: string) => null);
const ERROR_DISPLAY_DURATION = 4_000;

function ErrorMessage({ message }) {
  return <div className="bg-red-600 px-3 text-white rounded-md flex justify-center items-center py-3">{message}</div>;
}

export function AlertManager({ children }) {
  const [errorQueue, setErrorQueue] = useState([]);
  const [removeRequested, setRemoveRequested] = useState(0);

  const pushError = (error: string) => {
    const newQueue = [...errorQueue, error];
    setErrorQueue(newQueue);
    setTimeout(() => setRemoveRequested(removeRequested + 1), ERROR_DISPLAY_DURATION);
  };

  useEffect(() => {
    if (removeRequested == 0) {
      return;
    } else {
      const newQueue = errorQueue.slice(removeRequested);
      setRemoveRequested(0);
      setErrorQueue(newQueue);
    }
  }, [removeRequested]);

  return (
    <ErrorContext.Provider value={pushError}>
      <div>{children}</div>
      <div className="absolute inset-0 flex flex-col justify-end items-start ml-4 mb-2 space-y-2 pointer-events-none">
        {errorQueue.map((e, idx) => (
          <ErrorMessage key={idx + "-" + e} message={e} />
        ))}
      </div>
    </ErrorContext.Provider>
  );
}
