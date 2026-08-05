import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "@showflow/ui/tokens.css";
import "./styles.css";

const rootElement = document.querySelector<HTMLElement>("#root");

if (!rootElement) {
  throw new Error("Showflow could not find the renderer root element.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
