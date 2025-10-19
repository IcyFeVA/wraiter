import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import Overlay from "./components/Overlay";
import Settings from "./components/Settings";

function App() {
  const [currentView, setCurrentView] = useState<'main' | 'settings'>('main');

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: 'transparent'
    }}>
      {currentView === 'main' && <Overlay />}
      {currentView === 'settings' && <Settings />}
    </div>
  );
}

export default App;
