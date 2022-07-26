import Head from "next/head";
import Script from "next/script";
import { FullScreenButton } from "../../components/FullScreenButton";
import { useRouter } from "next/router";
import Canvas from "../../components/Canvas";
import { IoIosUndo } from "react-icons/io";
import { TbEraser, TbEraserOff } from "react-icons/tb";
import { FaPencilAlt } from "react-icons/fa";

export default function Note() {
  const router = useRouter();
  const { id } = router.query;

  return (
    <div>
      <Head>
        <title>{id ? `Inck/${id}` : "Inck"}</title>
        <meta name="description" content="The only ink that you will ever need" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Canvas />
      <FullScreenButton />
      <div className="fixed opacity-80 text-white top-20 left-32 z-50 hidden bg-primary rounded-2xl overflow-hidden items-center shadow-md">
        <div className="p-3 hover:bg-primary-dark">
          <IoIosUndo className="w-6 h-6" />
        </div>
        <div className="p-3 border-x-2 border-primary-dark hover:bg-primary-dark">
          <FaPencilAlt className="w-6 h-6" />
        </div>
        <div className="p-3 hover:bg-primary-dark">
          <TbEraser className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
