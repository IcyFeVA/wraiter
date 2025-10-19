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
      {/* Draggable top bar */}
      <div
        className="drag-region"
        style={{
          width: '100%',
          height: '20px',
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          cursor: 'grab',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 9999,
          WebkitUserSelect: 'none',
          userSelect: 'none'
        }}
        data-tauri-drag-region="true"
        onMouseDown={(e) => {
          if (e.button === 0) { // Left mouse button
            e.currentTarget.style.cursor = 'grabbing';
          }
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.cursor = 'grab';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.cursor = 'grab';
        }}
      />
      {currentView === 'main' && <Overlay />}
      {currentView === 'settings' && <Settings />}
    </div>
  );
}

export default App;
