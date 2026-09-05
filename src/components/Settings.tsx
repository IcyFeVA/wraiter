import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Key, Loader2, Check, AlertCircle } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

interface SettingsProps {}

interface Model {
  id: string;
  name: string;
  description?: string;
}

const TONE_OPTIONS = [
  'professional',
  'casual',
  'friendly',
  'formal',
  'enthusiastic',
  'empathetic',
  'confident',
  'concise'
];

const Settings: React.FC<SettingsProps> = () => {
  const { settings, isLoaded, updateSettings } = useSettings();

  // Drafts for the inputs that should not hit the store on every keystroke.
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [maxTokensDraft, setMaxTokensDraft] = useState(String(settings.max_tokens));
  const [models, setModels] = useState<Model[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isLoaded) {
      setApiKeyDraft(settings.openrouter_api_key);
      setMaxTokensDraft(String(settings.max_tokens));
    }
  }, [isLoaded, settings.openrouter_api_key, settings.max_tokens]);

  const saveApiKey = async () => {
    if (!apiKeyDraft.trim()) {
      setMessage({ type: 'error', text: 'Please enter an API key' });
      return;
    }

    // Basic API key format validation for OpenRouter
    if (!apiKeyDraft.startsWith('sk-or-v1-')) {
      setMessage({ type: 'error', text: 'Invalid API key format. OpenRouter API keys should start with "sk-or-v1-"' });
      return;
    }

    try {
      await updateSettings({ openrouter_api_key: apiKeyDraft });
      setMessage({ type: 'success', text: 'API key saved successfully!' });
      // Automatically fetch models after saving API key
      await fetchModels();
    } catch (error) {
      console.error('Failed to save API key:', error);
      setMessage({ type: 'error', text: `Failed to save API key: ${error}` });
    }
  };

  // The backend reads the stored key itself — it is never passed through here.
  const fetchModels = async () => {
    setIsLoadingModels(true);
    setMessage(null);

    try {
      const modelsData = await invoke<any[]>('fetch_openrouter_models');

      const formattedModels: Model[] = modelsData.map(model => ({
        id: model.id as string,
        name: model.name as string || model.id as string,
        description: model.description as string
      }));

      setModels(formattedModels);

      // Set default model if none selected
      if (!settings.selected_model && formattedModels.length > 0) {
        // Try to find a free model first, then Gemini 2.0 Flash
        const freeModel = formattedModels.find(m =>
          m.id.includes('free') || m.id.includes('gemini-2.0-flash-exp:free')
        );
        const geminiModel = formattedModels.find(m =>
          m.id.includes('gemini-2.0-flash') || m.name.toLowerCase().includes('gemini')
        );
        const defaultModel = freeModel || geminiModel || formattedModels[0];
        await updateSettings({ selected_model: defaultModel.id });
      }

      setMessage({ type: 'success', text: `Loaded ${formattedModels.length} models` });
    } catch (error) {
      console.error('Error fetching models:', error);
      setMessage({ type: 'error', text: `Failed to fetch models: ${error}` });
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Committed on blur rather than per keystroke to avoid a write per digit.
  const commitMaxTokens = async () => {
    const parsed = parseInt(maxTokensDraft, 10);
    if (!Number.isFinite(parsed)) {
      setMaxTokensDraft(String(settings.max_tokens));
      return;
    }

    const clamped = Math.min(Math.max(parsed, 1000), 10000);
    setMaxTokensDraft(String(clamped));
    if (clamped === settings.max_tokens) return;

    try {
      await updateSettings({ max_tokens: clamped });
    } catch (error) {
      console.error('Failed to save max tokens:', error);
      setMaxTokensDraft(String(settings.max_tokens));
    }
  };

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
                value={apiKeyDraft}
                onChange={(e) => setApiKeyDraft(e.target.value)}
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
            disabled={isLoadingModels || !settings.openrouter_api_key}
            className={`settings__load-button ${isLoadingModels || !settings.openrouter_api_key ? 'settings__load-button--disabled' : ''}`}
          >
            {isLoadingModels ? (
              <Loader2 size={12} className="settings__spinner settings__button-icon" />
            ) : null}
            {isLoadingModels ? "Loading Models..." : "Load Available Models"}
          </button>
        </section>

        {/* Model Selection Section */}
        {models.length > 0 && (
          <section className="settings__section">
            <h3 className="settings__section-title">Model Selection</h3>
            <div className="settings__select-container">
              <select
                value={settings.selected_model}
                onChange={async (e) => {
                  try {
                    await updateSettings({ selected_model: e.target.value });
                    setMessage({ type: 'success', text: 'Model selection saved!' });
                  } catch (error) {
                    console.error('Failed to save model selection:', error);
                    setMessage({ type: 'error', text: `Failed to save model selection: ${error}` });
                  }
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
              {settings.selected_model && (
                <div className="settings__current-model">
                  <strong>Current Model:</strong> {settings.selected_model}
                </div>
              )}
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
                value={maxTokensDraft}
                onChange={(e) => setMaxTokensDraft(e.target.value)}
                onBlur={commitMaxTokens}
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
                value={settings.default_tone}
                disabled={!isLoaded}
                onChange={(e) =>
                  updateSettings({ default_tone: e.target.value }).catch((error) =>
                    console.error('Failed to save default tone:', error)
                  )
                }
                className="settings__model-select"
              >
                {TONE_OPTIONS.map(tone => (
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
