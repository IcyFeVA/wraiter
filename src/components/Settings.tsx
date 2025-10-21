import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Key, Loader2, Check, AlertCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface SettingsProps {}

interface Model {
  id: string;
  name: string;
  description?: string;
}

const Settings: React.FC<SettingsProps> = () => {
  const { theme, setTheme } = useTheme();
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [maxTokens, setMaxTokens] = useState('2000');
  const [defaultTone, setDefaultTone] = useState('professional');
  const [autoClose, setAutoClose] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load saved settings
    loadSettings();
    setIsLoaded(true);
  }, []);

  // Auto-save max tokens setting (only after initial load)
  useEffect(() => {
    if (isLoaded && maxTokens) {
      localStorage.setItem('max_tokens', maxTokens);
    }
  }, [maxTokens, isLoaded]);

  // Auto-save default tone setting (only after initial load)
  useEffect(() => {
    if (isLoaded && defaultTone) {
      localStorage.setItem('default_tone', defaultTone);
    }
  }, [defaultTone, isLoaded]);

  // Auto-save auto-close setting (only after initial load)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('auto_close', autoClose.toString());
    }
  }, [autoClose, isLoaded]);

  const loadSettings = () => {
    const savedApiKey = localStorage.getItem('openrouter_api_key') || '';
    const savedModel = localStorage.getItem('selected_model') || '';
    const savedMaxTokens = localStorage.getItem('max_tokens') || '2000';
    const savedDefaultTone = localStorage.getItem('default_tone') || 'professional';
    const savedAutoClose = localStorage.getItem('auto_close') !== 'false'; // Default to true

    setApiKey(savedApiKey);
    setSelectedModel(savedModel);
    setMaxTokens(savedMaxTokens);
    setDefaultTone(savedDefaultTone);
    setAutoClose(savedAutoClose);
  };

  const saveApiKey = () => {
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: 'Please enter an API key' });
      return;
    }

    // Basic API key format validation for OpenRouter
    if (!apiKey.startsWith('sk-or-v1-')) {
      setMessage({ type: 'error', text: 'Invalid API key format. OpenRouter API keys should start with "sk-or-v1-"' });
      return;
    }

    localStorage.setItem('openrouter_api_key', apiKey);
    setMessage({ type: 'success', text: 'API key saved successfully!' });

    // Automatically fetch models after saving API key
    fetchModels();
  };

  const fetchModels = async () => {
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: 'Please enter an API key first' });
      return;
    }

    setIsLoadingModels(true);
    setMessage(null);

    try {
      const modelsData = await invoke<any[]>('fetch_openrouter_models', { apiKey });

      const formattedModels: Model[] = modelsData.map(model => ({
        id: model.id as string,
        name: model.name as string || model.id as string,
        description: model.description as string
      }));

      setModels(formattedModels);

      // Set default model if none selected
      if (!selectedModel && formattedModels.length > 0) {
        // Try to find a free model first, then Gemini 2.0 Flash
        const freeModel = formattedModels.find(m =>
          m.id.includes('free') || m.id.includes('gemini-2.0-flash-exp:free')
        );
        const geminiModel = formattedModels.find(m =>
          m.id.includes('gemini-2.0-flash') || m.name.toLowerCase().includes('gemini')
        );
        const defaultModel = freeModel || geminiModel || formattedModels[0];
        setSelectedModel(defaultModel.id);
        localStorage.setItem('selected_model', defaultModel.id);
      }

      setMessage({ type: 'success', text: `Loaded ${formattedModels.length} models` });
    } catch (error) {
      console.error('Error fetching models:', error);
      setMessage({ type: 'error', text: `Failed to fetch models: ${error}` });
    } finally {
      setIsLoadingModels(false);
    }
  };

  const saveModelSelection = () => {
    if (!selectedModel) {
      setMessage({ type: 'error', text: 'Please select a model' });
      return;
    }

    localStorage.setItem('selected_model', selectedModel);
    setMessage({ type: 'success', text: 'Model selection saved!' });
  };

  const clearSettings = () => {
    localStorage.removeItem('openrouter_api_key');
    localStorage.removeItem('selected_model');
    localStorage.removeItem('max_tokens');
    localStorage.removeItem('default_tone');
    localStorage.removeItem('auto_close');
    setApiKey('');
    setSelectedModel('');
    setMaxTokens('2000');
    setDefaultTone('professional');
    setAutoClose(true);
    setModels([]);
    setMessage({ type: 'success', text: 'Settings cleared!' });
  };

  return (
    <div className="settings-container">

      {/* Message Display */}
      {message && (
        <div
          className={
            message.type === "success"
              ? "message-display success"
              : "message-display error"
          }
        >
          {message.type === "success" ? (
            <Check size={12} className="message-icon success" />
          ) : (
            <AlertCircle size={12} className="message-icon error" />
          )}
          <span className="message-text">{message.text}</span>
        </div>
      )}

      {/* API Key Section */}
      <div className="settings-section">
        <h3 className="section-title">OpenRouter API Key:</h3>
        <p className="api-key-description">
          Get your API key from{" "}
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="api-key-link"
          >
            openrouter.ai/keys
          </a>{" "}
          (free account available)
        </p>
        <div className="input-row">
          <div className="input-container">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your OpenRouter API key..."
              className="api-key-input"
            />
          </div>
          <button onClick={saveApiKey} className="save-key-button">
            <Key size={12} className="button-icon" />
            Save Key
          </button>
        </div>

        <button
          onClick={fetchModels}
          disabled={isLoadingModels || !apiKey}
          className={
            isLoadingModels || !apiKey
              ? "load-models-button disabled"
              : "load-models-button"
          }
        >
          {isLoadingModels ? (
            <Loader2 size={12} className="spin button-icon" />
          ) : null}
          {isLoadingModels ? "Loading Models..." : "Load Available Models"}
        </button>

        {selectedModel && (<div style={{ marginTop: '4px' }}>
          <strong>Current Model:</strong> {selectedModel}
        </div>
        )}
      </div>

      {/* Model Selection Section */}
      {models.length > 0 && (
        <div className="settings-section">
          <h3 className="section-title">Model Selection</h3>
          <div className="select-container">
            <select
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value)
                localStorage.setItem('selected_model', e.target.value);
                setMessage({ type: 'success', text: 'Model selection saved!' });
              }}
              className="model-select"
            >
              <option value="">Select a model...</option>
              {[...models]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}{" "}
                    {model.description ? ` - ${model.description}` : ""}
                  </option>
                ))}
            </select>
          </div>

          {/* <button
            onClick={saveModelSelection}
            disabled={!selectedModel}
            className={
              !selectedModel
                ? "save-model-button disabled"
                : "save-model-button"
            }
          >
            Save Model Selection
          </button> */}
        </div>
      )}

      {/* AI Settings Section */}
      <div className="settings-section">
        <div className="spacer-16" />

        {/* Max Tokens Setting */}
        <div className="setting-row">
          <label className="setting-label">
            Max Tokens:
          </label>
          <div className="select-container">
            <input
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(e.target.value)}
              placeholder="2000"
              min="1000"
              max="10000"
              className="model-select"
            />
          </div>
          <div className="setting-description">
            Maximum tokens to use for AI responses (default: 2000)
          </div>
        </div>

        {/* Default Tone Setting */}
        <div className="setting-row">
          <label className="setting-label">
            Default Tone:
          </label>
          <div className="select-container">
            <select
              value={defaultTone}
              onChange={(e) => setDefaultTone(e.target.value)}
              className="model-select"
            >
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="friendly">Friendly</option>
              <option value="formal">Formal</option>
              <option value="enthusiastic">Enthusiastic</option>
              <option value="empathetic">Empathetic</option>
              <option value="confident">Confident</option>
              <option value="concise">Concise</option>
            </select>
          </div>
          <div className="setting-description">
            For "Change Tone" action
          </div>
        </div>

        {/* Auto-close Setting */}
        <div className="setting-row">
          <label className="setting-label">
            Auto-Close:
          </label>
          <div className="select-container">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={autoClose}
                onChange={(e) => setAutoClose(e.target.checked)}
                className="checkbox"
              />
              <span>Close window after copying result (proofread always auto-closes)</span>
            </label>
          </div>
          <div className="setting-description">
            Automatically copy result to clipboard and hide window
          </div>
        </div>
      </div>

      {/* Theme Selection Section */}
      <div className="settings-section">
        <h3 className="section-title">Theme:</h3>
        <div className="select-container">
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as 'NSX' | 'Aqua')}
            className="model-select"
          >
            <option value="NSX">NSX</option>
            <option value="Aqua">Aqua</option>
          </select>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="danger-zone">
        <h3 className="danger-title">Danger Zone</h3>
        <button onClick={clearSettings} className="clear-settings-button">
          Clear All Settings
        </button>
      </div>

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Settings;
