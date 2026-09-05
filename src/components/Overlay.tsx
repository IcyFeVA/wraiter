import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Edit3, MessageSquare, PenTool, Loader2, Copy, Check } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

interface OverlayProps {}

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

const Overlay: React.FC<OverlayProps> = () => {
  const { settings, isLoaded } = useSettings();
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'proofread' | 'tone' | 'draft'>('proofread');
  // Session-local override of the stored default tone.
  const [selectedTone, setSelectedTone] = useState(settings.default_tone);
  const [copied, setCopied] = useState(false);
  const sendButtonRef = useRef<HTMLButtonElement>(null);

  const autoCloseEnabled = settings.auto_close;

  useEffect(() => {
    // Load clipboard text when component mounts
    loadClipboardText();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      setSelectedTone(settings.default_tone);
    }
  }, [isLoaded, settings.default_tone]);

  // Handle window focus to refresh clipboard content (but only when not auto-closing)
  useEffect(() => {
    const handleFocus = () => {
      // Only reload clipboard if we're not in an auto-close scenario
      // to prevent interference with the shortcut behavior
      loadClipboardText();

      // Focus the "Send to AI" button when the window is shown
      // and the current action is 'proofread'
      if (selectedAction === 'proofread' && sendButtonRef.current) {
        sendButtonRef.current.focus();
      }
    };

    window.addEventListener('focus', handleFocus);
    //return () => window.removeEventListener('focus', handleFocus);
  }, [selectedAction, autoCloseEnabled]);

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

    // The backend reads the key and model from the store and validates them
    // too; these checks only give faster feedback.
    if (!settings.openrouter_api_key) {
      alert('Please set your OpenRouter API key in Settings first');
      return;
    }
    if (!settings.selected_model) {
      alert('Please select a model in Settings first');
      return;
    }

    setIsLoading(true);

    try {
      const result = await invoke<string>('process_text_with_ai', {
        text: inputText,
        action: selectedAction,
        tone: selectedAction === 'tone' ? selectedTone : undefined
      });

      setOutputText(result);

      if (autoCloseEnabled || selectedAction === 'proofread') {
        // Automatically copy result to clipboard
        await invoke('set_clipboard_text', { text: result });
        await getCurrentWindow().hide();
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

  return (
    <div className="overlay">
      <div className="overlay__container">
        <div className="action-buttons">
          <button
            onClick={() => handleActionSelect('proofread')}
            disabled={isLoading}
            className={`action-button ${selectedAction === 'proofread' ? 'action-button--active' : ''}`}
          >
            <Edit3 size={12} className="action-button__icon" />
            Proofread
          </button>
          <button
            onClick={() => handleActionSelect('tone')}
            disabled={isLoading}
            className={`action-button ${selectedAction === 'tone' ? 'action-button--active' : ''}`}
          >
            <MessageSquare size={12} className="action-button__icon" />
            Change Tone
          </button>
          <button
            onClick={() => handleActionSelect('draft')}
            disabled={isLoading}
            className={`action-button ${selectedAction === 'draft' ? 'action-button--active' : ''}`}
          >
            <PenTool size={12} className="action-button__icon" />
            Draft
          </button>
        </div>

        {selectedAction === 'tone' && (
          <div className="tone-selection">
            <label className="tone-selection__label">Tone:</label>
            <select
              value={selectedTone}
              onChange={(e) => setSelectedTone(e.target.value)}
              className="tone-selection__select"
            >
              {TONE_OPTIONS.map(tone => (
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
              ref={sendButtonRef}
              onClick={handleSendToAI}
              disabled={isLoading}
              className="send-button"
            >
              <MessageSquare size={12} className="send-button__icon" />
              Send to AI
            </button>
          </div>
        )}

        <div className="input-section">
          <label className="input-section__label">Input:</label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter text here or use selected text from clipboard..."
            className="input-section__textarea"
          />
        </div>

        {outputText && !(
          autoCloseEnabled || selectedAction === 'proofread'
        ) && (
          <div className="output-section">
            <div className="output-section__header">
              <label className="output-section__label">Output:</label>
              <button
                onClick={copyToClipboard}
                className={`copy-button ${copied ? 'copy-button--copied' : ''}`}
              >
                {copied ? <Check size={12} className="copy-button__icon" /> : <Copy size={12} className="copy-button__icon" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <textarea
              value={outputText}
              readOnly
              className="output-section__textarea"
            />
          </div>
        )}

        {isLoading && (
          <div className="loading-indicator">
            <Loader2 size={16} className="loading-indicator__spinner" />
            <span className="loading-indicator__text">Processing with AI...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Overlay;
