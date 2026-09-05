import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SettingsProvider } from "./contexts/SettingsContext";
import "./themes/NSX.css";
import "./themes/Aqua.css";
import "./themes/AquaDark.css";
import "./themes/Console.css";
import "./themes/Abelton.css";
import "./themes/Lamasass.css";
import "./themes/ICQ.css";
import "./themes/Ampwin.css";
import "./themes/Maverick.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </React.StrictMode>,
);
