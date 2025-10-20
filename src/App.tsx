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
            className={currentView === 'main' ? 'active-tab' : 'inactive-tab'}
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              minWidth: '50px',
            }}
          >
            MAIN
          </button>
          <button
            onClick={() => setCurrentView('settings')}
            className={currentView === 'settings' ? 'active-tab' : 'inactive-tab'}
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              minWidth: '50px',
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
