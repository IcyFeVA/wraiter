import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTheme } from '../contexts/ThemeContext';

const AppSettings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [shortcut, setShortcut] = useState('');
  const [autostart, setAutostart] = useState(false);
  const [autoClose, setAutoClose] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load settings from backend when component mounts
  useEffect(() => {
    loadSettings();
  }, []);





  const loadSettings = async () => {
    try {
      const savedShortcut = await invoke<string>('get_shortcut');
      const isAutostartEnabled = await invoke<boolean>('is_autostart_enabled');
      const savedAutoClose = await invoke<boolean>('get_auto_close');
      setShortcut(savedShortcut);
      setAutostart(isAutostartEnabled);
      setAutoClose(savedAutoClose);
    } catch (error) {
      console.error('Failed to load app settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    }
  };

  const handleShortcutChange = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const { key, ctrlKey, altKey, shiftKey, metaKey } = e;

    // Build the shortcut string
    let shortcutString = [];
    if (ctrlKey) shortcutString.push('Control');
    if (shiftKey) shortcutString.push('Shift');
    if (altKey) shortcutString.push('Alt');
    if (metaKey) shortcutString.push('Command');

    // Add the main key, converting to uppercase
    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
      shortcutString.push(key.toUpperCase());
    }

    setShortcut(shortcutString.join('+'));
  };


  const saveShortcut = async () => {
    // Basic validation
    if (!shortcut.includes('Control') && !shortcut.includes('Command') && !shortcut.includes('Alt') && !shortcut.includes('Shift')) {
      setMessage({ type: 'error', text: 'Shortcut must include a modifier key (Ctrl, Alt, Shift, Command)' });
      return;
    }

    try {
      await invoke('set_shortcut', { shortcut });
      setMessage({ type: 'success', text: 'Shortcut saved successfully!' });
    } catch (error) {
      console.error('Failed to save shortcut:', error);
      setMessage({ type: 'error', text: `Failed to save shortcut: ${error}` });
    }
  };

  const resetShortcut = async () => {
    try {
      await invoke('reset_shortcut');
      const defaultShortcut = await invoke<string>('get_shortcut'); // Fetch the new default
      setShortcut(defaultShortcut);
      setMessage({ type: 'success', text: 'Shortcut reset to default' });
    } catch (error) {
      console.error('Failed to reset shortcut:', error);
      setMessage({ type: 'error', text: 'Failed to reset shortcut' });
    }
  };

  const toggleAutostart = async () => {
    try {
      if (autostart) {
        await invoke('disable_autostart');
        setAutostart(false);
        setMessage({ type: 'success', text: 'Autostart disabled' });
      } else {
        await invoke('enable_autostart');
        setAutostart(true);
        setMessage({ type: 'success', text: 'Autostart enabled' });
      }
    } catch (error) {
      console.error('Failed to toggle autostart:', error);
      setMessage({ type: 'error', text: `Failed to update autostart: ${error}` });
    }
  };

  return (
    <div className="app-settings">
      <div className="app-settings__container">
        {/* Message Display */}
        {message && (
          <div className={`message-display message-display--${message.type}`}>
            <span className="message-display__text">{message.text}</span>
          </div>
        )}

        {/* Keyboard Shortcut Section */}
        <section className="app-settings__section">
          <h3 className="app-settings__section-title">Global Keyboard Shortcut</h3>
          <div className="app-settings__input-row">
            <div className="app-settings__input-container">
              <input
                type="text"
                value={shortcut}
                onKeyDown={handleShortcutChange}
                placeholder="Press keys to set shortcut..."
                className="app-settings__shortcut-input"
                readOnly
              />
            </div>
            <button onClick={saveShortcut} className="app-settings__action-button">
              Save
            </button>
            <button onClick={resetShortcut} className="app-settings__action-button">
              Reset
            </button>
          </div>
        </section>

        {/* Autostart Section */}
        <section className="app-settings__section">
          <h3 className="app-settings__section-title">Autostart</h3>
          <div className="app-settings__setting-row">
            <div className="app-settings__checkbox-container">
              <label className="app-settings__checkbox-label">
                <input
                  type="checkbox"
                  checked={autostart}
                  onChange={toggleAutostart}
                  className="app-settings__checkbox"
                />
                <span>Enable</span>
              </label>
            </div>
            <div className="app-settings__setting-description">
              Automatically start the application when you log in to your computer.
            </div>
          </div>
        </section>

        {/* Auto-close Setting */}
        <section className="app-settings__section">
          <div className="app-settings__setting-row">
            <label className="app-settings__setting-label">
              Auto-Close:
            </label>
            <div className="app-settings__checkbox-container">
              <label className="app-settings__checkbox-label">
                <input
                  type="checkbox"
                  checked={autoClose}
                  onChange={async (e) => {
                    const checked = e.target.checked;
                    setAutoClose(checked);
                    try {
                      await invoke('set_auto_close', { autoClose: checked });
                      setMessage({ type: 'success', text: 'Auto-close setting saved' });
                    } catch (error) {
                      console.error('Failed to save auto-close setting:', error);
                      setMessage({ type: 'error', text: 'Failed to save auto-close setting' });
                    }
                  }}
                  className="app-settings__checkbox"
                />
                <span>Close window after copying result (proofread always auto-closes)</span>
              </label>
            </div>
            <div className="app-settings__setting-description">
              Automatically copy result to clipboard and hide window
            </div>
          </div>
        </section>

        {/* Theme Selection Section */}
        <section className="app-settings__section">
          <h3 className="app-settings__section-title">Theme:</h3>
          <div className="app-settings__select-container">
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'NSX' | 'Aqua' | 'AquaDark' | 'Abelton' | 'Lamasass' | 'ICQ' | 'Ampwin' | 'Maverick')}
              className="app-settings__theme-select"
            >
              <option value="NSX">NSX</option>
              <option value="Ampwin">Ampwin</option>
              <option value="Aqua">Aqua</option>
              <option value="AquaDark">Aqua Dark</option>
              <option value="Abelton">Abelton</option>
              <option value="ICQ">ICQ</option>
              <option value="Lamasass">Lamasass</option>
              <option value="Maverick">Maverick</option>

              {/* <option value="Console">Console</option> */}
            </select>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AppSettings;
