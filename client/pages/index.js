import Head from 'next/head'
import Script from 'next/script'

export default function Canvas() {
  return (
    <div className='touch-none'>
      <Head>
        <title>Inck</title>
        <meta name="description" content="The only ink that you will ever need" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Script type='module' src='/js/index.js' />
    </div>
  )
}