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
  const [isLoading, setIsLoading] = useState(false);
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
      padding: '2rem',
      maxWidth: '800px',
      margin: '0 auto',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
        <SettingsIcon size={24} style={{ marginRight: '0.5rem' }} />
        <h2 style={{ margin: 0, color: '#333' }}>Settings</h2>
      </div>

      {/* Message Display */}
      {message && (
        <div style={{
          padding: '0.75rem',
          marginBottom: '1rem',
          borderRadius: '4px',
          backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
          color: message.type === 'success' ? '#155724' : '#721c24',
          border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* API Key Section */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', color: '#333' }}>OpenRouter API Key</h3>
        <p style={{ marginBottom: '1rem', color: '#666', fontSize: '0.875rem' }}>
          Get your API key from{' '}
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#007bff', textDecoration: 'none' }}
          >
            openrouter.ai/keys
          </a>
          {' '}(free account available)
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1 }}>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your OpenRouter API key..."
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontFamily: 'monospace'
              }}
            />
          </div>
          <button
            onClick={saveApiKey}
            disabled={isLoading}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {isLoading ? <Loader2 size={16} className="spin" /> : <Key size={16} />}
            Save Key
          </button>
        </div>

        <button
          onClick={fetchModels}
          disabled={isLoadingModels || !apiKey}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: isLoadingModels || !apiKey ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (isLoadingModels || !apiKey) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {isLoadingModels ? <Loader2 size={16} className="spin" /> : null}
          {isLoadingModels ? 'Loading Models...' : 'Load Available Models'}
        </button>
      </div>

      {/* Model Selection Section */}
      {models.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', color: '#333' }}>Model Selection</h3>
          <div style={{ marginBottom: '1rem' }}>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '0.875rem'
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
              padding: '0.5rem 1rem',
              backgroundColor: selectedModel ? '#007bff' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: selectedModel ? 'pointer' : 'not-allowed'
            }}
          >
            Save Model Selection
          </button>
        </div>
      )}

      {/* Current Settings Display */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', color: '#333' }}>Current Settings</h3>
        <div style={{
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          fontSize: '0.875rem'
        }}>
          <div><strong>API Key:</strong> {apiKey ? '••••••••' : 'Not set'}</div>
          <div><strong>Selected Model:</strong> {selectedModel || 'Not set'}</div>
          <div><strong>Available Models:</strong> {models.length}</div>
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{ borderTop: '1px solid #dee2e6', paddingTop: '1rem' }}>
        <h3 style={{ marginBottom: '1rem', color: '#dc3545' }}>Danger Zone</h3>
        <button
          onClick={clearSettings}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
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
