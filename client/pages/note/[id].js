import Head from 'next/head'
import Script from 'next/script'
import { FullScreenButton } from '/components/fsButton'
import { useRouter } from 'next/router'

export default function Canvas() {
  const router = useRouter()
  const { id } = router.query

  return (
    <div>
      <Head>
        <title>Inck/{id}</title>
        <meta name="description" content="The only ink that you will ever need" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Script type='module' src='/js/index.js' />
      <FullScreenButton />
    </div>
  )
}