import Head from "next/head";
import { Spinner } from "./Spinner";

export function LoadingPage() {
  return (
    <div>
      <Head>
        <title>Inck</title>
        <meta name="description" content="The only ink that you will ever need" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Spinner className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10" />;
    </div>
  );
}
