import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import Overlay from "./components/Overlay";
import Settings from "./components/Settings";

function App() {
  const [currentView, setCurrentView] = useState<'main' | 'settings'>('main');

  return (
    <main className="container">
      <div style={{ marginBottom: '1rem' }}>
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
      </div>

      <div>
        {currentView === 'main' && <Overlay />}
        {currentView === 'settings' && <Settings />}
      </div>
    </main>
  );
}

export default App;
