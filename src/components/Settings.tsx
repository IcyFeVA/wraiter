import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Key, Loader2, Check, AlertCircle } from 'lucide-react';

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
  const [maxTokens, setMaxTokens] = useState('2000');
  const [defaultTone, setDefaultTone] = useState('professional');
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

  const loadSettings = () => {
    const savedApiKey = localStorage.getItem('openrouter_api_key') || '';
    const savedModel = localStorage.getItem('selected_model') || '';
    const savedMaxTokens = localStorage.getItem('max_tokens') || '2000';
    const savedDefaultTone = localStorage.getItem('default_tone') || 'professional';

    setApiKey(savedApiKey);
    setSelectedModel(savedModel);
    setMaxTokens(savedMaxTokens);
    setDefaultTone(savedDefaultTone);
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

  const toneOptions = [
    'professional',
    'casual',
    'friendly',
    'formal',
    'enthusiastic',
    'empathetic',
    'confident',
    'concise'
  ];

  return (
    <div className="settings">
      <div className="settings__container">
        {/* Message Display */}
        {message && (
          <div className={`message-display message-display--${message.type}`}>
            {message.type === "success" ? (
              <Check size={12} className={`message-display__icon message-display__icon--${message.type}`} />
            ) : (
              <AlertCircle size={12} className={`message-display__icon message-display__icon--${message.type}`} />
            )}
            <span className="message-display__text">{message.text}</span>
          </div>
        )}

        {/* API Key Section */}
        <section className="settings__section">
          <h3 className="settings__section-title">OpenRouter API Key:</h3>
          <p className="settings__api-description">
            Get your API key from{" "}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="settings__api-link"
            >
              openrouter.ai/keys
            </a>{" "}
            (free account available)
          </p>
          <div className="settings__input-row">
            <div className="settings__input-container">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your OpenRouter API key..."
                className="settings__api-input"
              />
            </div>
            <button onClick={saveApiKey} className="settings__save-button">
              <Key size={12} className="settings__button-icon" />
              Save Key
            </button>
          </div>

          <button
            onClick={fetchModels}
            disabled={isLoadingModels || !apiKey}
            className={`settings__load-button ${isLoadingModels || !apiKey ? 'settings__load-button--disabled' : ''}`}
          >
            {isLoadingModels ? (
              <Loader2 size={12} className="settings__spinner settings__button-icon" />
            ) : null}
            {isLoadingModels ? "Loading Models..." : "Load Available Models"}
          </button>

          {selectedModel && (
            <div className="settings__current-model">
              <strong>Current Model:</strong> {selectedModel}
            </div>
          )}
        </section>

        {/* Model Selection Section */}
        {models.length > 0 && (
          <section className="settings__section">
            <h3 className="settings__section-title">Model Selection</h3>
            <div className="settings__select-container">
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value)
                  localStorage.setItem('selected_model', e.target.value);
                  setMessage({ type: 'success', text: 'Model selection saved!' });
                }}
                className="settings__model-select"
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
          </section>
        )}

        {/* AI Settings Section */}
        <section className="settings__section">
          <div className="settings__spacer"></div>

          {/* Max Tokens Setting */}
          <div className="settings__setting-row">
            <label className="settings__setting-label">
              Max Tokens:
            </label>
            <div className="settings__select-container">
              <input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(e.target.value)}
                placeholder="2000"
                min="1000"
                max="10000"
                className="settings__model-select"
              />
            </div>
            <div className="settings__setting-description">
              Maximum tokens to use for AI responses (default: 2000)
            </div>
          </div>

          {/* Default Tone Setting */}
          <div className="settings__setting-row">
            <label className="settings__setting-label">
              Default Tone:
            </label>
            <div className="settings__select-container">
              <select
                value={defaultTone}
                onChange={(e) => setDefaultTone(e.target.value)}
                className="settings__model-select"
              >
                {toneOptions.map(tone => (
                  <option key={tone} value={tone}>
                    {tone.charAt(0).toUpperCase() + tone.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="settings__setting-description">
              For "Change Tone" action
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
