"use client";

import React from "react";
import { createGlobalStyle, ThemeProvider } from "styled-components";
import { styleReset } from "react95";
import originalTheme from "react95/dist/themes/original";

const GlobalStyles = createGlobalStyle`
  ${styleReset}

  body {
    font-family: ui-sans-serif, system-ui, sans-serif;
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
