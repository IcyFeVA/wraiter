import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import Overlay from "./components/Overlay";
import Settings from "./components/Settings";

function App() {
  const [currentView, setCurrentView] = useState<'main' | 'settings'>('main');

  return (
    <main className="container">
      <h1>Welcome to AI Quick Actions</h1>
      <p>Press Ctrl+Shift+Alt+A to open the overlay from anywhere!</p>

      <div className="row" style={{ marginTop: '2rem' }}>
        <button
          onClick={() => setCurrentView('main')}
          style={{
            marginRight: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: currentView === 'main' ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          Main View
        </button>
        <button
          onClick={() => setCurrentView('settings')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: currentView === 'settings' ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          Settings
        </button>
      </div>

      <div style={{ marginTop: '2rem' }}>
        {currentView === 'main' && <Overlay />}
        {currentView === 'settings' && <Settings />}
      </div>
    </main>
  );
}

export default App;
