import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSettings, Theme, THEMES } from '../contexts/SettingsContext';

const THEME_LABELS: Partial<Record<Theme, string>> = {
  AquaDark: 'Aqua Dark',
};

const themeLabel = (theme: Theme) => THEME_LABELS[theme] ?? theme;

// Console exists as a stylesheet but is not offered in the picker.
// Default theme first, the rest alphabetical.
const SELECTABLE_THEMES = THEMES.filter((theme) => theme !== 'Console' && theme !== 'NSX')
  .slice()
  .sort((a, b) => themeLabel(a).localeCompare(themeLabel(b)));

const AppSettings: React.FC = () => {
  const { settings, isLoaded, updateSettings, resetShortcut } = useSettings();

  // The shortcut input is a draft until saved, so it needs local state.
  const [shortcutDraft, setShortcutDraft] = useState(settings.shortcut);
  const [autostart, setAutostart] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setShortcutDraft(settings.shortcut);
  }, [settings.shortcut]);

  // Autostart is an OS-level toggle owned by the autostart plugin, not a
  // stored setting — it stays on its own commands.
  useEffect(() => {
    invoke<boolean>('is_autostart_enabled')
      .then(setAutostart)
      .catch((err) => console.error('Failed to read autostart state:', err));
  }, []);

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

    setShortcutDraft(shortcutString.join('+'));
  };

  const saveShortcut = async () => {
    setError(null);
    try {
      await updateSettings({ shortcut: shortcutDraft });
    } catch (err) {
      // The backend rejects a shortcut it cannot register and keeps the old one.
      console.error('Failed to save shortcut:', err);
      setError(`${err}`);
      setShortcutDraft(settings.shortcut);
    }
  };

  const handleResetShortcut = async () => {
    setError(null);
    try {
      await resetShortcut();
    } catch (err) {
      console.error('Failed to reset shortcut:', err);
      setError(`${err}`);
    }
  };

  const toggleAutostart = async () => {
    try {
      await invoke(autostart ? 'disable_autostart' : 'enable_autostart');
      setAutostart(!autostart);
    } catch (err) {
      console.error('Failed to toggle autostart:', err);
    }
  };

  const persist = (label: string) => (promise: Promise<unknown>) =>
    promise.catch((err) => console.error(`Failed to save ${label}:`, err));

  return (
    <div className="app-settings">
      <div className="app-settings__container">

        {error && (
          <div className="message-display message-display--error">
            <span className="message-display__text">{error}</span>
          </div>
        )}

        {/* Keyboard Shortcut Section */}
        <section className="app-settings__section">
          <h3 className="app-settings__section-title">Global Keyboard Shortcut</h3>
          <div className="app-settings__input-row">
            <div className="app-settings__input-container">
              <input
                type="text"
                value={shortcutDraft}
                onKeyDown={handleShortcutChange}
                placeholder="Press keys to set shortcut..."
                className="app-settings__shortcut-input"
                readOnly
              />
            </div>
            <button onClick={saveShortcut} className="app-settings__action-button">
              Save
            </button>
            <button onClick={handleResetShortcut} className="app-settings__action-button">
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
                  checked={settings.auto_close}
                  disabled={!isLoaded}
                  onChange={(e) =>
                    persist('auto-close setting')(updateSettings({ auto_close: e.target.checked }))
                  }
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
              value={settings.theme}
              disabled={!isLoaded}
              onChange={(e) =>
                persist('theme')(updateSettings({ theme: e.target.value as Theme }))
              }
              className="app-settings__theme-select"
            >
              <option value="NSX">NSX</option>
              {SELECTABLE_THEMES.map((theme) => (
                <option key={theme} value={theme}>
                  {themeLabel(theme)}
                </option>
              ))}
            </select>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AppSettings;
