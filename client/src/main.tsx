import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { SWRConfig } from "swr";
import { fetcher } from "./lib/fetcher";
import { Toaster } from "./components/ui/toaster";
import { PasswordProtect } from "./components/PasswordProtect";
import { ThemeProvider } from "./context/ThemeContext";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system">
      <SWRConfig value={{ fetcher }}>
        <PasswordProtect>
          <App />
        </PasswordProtect>
      </SWRConfig>
    </ThemeProvider>
  </StrictMode>,
);