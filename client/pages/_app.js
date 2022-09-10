import Head from "next/head";
import { AnalyticsScript } from "../components/Analytics";
import "../styles/globals.css";

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </Head>

      <AnalyticsScript />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
