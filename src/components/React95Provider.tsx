"use client";

import React from "react";
import { createGlobalStyle, ThemeProvider } from "styled-components";
import { styleReset } from "react95";
import originalTheme from "react95/dist/themes/original";
import msSansSerif from "react95/dist/fonts/ms_sans_serif.woff2";
import msSansSerifBold from "react95/dist/fonts/ms_sans_serif_bold.woff2";

const GlobalStyles = createGlobalStyle`
  ${styleReset}

  @font-face {
    font-family: "ms_sans_serif";
    src: url(${msSansSerif}) format("woff2");
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }

  @font-face {
    font-family: "ms_sans_serif";
    src: url(${msSansSerifBold}) format("woff2");
    font-weight: 700;
    font-style: normal;
    font-display: swap;
  }

  body {
    font-family: "ms_sans_serif", ui-sans-serif, system-ui, sans-serif;
  }
`;

export default function React95Provider({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider theme={originalTheme}>
            <GlobalStyles />
            {children}
        </ThemeProvider>
    );
}
