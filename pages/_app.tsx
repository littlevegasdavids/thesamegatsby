import { ChakraProvider, CSSReset, extendTheme } from "@chakra-ui/react";
import '../styles/global.css'
import '../styles/Card.css'
import Head from "next/head";
import type { AppProps } from "next/app";

const theme = extendTheme({
  styles: {
    global: {
      body: {
        b: '', // Example background color (you can use any valid color value)
      },
    },
  },
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider theme={theme}>
      <Head>
        <title>Gatbsy</title>
        <link rel="icon" href="Profile.jpeg"/>
      </Head>
      <CSSReset />
      <Component {...pageProps} />
    </ChakraProvider>
  );
}

export default MyApp;
