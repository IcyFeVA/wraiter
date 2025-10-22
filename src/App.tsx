import { useState, useRef } from "react";
import { useWindowResize } from "./hooks/useWindowResize";
import "./App.css";
import Overlay from "./components/Overlay";
import Settings from "./components/Settings";
import { useTheme } from "./contexts/ThemeContext";

function App() {
  const [currentView, setCurrentView] = useState<'main' | 'settings'>('main');
  const contentRef = useRef<HTMLDivElement>(null);
  const { theme, isThemeLoaded } = useTheme();
  useWindowResize(contentRef);

  return (
    <div id="app" ref={contentRef} className={isThemeLoaded ? `theme-${theme.toLowerCase()}` : ''} style={{ overflow: 'auto'}}>
      <div className="inner">
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
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
            {/* Draggable area to the right of AI settings button */}
            <div
              className="drag-region"
              style={{
                height: '20px',
                width: '30px',
                cursor: 'grab',
                flex: 1,
                WebkitUserSelect: 'none',
                userSelect: 'none',
                border: '1px solid #00ffff3b',
                marginLeft: '4px',
                alignItems: 'center',
                display: 'flex',
                justifyContent: 'center',
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
            >
              <div style={{ justifyContent: 'space-between', alignItems: 'center', flexDirection: 'row', display: 'flex', width: '100%', padding: '0 4px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace, Verdana' }}>NSX-T 1.0</div>
              </div>
            </div>
            <button
              onClick={() => setCurrentView('settings')}
              style={{
                fontSize: '11px',
                padding: '2px 8px',
              }}
              title="Close"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
        {currentView === 'main' && <Overlay />}
        {currentView === 'settings' && <Settings />}
      </div>
    </div>
  );
}

export default App;
