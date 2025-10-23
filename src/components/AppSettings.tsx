import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Power, RotateCcw, Save } from 'lucide-react';

const AppSettings: React.FC = () => {
  const [shortcut, setShortcut] = useState('');
  const [autostart, setAutostart] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load settings from backend when component mounts
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedShortcut = await invoke<string>('get_shortcut');
      const isAutostartEnabled = await invoke<boolean>('is_autostart_enabled');
      setShortcut(savedShortcut);
      setAutostart(isAutostartEnabled);
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
    <div className="settings-container">
      {/* Message Display */}
      {message && (
        <div className={`message-display ${message.type}`}>
          <span className="message-text">{message.text}</span>
        </div>
      )}

      {/* Keyboard Shortcut Section */}
      <div className="settings-section">
        <h3 className="section-title">Global Keyboard Shortcut</h3>
        <p className="setting-description">
          Set the key combination to show the application overlay.
        </p>
        <div className="input-row">
          <div className="input-container">
            <input
              type="text"
              value={shortcut}
              onKeyDown={handleShortcutChange}
              placeholder="Press keys to set shortcut..."
              className="api-key-input" // Reusing style
              readOnly
            />
          </div>
          <button onClick={saveShortcut} className="save-key-button">
            <Save size={12} className="button-icon" />
            Save
          </button>
          <button onClick={resetShortcut} className="clear-settings-button" style={{ marginLeft: '8px' }}>
            <RotateCcw size={12} className="button-icon" />
            Reset
          </button>
        </div>
      </div>

      {/* Autostart Section */}
      <div className="settings-section">
        <h3 className="section-title">Application Startup</h3>
        <div className="setting-row">
          <label className="setting-label">
            <Power size={14} style={{ marginRight: '8px' }} />
            Launch at login:
          </label>
          <div className="select-container">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={autostart}
                onChange={toggleAutostart}
                className="checkbox"
              />
              <span>Enable</span>
            </label>
          </div>
          <div className="setting-description">
            Automatically start the application when you log in to your computer.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppSettings;
