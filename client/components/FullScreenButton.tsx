import { FaExpand, FaCompress } from "react-icons/fa";
import React, { useState, useEffect } from "react";

function toggleFullscreen() {
  if (
    (document.fullScreenElement && document.fullScreenElement !== null) ||
    (!document.mozFullScreen && !document.webkitIsFullScreen)
  ) {
    if (document.documentElement.requestFullScreen) document.documentElement.requestFullScreen();
    else if (document.documentElement.mozRequestFullScreen)
      /* Firefox */
      document.documentElement.mozRequestFullScreen();
    else if (document.documentElement.webkitRequestFullScreen)
      /* Chrome, Safari & Opera */
      document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
    else if (document.msRequestFullscreen) /* IE/Edge */ document.documentElement.msRequestFullscreen();
    return true;
  } else {
    if (document.cancelFullScreen) document.cancelFullScreen();
    else if (document.mozCancelFullScreen) /* Firefox */ document.mozCancelFullScreen();
    else if (document.webkitCancelFullScreen) /* Chrome, Safari and Opera */ document.webkitCancelFullScreen();
    else if (document.msExitFullscreen) /* IE/Edge */ document.msExitFullscreen();
    return false;
  }
}

export function FullScreenButton() {
  const [mode, setMode] = useState(0);
  const [showing, setShowing] = useState(true);

  useEffect(() => {
    //window.alert(JSON.stringify(device))
    if (showing && navigator.vendor == "Apple Computer, Inc.") setShowing(false);
  }, [showing]);

  return (
    <div
      className={`cursor-pointer opacity-80 z-10 duration-200 hover:scale-125 hover:translate-x-[12.5%]
    hover:translate-y-[12.5%] absolute top-0 left-0 w-14 h-14 rounded-br-xl drop-shadow-md bg-primary ${
      !showing ? "hidden" : ""
    }`}
      onClick={() => setMode(toggleFullscreen(mode))}
    >
      {mode ? (
        <FaCompress color="#FFF" className="text-4xl mx-2 my-2" />
      ) : (
        <FaExpand color="#FFF" className="text-4xl mx-2 my-2" />
      )}
    </div>
  );
}
