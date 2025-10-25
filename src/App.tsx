import { useState, useRef } from "react";
import { useWindowResize } from "./hooks/useWindowResize";
import "./App.css";
import Overlay from "./components/Overlay";
import Settings from "./components/Settings";
import AppSettings from "./components/AppSettings";
import { useTheme } from "./contexts/ThemeContext";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AppWindow, Cpu, Home } from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState<'main' | 'settings' | 'appSettings'>('main');
  const contentRef = useRef<HTMLDivElement>(null);
  const { theme, isThemeLoaded } = useTheme();
  useWindowResize(contentRef);

  return (
    <div id="app" ref={contentRef} className={isThemeLoaded ? `theme-${theme.toLowerCase()}` : ''}>
      <div className="app-inner">
        <nav className="app-navigation">
          <div className="nav-tabs">
            <button
              onClick={() => setCurrentView('main')}
              className={`nav-tab ${currentView === 'main' ? 'nav-tab--active' : 'nav-tab--inactive'}`}
            >
              <Home size={12} className="nav-tab__icon" />
              MAIN
            </button>
            <button
              onClick={() => setCurrentView('settings')}
              className={`nav-tab ${currentView === 'settings' ? 'nav-tab--active' : 'nav-tab--inactive'}`}
            >
              <Cpu size={12} className="nav-tab__icon" />
              AI
            </button>
            <button
              onClick={() => setCurrentView('appSettings')}
              className={`nav-tab ${currentView === 'appSettings' ? 'nav-tab--active' : 'nav-tab--inactive'}`}
            >
              <AppWindow size={12} className="nav-tab__icon" />
              APP
            </button>
          </div>

          {/* Draggable area */}
          <div
            className="drag-region"
            data-tauri-drag-region="true"
            onMouseDown={(e) => {
              if (e.button === 0) {
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
            <div className="drag-region__content">
              <span className="drag-region__version">1.0</span>
              <span className="drag-region__title">Starstrike 1.0</span>
            </div>
          </div>

          <button
            onClick={() => getCurrentWindow().hide()}
            className="nav-tab nav-tab--close"
            title="Close"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </nav>

        <main className="app-content">
          {currentView === 'main' && <Overlay />}
          {currentView === 'settings' && <Settings />}
          {currentView === 'appSettings' && <AppSettings />}
        </main>
      </div>
    </div>
  );
}

export default App;
