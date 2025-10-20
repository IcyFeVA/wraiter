import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
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

  // Handle window focus to refresh clipboard content
  useEffect(() => {
    const handleFocus = () => {
      loadClipboardText();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const loadClipboardText = async () => {
    try {
      const clipboardText = await invoke<string>('get_clipboard_text');
      setInputText(clipboardText || '');
    } catch (error) {
      console.error('Failed to load clipboard text:', error);
      setInputText('');
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

      // For proofread action, show result briefly then hide window
      if (action === 'proofread') {
        setOutputText(result);

        // Automatically copy result to clipboard to replace user's selection
        await invoke('set_clipboard_text', { text: result });

        // Show result for 2 seconds, then hide window
        setTimeout(async () => {
          const appWindow = getCurrentWindow();
          await appWindow.hide();

          // Show notification that text is ready to paste
          try {
            if ('Notification' in window) {
              new Notification('Text Proofread Complete', {
                body: 'Proofread text copied to clipboard. Use Ctrl+V to paste.',
                icon: '/tauri.svg',
                silent: true
              });
            }
          } catch (e) {
            console.log('Notification not available');
          }
        }, 100);

        setIsLoading(false);
        return;
      }

      setOutputText(result);

      // Automatically copy result to clipboard to replace user's selection
      await invoke('set_clipboard_text', { text: result });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

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
        await invoke('set_clipboard_text', { text: outputText });
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
    <div
      style={{
        width: '100%',
        marginTop: '8px',
        padding: '8px',
        boxSizing: 'border-box',
        overflowY: 'auto',
        backgroundColor: '#c0c0c0',
        border: '2px inset #c0c0c0'
      }}>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '2px',
        marginBottom: '8px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => handleAction('proofread')}
          disabled={isLoading}
          style={{
            padding: '2px 8px',
            backgroundColor: selectedAction === 'proofread' ? '#808080' : '#c0c0c0',
            color: selectedAction === 'proofread' ? '#ffffff' : '#000000',
            border: '2px outset #c0c0c0',
            borderRadius: '0px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            minHeight: '20px'
          }}
        >
          <Edit3 size={12} />
          Proofread
        </button>

        <button
          onClick={() => handleAction('tone')}
          disabled={isLoading}
          style={{
            padding: '2px 8px',
            backgroundColor: selectedAction === 'tone' ? '#808080' : '#c0c0c0',
            color: selectedAction === 'tone' ? '#ffffff' : '#000000',
            border: '2px outset #c0c0c0',
            borderRadius: '0px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            minHeight: '20px'
          }}
        >
          <MessageSquare size={12} />
          Change Tone
        </button>

        <button
          onClick={() => handleAction('draft')}
          disabled={isLoading}
          style={{
            padding: '2px 8px',
            backgroundColor: selectedAction === 'draft' ? '#808080' : '#c0c0c0',
            color: selectedAction === 'draft' ? '#ffffff' : '#000000',
            border: '2px outset #c0c0c0',
            borderRadius: '0px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            minHeight: '20px'
          }}
        >
          <PenTool size={12} />
          Draft
        </button>
      </div>

      {/* Tone Selection (only show for tone action) */}
      {selectedAction === 'tone' && (
        <div style={{ marginBottom: '8px' }}>
          <select
            value={selectedTone}
            onChange={(e) => setSelectedTone(e.target.value)}
            style={{
              padding: '2px 4px',
              border: '2px inset #c0c0c0',
              borderRadius: '0px',
              width: '120px',
              fontSize: '11px',
              backgroundColor: '#ffffff',
              color: '#000000'
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
      {/* <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: 'transparent', borderRadius: '4px', fontSize: '0.875rem' }}>
        <div><strong>API Key:</strong> {localStorage.getItem('openrouter_api_key') ? 'Set' : 'Not set'}</div>
        <div><strong>Model:</strong> {localStorage.getItem('selected_model') || 'Not selected'}</div>
      </div> */}

      {/* Input Text Area */}
      <div style={{ marginBottom: '8px' }}>
        <label style={{
          display: 'block',
          marginBottom: '2px',
          fontWeight: 'normal',
          color: '#000000',
          fontSize: '11px'
        }}>
          Input Text:
        </label>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Enter text here or use selected text from clipboard..."
          style={{
            width: '100%',
            height: '60px',
            padding: '2px',
            border: '2px inset #c0c0c0',
            borderRadius: '0px',
            resize: 'vertical',
            fontFamily: 'monospace',
            fontSize: '11px',
            backgroundColor: '#ffffff',
            color: '#000000',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Output Text Area */}
      {outputText && (
        <div style={{ marginBottom: '8px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2px'
          }}>
            <label style={{
              fontWeight: 'normal',
              color: '#000000',
              fontSize: '11px'
            }}>
              Output:
            </label>
            <button
              onClick={copyToClipboard}
              style={{
                padding: '2px 8px',
                backgroundColor: copied ? '#808080' : '#c0c0c0',
                color: copied ? '#ffffff' : '#000000',
                border: '2px outset #c0c0c0',
                borderRadius: '0px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                minHeight: '18px'
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <textarea
            value={outputText}
            readOnly
            style={{
              width: '100%',
              height: '60px',
              padding: '2px',
              border: '2px inset #c0c0c0',
              borderRadius: '0px',
              backgroundColor: '#ffffff',
              color: '#000000',
              fontFamily: 'monospace',
              fontSize: '11px',
              boxSizing: 'border-box'
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
          padding: '8px',
          backgroundColor: '#c0c0c0',
          border: '2px inset #c0c0c0',
          marginTop: '8px'
        }}>
          <Loader2 size={16} style={{
            animation: 'spin 1s linear infinite',
            marginRight: '8px'
          }} />
          <span style={{ fontSize: '11px', color: '#000000' }}>
            Processing with AI...
          </span>
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
