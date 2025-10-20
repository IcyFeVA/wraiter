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
    <div style={{
      padding: '8px',
      maxWidth: '800px',
      margin: '0 auto',
      backgroundColor: '#1a1a2e',
      border: '2px inset #16213e'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <SettingsIcon size={16} style={{ marginRight: '4px', color: '#00d4ff' }} />
        <h2 style={{ margin: 0, color: '#00d4ff', fontSize: '14px', fontWeight: 'normal' }}>Settings</h2>
      </div>

      {/* Message Display */}
      {message && (
        <div style={{
          padding: '4px 8px',
          marginBottom: '8px',
          border: '2px outset #16213e',
          backgroundColor: message.type === 'success' ? '#16213e' : '#16213e',
          color: message.type === 'success' ? '#00ff88' : '#ff6b6b',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '11px'
        }}>
          {message.type === 'success' ? <Check size={12} color="#00ff88" /> : <AlertCircle size={12} color="#ff6b6b" />}
          {message.text}
        </div>
      )}

      {/* API Key Section */}
      <div style={{ marginBottom: '8px' }}>
        <h3 style={{ marginBottom: '4px', color: '#00d4ff', fontSize: '11px', fontWeight: 'normal' }}>OpenRouter API Key</h3>
        <p style={{ marginBottom: '8px', color: '#00d4ff', fontSize: '11px' }}>
          Get your API key from{' '}
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#ff6b9d', textDecoration: 'none' }}
          >
            openrouter.ai/keys
          </a>
          {' '}(free account available)
        </p>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
          <div style={{ flex: 1 }}>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your OpenRouter API key..."
              style={{
                width: '100%',
                padding: '2px 4px',
                border: '2px inset #16213e',
                borderRadius: '0px',
                fontFamily: 'monospace',
                fontSize: '11px',
                backgroundColor: '#16213e',
                color: '#00d4ff'
              }}
            />
          </div>
          <button
            onClick={saveApiKey}
            style={{
              padding: '2px 8px',
              backgroundColor: '#16213e',
              color: '#00d4ff',
              border: '2px outset #16213e',
              borderRadius: '0px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              minHeight: '20px'
            }}
          >
            <Key size={12} color="#00d4ff" />
            Save Key
          </button>
        </div>

        <button
          onClick={fetchModels}
          disabled={isLoadingModels || !apiKey}
          style={{
            padding: '2px 8px',
            backgroundColor: (isLoadingModels || !apiKey) ? '#0e1a33' : '#16213e',
            color: '#00d4ff',
            border: '2px outset #16213e',
            borderRadius: '0px',
            cursor: (isLoadingModels || !apiKey) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            minHeight: '20px'
          }}
        >
          {isLoadingModels ? <Loader2 size={12} className="spin" color="#00d4ff" /> : null}
          {isLoadingModels ? 'Loading Models...' : 'Load Available Models'}
        </button>
      </div>

      {/* Model Selection Section */}
      {models.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <h3 style={{ marginBottom: '4px', color: '#00d4ff', fontSize: '11px', fontWeight: 'normal' }}>Model Selection</h3>
          <div style={{ marginBottom: '8px' }}>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{
                width: '100%',
                padding: '2px 4px',
                border: '2px inset #16213e',
                borderRadius: '0px',
                fontSize: '11px',
                backgroundColor: '#16213e',
                color: '#00d4ff'
              }}
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
            style={{
              padding: '2px 8px',
              backgroundColor: selectedModel ? '#16213e' : '#0e1a33',
              color: '#00d4ff',
              border: '2px outset #16213e',
              borderRadius: '0px',
              cursor: selectedModel ? 'pointer' : 'not-allowed',
              fontSize: '11px',
              minHeight: '20px'
            }}
          >
            Save Model Selection
          </button>
        </div>
      )}

      {/* Current Settings Display */}
      <div style={{ marginBottom: '8px' }}>
        <h3 style={{ marginBottom: '4px', color: '#00d4ff', fontSize: '11px', fontWeight: 'normal' }}>Current Settings</h3>
        <div style={{
          padding: '4px 8px',
          backgroundColor: '#16213e',
          border: '2px inset #16213e',
          fontSize: '11px',
          color: '#00d4ff'
        }}>
          <div><strong>API Key:</strong> {apiKey ? '••••••••' : 'Not set'}</div>
          <div><strong>Selected Model:</strong> {selectedModel || 'Not set'}</div>
          <div><strong>Available Models:</strong> {models.length}</div>
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{ borderTop: '2px inset #16213e', paddingTop: '8px' }}>
        <h3 style={{ marginBottom: '4px', color: '#ff6b6b', fontSize: '11px', fontWeight: 'normal' }}>Danger Zone</h3>
        <button
          onClick={clearSettings}
          style={{
            padding: '2px 8px',
            backgroundColor: '#16213e',
            color: '#ff6b6b',
            border: '2px outset #16213e',
            borderRadius: '0px',
            cursor: 'pointer',
            fontSize: '11px',
            minHeight: '20px'
          }}
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
