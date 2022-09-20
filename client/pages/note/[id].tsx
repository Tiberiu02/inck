import Head from "next/head";
import { FullScreenButton } from "../../components/FullScreenButton";
import { useRouter } from "next/router";
import Canvas from "../../components/Canvas";
import { LoadingNoteAnimation } from "../../components/LoadingNoteAnimation";

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
      <LoadingNoteAnimation />
    </div>
  );
}
