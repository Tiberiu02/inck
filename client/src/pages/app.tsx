import { useEffect, useState } from "react";
import { getAuthToken } from "../components/AuthToken";
import { LoadingPage } from "../components/LoadingPage";
import AuthPage from "../components/AuthPage";
import ExplorerLoader from "../components/FileExplorer";

export default function App() {
  enum States {
    LOADING,
    AUTH,
    EXPLORER,
  }

  const [state, setState] = useState(States.LOADING);

  useEffect(() => {
    if (getAuthToken()) {
      setState(States.EXPLORER);
    } else {
      setState(States.AUTH);
    }
  });

  if (state == States.EXPLORER) {
    return <ExplorerLoader />;
  } else if (state == States.AUTH) {
    return <AuthPage />;
  } else {
    return <LoadingPage />;
  }
}
