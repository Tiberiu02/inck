import { useEffect, useState } from "react";
import { getAuthToken } from "../components/AuthToken";
import { LoadingPage } from "../components/LoadingPage";
import AuthPage from "../components/AuthPage";
import { ExplorerLoader } from "../components/file-explorer/FileExplorer";
import { Settings } from "../components/settings";

export default function App() {
  enum Pages {
    LOADING,
    AUTH,
    EXPLORER,
    SETTINGS,
  }

  const [page, setPage] = useState(Pages.LOADING);

  useEffect(() => {
    if (getAuthToken()) {
      setPage(Pages.EXPLORER);
    } else {
      setPage(Pages.AUTH);
    }
  }, []);

  if (page == Pages.EXPLORER) {
    return <ExplorerLoader openSettings={() => setPage(Pages.SETTINGS)} />;
  } else if (page == Pages.SETTINGS) {
    return <Settings openExplorer={() => setPage(Pages.EXPLORER)} />;
  } else if (page == Pages.AUTH) {
    return <AuthPage />;
  } else {
    return <LoadingPage />;
  }
}
