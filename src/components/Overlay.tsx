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

  // Handle window focus to refresh clipboard content (but only when not auto-closing)
  useEffect(() => {
    const handleFocus = () => {
      // Only reload clipboard if we're not in an auto-close scenario
      // to prevent interference with the shortcut behavior
      if (!autoCloseEnabled || selectedAction === 'proofread') {
        loadClipboardText();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [autoCloseEnabled, selectedAction]);

  // Reload auto-close setting on window focus
  useEffect(() => {
    const handleFocus = () => {
      const savedAutoClose = localStorage.getItem('auto_close') !== 'false';
      setAutoCloseEnabled(savedAutoClose);
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

        // Show result for 2 seconds, then hide window using the new command
        setTimeout(async () => {
          try {
            await invoke('hide_overlay');
          } catch (error) {
            console.error('Failed to hide overlay:', error);
            // Fallback to direct window hide
            const appWindow = getCurrentWindow();
            await appWindow.hide();
          }

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

        // Show result for 2 seconds, then hide window using the new command
        setTimeout(async () => {
          try {
            await invoke('hide_overlay');
          } catch (error) {
            console.error('Failed to hide overlay:', error);
            // Fallback to direct window hide
            const appWindow = getCurrentWindow();
            await appWindow.hide();
          }

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
    <div className="inner">
      <div className="settings-container">
        <div className="action-buttons-container">
          <button
            onClick={() => handleActionSelect('proofread')}
            disabled={isLoading}
            className={`action-button ${selectedAction === 'proofread' ? 'active' : ''}`}
          >
            <Edit3 size={12} />
            Proofread
          </button>
          <button
            onClick={() => handleActionSelect('tone')}
            disabled={isLoading}
            className={`action-button ${selectedAction === 'tone' ? 'active' : ''}`}
          >
            <MessageSquare size={12} />
            Change Tone
          </button>
          <button
            onClick={() => handleActionSelect('draft')}
            disabled={isLoading}
            className={`action-button ${selectedAction === 'draft' ? 'active' : ''}`}
          >
            <PenTool size={12} />
            Draft
          </button>
        </div>
        {selectedAction === 'tone' && (
          <div className="tone-selection-container">
            <label className="tone-label">Tone:</label>
            <select
              value={selectedTone}
              onChange={(e) => setSelectedTone(e.target.value)}
              className="model-select"
            >
              {toneOptions.map(tone => (
                <option key={tone} value={tone}>
                  {tone.charAt(0).toUpperCase() + tone.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )}
        {selectedAction && (
          <div className="send-button-container">
            <button
              onClick={handleSendToAI}
              disabled={isLoading}
              className="send-button"
            >
              <MessageSquare size={12} />
              Send to AI
            </button>
          </div>
        )}
        <div className="input-container">
          <label className="input-label">Input:</label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter text here or use selected text from clipboard..."
            className="text-input"
          />
        </div>
        {outputText && !(
          selectedAction === 'proofread' ||
          (autoCloseEnabled && (selectedAction === 'tone' || selectedAction === 'draft'))
        ) && (
          <div className="output-container">
            <div className="output-header">
              <label className="output-label">Output:</label>
              <button
                onClick={copyToClipboard}
                className={`copy-button ${copied ? 'copied' : ''}`}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <textarea
              value={outputText}
              readOnly
              className="text-output"
            />
          </div>
        )}
        {isLoading && (
          <div className="loading-indicator">
            <Loader2 size={16} className="spinner" />
            <span className="loading-text">Processing with AI...</span>
          </div>
        )}
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default Overlay;
