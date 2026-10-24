import React, { useState, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function VoiceInputButton({ onTranscript, currentLanguage = 'en' }) {
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(Boolean(SpeechRecognition));
  }, []);

  const handleToggle = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please type your description.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      // Match Malayalam or English Indian accent
      recognition.lang = language === 'ml' ? 'ml-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onTranscript(transcript);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition event:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('Speech error:', err);
      setIsListening(false);
    }
  };

  if (!supported) {
    return (
      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }} title="Voice typing requires Chrome, Edge or Safari">
        (Voice typing not supported on this browser)
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`btn ${isListening ? 'btn-primary' : 'btn-secondary'}`}
      style={{
        padding: '0.4rem 0.85rem',
        fontSize: '0.82rem',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: isListening ? '#DC2626' : undefined,
        color: isListening ? '#FFFFFF' : undefined
      }}
      aria-label={isListening ? 'Stop listening' : 'Start voice input'}
      title="Speak your food details in Malayalam or English"
    >
      {isListening ? (
        <>
          <MicOff size={16} />
          <span>Listening... (Click to stop)</span>
        </>
      ) : (
        <>
          <Mic size={16} color="var(--accent-primary)" />
          <span>Voice Input ({language === 'ml' ? 'മലയാളം' : 'English'})</span>
        </>
      )}
    </button>
  );
}
