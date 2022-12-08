import Head from "next/head";
import { AnalyticsScript } from "../components/Analytics";
import "../styles/globals.css";

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1,user-scalable=0,user-scalable=no,minimal-ui,minimum-scale=1.0,maximum-scale=1.0"
        ></meta>
      </Head>

      <AnalyticsScript />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
