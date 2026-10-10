import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import "./styles/tokens.css";
import "./styles/shell.css";
import "./styles/map.css";
import "./styles/nodes.css";
import "./styles/finder.css";
import "./styles/strip-and-key.css";
import "./styles/reader.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./ErrorBoundary";

const root = document.getElementById("app");
if (root !== null) {
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
