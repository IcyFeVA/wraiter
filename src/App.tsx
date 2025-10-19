import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import Overlay from "./components/Overlay";
import Settings from "./components/Settings";

function App() {
  const [currentView, setCurrentView] = useState<'main' | 'settings'>('main');

  return (
    <div id="app" style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: 'black'
    }}>
      {/* Draggable top bar */}
      <div
        className="drag-region"
        style={{
          width: '100%',
          height: '20px',
          backgroundColor: 'rgba(20, 16, 29, 1)',
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

{/* Do not delete this , we need it later */}
      {/* <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <button
            onClick={() => setCurrentView('main')}
            style={{
              padding: '0.4rem 0.8rem',
              backgroundColor: currentView === 'main' ? '#007bff' : '#f8f9fa',
              color: currentView === 'main' ? 'white' : '#333',
              border: '1px solid #dee2e6',
              borderRadius: '3px',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            Main
          </button>
          <button
            onClick={() => setCurrentView('settings')}
            style={{
              padding: '0.4rem 0.8rem',
              backgroundColor: currentView === 'settings' ? '#007bff' : '#f8f9fa',
              color: currentView === 'settings' ? 'white' : '#333',
              border: '1px solid #dee2e6',
              borderRadius: '3px',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            Settings
          </button>
        </div>
      </div> */}

      {currentView === 'main' && <Overlay />}
      {currentView === 'settings' && <Settings />}
    </div>
  );
}

export default App;
