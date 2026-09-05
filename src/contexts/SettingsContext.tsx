import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export const THEMES = [
  'NSX',
  'Aqua',
  'AquaDark',
  'Console',
  'Abelton',
  'Lamasass',
  'ICQ',
  'Ampwin',
  'Maverick',
] as const;

export type Theme = (typeof THEMES)[number];

/**
 * Mirrors the `Settings` struct in `src-tauri/src/lib.rs`. Field names are
 * snake_case to match the Rust struct and the keys in `settings.json` — one
 * vocabulary end to end. The Tauri store is the only place settings live;
 * nothing here is cached in localStorage.
 */
export interface Settings {
  shortcut: string;
  auto_close: boolean;
  openrouter_api_key: string;
  selected_model: string;
  max_tokens: number;
  default_tone: string;
  theme: Theme;
}

export type SettingsPatch = Partial<Settings>;

const DEFAULT_SETTINGS: Settings = {
  shortcut: 'CommandOrControl+Shift+A',
  auto_close: true,
  openrouter_api_key: '',
  selected_model: '',
  max_tokens: 2000,
  default_tone: 'professional',
  theme: 'NSX',
};

interface SettingsContextValue {
  settings: Settings;
  /** False until the store has been read; render-blocking styling waits on this. */
  isLoaded: boolean;
  updateSettings: (patch: SettingsPatch) => Promise<Settings>;
  resetShortcut: () => Promise<Settings>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

/**
 * One-time migration: settings used to be split between the Tauri store and
 * localStorage. Move anything still sitting in localStorage into the store,
 * then clear it so there is only one source of truth.
 * Safe to delete once existing installs have run this at least once.
 */
const LEGACY_KEYS = [
  'openrouter_api_key',
  'selected_model',
  'max_tokens',
  'default_tone',
  'app_theme',
] as const;

const migrateLegacyLocalStorage = async (stored: Settings): Promise<Settings> => {
  let legacy: Partial<Record<(typeof LEGACY_KEYS)[number], string>> = {};
  try {
    for (const key of LEGACY_KEYS) {
      const value = localStorage.getItem(key);
      if (value) legacy[key] = value;
    }
  } catch (error) {
    console.warn('Could not read legacy settings from localStorage:', error);
    return stored;
  }

  if (Object.keys(legacy).length === 0) return stored;

  // Only fill in what the store does not already have, so a value saved since
  // the migration always wins over the stale localStorage copy.
  const patch: SettingsPatch = {};
  if (legacy.openrouter_api_key && !stored.openrouter_api_key) {
    patch.openrouter_api_key = legacy.openrouter_api_key;
  }
  if (legacy.selected_model && !stored.selected_model) {
    patch.selected_model = legacy.selected_model;
  }
  if (legacy.max_tokens && stored.max_tokens === DEFAULT_SETTINGS.max_tokens) {
    const parsed = parseInt(legacy.max_tokens, 10);
    if (Number.isFinite(parsed)) patch.max_tokens = parsed;
  }
  if (legacy.default_tone && stored.default_tone === DEFAULT_SETTINGS.default_tone) {
    patch.default_tone = legacy.default_tone;
  }
  if (legacy.app_theme && stored.theme === DEFAULT_SETTINGS.theme) {
    if ((THEMES as readonly string[]).includes(legacy.app_theme)) {
      patch.theme = legacy.app_theme as Theme;
    }
  }

  let result = stored;
  if (Object.keys(patch).length > 0) {
    try {
      result = await invoke<Settings>('update_settings', { patch });
      console.info('Migrated settings from localStorage into the Tauri store');
    } catch (error) {
      console.error('Failed to migrate settings into the Tauri store:', error);
      return stored; // Leave localStorage intact so the next start can retry.
    }
  }

  try {
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Could not clear legacy localStorage settings:', error);
  }

  return result;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await invoke<Settings>('get_settings');
        setSettings(await migrateLegacyLocalStorage(stored));
      } catch (error) {
        console.error('Failed to load settings, falling back to defaults:', error);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      document.body.className = `theme-${settings.theme.toLowerCase()}`;
    }
  }, [settings.theme, isLoaded]);

  const updateSettings = useCallback(async (patch: SettingsPatch) => {
    const next = await invoke<Settings>('update_settings', { patch });
    setSettings(next);
    return next;
  }, []);

  const resetShortcut = useCallback(async () => {
    const next = await invoke<Settings>('reset_shortcut');
    setSettings(next);
    return next;
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, isLoaded, updateSettings, resetShortcut }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
