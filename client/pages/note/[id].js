import Head from "next/head";
import Script from "next/script";
import loadingMessages from "../../loading_messages";
import { useEffect, useState } from "react";
import { FullScreenButton } from "../../components/FullScreenButton";
import { useRouter } from "next/router";
import Canvas from "../../components/Canvas";
import { IoIosUndo } from "react-icons/io";
import { TbEraser, TbEraserOff } from "react-icons/tb";
import { FaPencilAlt } from "react-icons/fa";

export default function Note() {
  const router = useRouter();
  const { id } = router.query;

  const [messageIdx, setMessageIdx] = useState(null);

  useEffect(() => {
    setMessageIdx(() => Math.floor(Math.random() * loadingMessages.length));
  }, []);

  const isMessageVisible = messageIdx != null;
  console.log(messageIdx);
  console.log(isMessageVisible);

  // TODO check authentication here with a fetch

  if (false) {
    return (
      <div className="grid h-screen place-items-center bg-gray-100 animate-pulse">
        <div className="flex flex-col text-center  w-96 h-48 justify-around ">
          <h1 className="font-bold text-4xl">Your note is loading</h1>
          <span
            className={`${
              isMessageVisible ? "opacity-100" : "opacity-0"
            } font-light transition-opacity  italic text-xl`}
          >
            {loadingMessages[messageIdx || 0]}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Head>
        <title>{id ? `Inck/${id}` : "Inck"}</title>
        <meta name="description" content="The only ink that you will ever need" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Canvas />
      <FullScreenButton />
    </div>
  );
}
