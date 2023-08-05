import { ChakraProvider, CSSReset, extendTheme } from "@chakra-ui/react";
import '../styles/global.css'
import '../styles/Card.css'
import Head from "next/head";

const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: '', // Example background color (you can use any valid color value)
      },
    },
  },
});

function MyApp({ Component, pageProps }) {
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
