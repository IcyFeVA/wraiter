import { useState, useRef } from "react";
import { useWindowResize } from "./hooks/useWindowResize";
import "./App.css";
import Overlay from "./components/Overlay";
import Settings from "./components/Settings";

function App() {
  const [currentView, setCurrentView] = useState<'main' | 'settings'>('main');
  const contentRef = useRef<HTMLDivElement>(null);
  useWindowResize(contentRef);

  return (
    <div id="app" ref={contentRef} style={{
      width: '100%',
    }}>
      {/* Draggable top bar */}
      <div
        className="drag-region"
        style={{
          width: '100%',
          height: '12px',
          cursor: 'grab',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 9999,
          WebkitUserSelect: 'none',
          userSelect: 'none',
          backgroundColor: '#000002ff',
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

      <div style={{ marginTop: '20px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '2px' }}>
          <button
            onClick={() => setCurrentView('main')}
            style={{
              backgroundColor: currentView === 'main' ? '#00d4ff' : '#020218ff',
              color: currentView === 'main' ? '#1a1a2e' : '#00d4ff',
              fontSize: '11px',
              padding: '2px 8px',
              minWidth: '50px',
              // border: '2px outset #16213e'
            }}
          >
            MAIN
          </button>
          <button
            onClick={() => setCurrentView('settings')}
            style={{
              backgroundColor: currentView === 'settings' ? '#00d4ff' : '#020218ff',
              color: currentView === 'settings' ? '#1a1a2e' : '#00d4ff',
              fontSize: '11px',
              padding: '2px 8px',
              minWidth: '50px',
              border: '2px outset #16213e'
            }}
          >
            AI SETTINGS
          </button>
        </div>
      </div>

      {currentView === 'main' && <Overlay />}
      {currentView === 'settings' && <Settings />}
    </div>
  );
}

export default App;
