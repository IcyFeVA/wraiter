import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Edit3, MessageSquare, PenTool, Loader2, Copy, Check } from 'lucide-react';

interface OverlayProps {}

const Overlay: React.FC<OverlayProps> = () => {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'proofread' | 'tone' | 'draft'>('proofread');
  const [selectedTone, setSelectedTone] = useState('professional');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Load clipboard text when component mounts
    loadClipboardText();
  }, []);

  // Force re-render when switching back to main view
  useEffect(() => {
    const handleFocus = () => {
      // Component will re-render and show current settings
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const loadClipboardText = async () => {
    try {
      // For now, we'll use a simple approach - in a real implementation
      // we'd need to get the app handle from Tauri
      setInputText('');
    } catch (error) {
      console.error('Failed to load clipboard text:', error);
    }
  };

  const handleAction = async (action: 'proofread' | 'tone' | 'draft') => {
    if (!inputText.trim()) {
      alert('Please enter some text to process');
      return;
    }

    setIsLoading(true);
    setSelectedAction(action);

    try {
      // Get settings from localStorage
      const apiKey = localStorage.getItem('openrouter_api_key') || '';
      const model = localStorage.getItem('selected_model') || '';

      // If no model is selected, show an error
      if (!model) {
        alert('Please select a model in Settings first');
        setIsLoading(false);
        return;
      }

      if (!apiKey) {
        alert('Please set your OpenRouter API key in Settings first');
        setIsLoading(false);
        return;
      }

      // Validate API key format
      if (!apiKey.startsWith('sk-or-v1-')) {
        alert('Invalid API key format. Please check your OpenRouter API key in Settings.');
        setIsLoading(false);
        return;
      }

      const result = await invoke<string>('process_text_with_ai', {
        text: inputText,
        action,
        model,
        apiKey,
        tone: action === 'tone' ? selectedTone : undefined
      });

      setOutputText(result);

      // Copy result to clipboard - simplified for now
      // await invoke('set_clipboard_text', { text: result });

    } catch (error) {
      console.error('Error processing text:', error);

      // Provide more specific error messages
      if (error && typeof error === 'string') {
        if (error.includes('401') || error.includes('Unauthorized') || error.includes('No auth credentials')) {
          alert('Authentication failed. Please check your OpenRouter API key in Settings.');
        } else if (error.includes('403') || error.includes('Forbidden')) {
          alert('Access forbidden. Your API key may not have permission to use this model.');
        } else if (error.includes('429') || error.includes('rate limit')) {
          alert('Rate limit exceeded. Please try again later.');
        } else if (error.includes('network') || error.includes('connection')) {
          alert('Network error. Please check your internet connection and try again.');
        } else {
          alert(`Error: ${error}`);
        }
      } else {
        alert('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (outputText) {
      try {
        // Simplified clipboard copy for now
        // await invoke('set_clipboard_text', { text: outputText });
        // For demo purposes, we'll use the browser clipboard API
        await navigator.clipboard.writeText(outputText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
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
    <div style={{
      padding: '2rem',
      maxWidth: '800px',
      margin: '0 auto',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>AI Quick Actions</h2>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => handleAction('proofread')}
          disabled={isLoading}
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: selectedAction === 'proofread' ? '#007bff' : '#f8f9fa',
            color: selectedAction === 'proofread' ? 'white' : '#333',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Edit3 size={16} />
          Proofread
        </button>

        <button
          onClick={() => handleAction('tone')}
          disabled={isLoading}
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: selectedAction === 'tone' ? '#007bff' : '#f8f9fa',
            color: selectedAction === 'tone' ? 'white' : '#333',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <MessageSquare size={16} />
          Change Tone
        </button>

        <button
          onClick={() => handleAction('draft')}
          disabled={isLoading}
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: selectedAction === 'draft' ? '#007bff' : '#f8f9fa',
            color: selectedAction === 'draft' ? 'white' : '#333',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <PenTool size={16} />
          Draft
        </button>
      </div>

      {/* Tone Selection (only show for tone action) */}
      {selectedAction === 'tone' && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: 'bold',
            color: '#333'
          }}>
            Select Tone:
          </label>
          <select
            value={selectedTone}
            onChange={(e) => setSelectedTone(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              width: '200px'
            }}
          >
            {toneOptions.map(tone => (
              <option key={tone} value={tone}>
                {tone.charAt(0).toUpperCase() + tone.slice(1)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Current Settings Display */}
      <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '0.875rem' }}>
        <div><strong>API Key:</strong> {localStorage.getItem('openrouter_api_key') ? 'Set' : 'Not set'}</div>
        <div><strong>Model:</strong> {localStorage.getItem('selected_model') || 'Not selected'}</div>
      </div>

      {/* Input Text Area */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{
          display: 'block',
          marginBottom: '0.5rem',
          fontWeight: 'bold',
          color: '#333'
        }}>
          Input Text:
        </label>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Enter text here or use selected text from clipboard..."
          style={{
            width: '100%',
            height: '120px',
            padding: '0.75rem',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            resize: 'vertical',
            fontFamily: 'inherit'
          }}
        />
      </div>

      {/* Output Text Area */}
      {outputText && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem'
          }}>
            <label style={{
              fontWeight: 'bold',
              color: '#333'
            }}>
              Output:
            </label>
            <button
              onClick={copyToClipboard}
              style={{
                padding: '0.25rem 0.5rem',
                backgroundColor: copied ? '#28a745' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.875rem'
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <textarea
            value={outputText}
            readOnly
            style={{
              width: '100%',
              height: '120px',
              padding: '0.75rem',
              border: '1px solid #28a745',
              borderRadius: '4px',
              backgroundColor: '#f8fff9',
              fontFamily: 'inherit'
            }}
          />
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          marginTop: '1rem'
        }}>
          <Loader2 size={20} style={{
            animation: 'spin 1s linear infinite',
            marginRight: '0.5rem'
          }} />
          Processing with AI...
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Overlay;
