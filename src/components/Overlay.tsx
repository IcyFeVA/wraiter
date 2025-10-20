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
  const [autoCloseEnabled, setAutoCloseEnabled] = useState(true);

  useEffect(() => {
    // Load clipboard text when component mounts
    loadClipboardText();

    // Load default tone setting
    const savedDefaultTone = localStorage.getItem('default_tone') || 'professional';
    setSelectedTone(savedDefaultTone);

    // Load auto-close setting
    const savedAutoClose = localStorage.getItem('auto_close') !== 'false';
    setAutoCloseEnabled(savedAutoClose);
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

  const handleActionSelect = (action: 'proofread' | 'tone' | 'draft') => {
    setSelectedAction(action);
  };

  const handleSendToAI = async () => {
    if (!inputText.trim()) {
      alert('Please enter some text to process');
      return;
    }

    setIsLoading(true);

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

      // Get max tokens setting
      const maxTokens = localStorage.getItem('max_tokens') || '2000';
      const autoCloseEnabled = localStorage.getItem('auto_close') !== 'false';

      const result = await invoke<string>('process_text_with_ai', {
        text: inputText,
        action: selectedAction,
        model,
        apiKey,
        tone: selectedAction === 'tone' ? selectedTone : undefined,
        maxTokens: parseInt(maxTokens)
      });

      // For proofread action, show result briefly then hide window
      if (selectedAction === 'proofread') {
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

      // Handle auto-close behavior for tone and draft actions
      if (autoCloseEnabled && (selectedAction === 'tone' || selectedAction === 'draft')) {
        // Automatically copy result to clipboard to replace user's selection
        await invoke('set_clipboard_text', { text: result });

        // Show result for 2 seconds, then hide window
        setTimeout(async () => {
          const appWindow = getCurrentWindow();
          await appWindow.hide();

          // Show notification that text is ready to paste
          try {
            if ('Notification' in window) {
              const actionName = selectedAction === 'tone' ? 'Tone Changed' : 'Draft Complete';
              new Notification(`Text ${actionName}`, {
                body: `${actionName} text copied to clipboard. Use Ctrl+V to paste.`,
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

      // Default behavior: show result and copy button
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
      className="overlay-container"
      style={{
        width: '100%',
        marginTop: '8px',
        padding: '8px',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '2px',
        marginBottom: '8px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => handleActionSelect('proofread')}
          disabled={isLoading}
          className={selectedAction === 'proofread' ? 'action-button active' : 'action-button'}
          style={{
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
          onClick={() => handleActionSelect('tone')}
          disabled={isLoading}
          className={selectedAction === 'tone' ? 'action-button active' : 'action-button'}
          style={{
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
          onClick={() => handleActionSelect('draft')}
          disabled={isLoading}
          className={selectedAction === 'draft' ? 'action-button active' : 'action-button'}
          style={{
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

      {/* Tone Selection (show for tone action) */}
      {selectedAction === 'tone' && (
        <div style={{
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <label style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
            Tone:
          </label>
          <select
            value={selectedTone}
            onChange={(e) => setSelectedTone(e.target.value)}
            className="tone-select"
            style={{
              flex: 1,
              fontSize: '11px',
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

      {/* Send Button (show for all actions) */}
      {selectedAction && (
        <div style={{
          marginBottom: '8px',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={handleSendToAI}
            disabled={isLoading}
            className="send-button"
            style={{
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              minHeight: '20px',
              padding: '4px 8px'
            }}
          >
            <MessageSquare size={12} />
            Send to AI
          </button>
        </div>
      )}

      {/* Current Settings Display */}
      {/* <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: 'transparent', borderRadius: '4px', fontSize: '0.875rem' }}>
        <div><strong>API Key:</strong> {localStorage.getItem('openrouter_api_key') ? 'Set' : 'Not set'}</div>
        <div><strong>Model:</strong> {localStorage.getItem('selected_model') || 'Not selected'}</div>
      </div> */}

      {/* Input Text Area */}
      <div style={{ marginBottom: '8px' }}>
        <label className="input-label">
          Input:
        </label>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Enter text here or use selected text from clipboard..."
          className="text-input"
          style={{
            width: '100%',
            height: '60px',
            resize: 'vertical',
            fontFamily: 'monospace',
            fontSize: '11px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Output Text Area (hide for proofread and when auto-close is enabled for tone/draft) */}
      {outputText && !(
        selectedAction === 'proofread' ||
        (autoCloseEnabled && (selectedAction === 'tone' || selectedAction === 'draft'))
      ) && (
        <div style={{ marginBottom: '4px', borderTop: '1px dashed #00ffff5a', paddingTop: '8px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2px'
          }}>
            <label className="output-label">
              Output:
            </label>
            <button
              onClick={copyToClipboard}
              className={copied ? 'copy-button copied' : 'copy-button'}
              style={{
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
            className="text-output"
            style={{
              width: '100%',
              height: '60px',
              fontFamily: 'monospace',
              fontSize: '11px',
              boxSizing: 'border-box'
            }}
          />
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="loading-indicator">
          <Loader2 size={16} className="spinner" />
          <span className="loading-text">
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
