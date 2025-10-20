import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Key, Loader2, Check, AlertCircle, Settings as SettingsIcon } from 'lucide-react';

interface SettingsProps {}

interface Model {
  id: string;
  name: string;
  description?: string;
}

const Settings: React.FC<SettingsProps> = () => {
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Load saved settings
    loadSettings();
  }, []);

  const loadSettings = () => {
    const savedApiKey = localStorage.getItem('openrouter_api_key') || '';
    const savedModel = localStorage.getItem('selected_model') || '';

    setApiKey(savedApiKey);
    setSelectedModel(savedModel);
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
    setApiKey('');
    setSelectedModel('');
    setModels([]);
    setMessage({ type: 'success', text: 'Settings cleared!' });
  };

  return (
    <div className="settings-container">
      {/* <div className="settings-header">
        <SettingsIcon size={16} className="settings-icon" />
        <h2 className="settings-title">Settings</h2>
      </div> */}

      {/* Message Display */}
      {message && (
        <div className={message.type === 'success' ? 'message-display success' : 'message-display error'}>
          {message.type === 'success' ? <Check size={12} className="message-icon success" /> : <AlertCircle size={12} className="message-icon error" />}
          <span className="message-text">{message.text}</span>
        </div>
      )}

      {/* API Key Section */}
      <div className="settings-section">
        <h3 className="section-title">OpenRouter API Key</h3>
        <p className="api-key-description">
          Get your API key from{' '}
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="api-key-link"
          >
            openrouter.ai/keys
          </a>
          {' '}(free account available)
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
          <button
            onClick={saveApiKey}
            className="save-key-button"
          >
            <Key size={12} className="button-icon" />
            Save Key
          </button>
        </div>

        <button
          onClick={fetchModels}
          disabled={isLoadingModels || !apiKey}
          className={isLoadingModels || !apiKey ? 'load-models-button disabled' : 'load-models-button'}
        >
          {isLoadingModels ? <Loader2 size={12} className="spin button-icon" /> : null}
          {isLoadingModels ? 'Loading Models...' : 'Load Available Models'}
        </button>
      </div>

      {/* Model Selection Section */}
      {models.length > 0 && (
        <div className="settings-section">
          <h3 className="section-title">Model Selection</h3>
          <div className="select-container">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="model-select"
            >
              <option value="">Select a model...</option>
              {models.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name} {model.description ? ` - ${model.description}` : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={saveModelSelection}
            disabled={!selectedModel}
            className={!selectedModel ? 'save-model-button disabled' : 'save-model-button'}
          >
            Save Model Selection
          </button>
        </div>
      )}

      {/* Current Settings Display */}
      <div className="settings-section">
        <h3 className="section-title">Current Settings</h3>
        <div className="current-settings-display">
          <div><strong>API Key:</strong> {apiKey ? '••••••••' : 'Not set'}</div>
          <div><strong>Selected Model:</strong> {selectedModel || 'Not set'}</div>
          <div><strong>Available Models:</strong> {models.length}</div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="danger-zone">
        <h3 className="danger-title">Danger Zone</h3>
        <button
          onClick={clearSettings}
          className="clear-settings-button"
        >
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
