import React, { useState, useEffect, useRef } from 'react';
import { AppState } from '../../types';
import { Send, Mic, MicOff } from './Icons';

interface ChatInputProps {
  onSend: (message: string) => void;
  appState: AppState;
  className?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, appState, className }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Speech Recognition
    if (typeof window !== 'undefined') {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US'; 

        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          
          if (finalTranscript) {
             setInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
          }
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
        
        recognitionRef.current.onerror = (event: any) => {
            console.error(event.error);
            setIsListening(false);
        };
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
        alert("Speech recognition is not supported in this browser.");
        return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || appState === AppState.STREAMING) return;
    onSend(input);
    setInput('');
    if (isListening && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
    }
  };

  return (
    // FIX: Height set to h-14 to strictly match MenuFab
    <div className={`w-full h-14 ${className}`}>
      <form 
        onSubmit={handleSubmit}
        className="w-full relative pointer-events-auto group h-full"
      >
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-indigo-900/30 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        
        {/* Input Container - h-full ensures it fills the h-14 parent */}
        <div className={`relative flex items-center w-full h-full bg-[#0f172a]/90 backdrop-blur-xl border ${isListening ? 'border-red-500/50 shadow-red-900/20' : 'border-indigo-500/20'} rounded-full px-4 shadow-2xl transition-all focus-within:bg-[#0f172a] focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20`}>
          
          {/* Microphone Toggle */}
          <button
            type="button"
            onClick={toggleListening}
            className={`mr-2 p-1.5 rounded-full transition-all shrink-0 ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-indigo-400 hover:bg-indigo-500/10'}`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? "Listening..." : "Ask the universe..."}
            disabled={appState === AppState.STREAMING}
            className="bg-transparent border-none outline-none flex-1 text-white placeholder-slate-500 font-normal text-sm h-full py-0" 
          />
          
          <button
            type="submit"
            disabled={!input.trim() || appState === AppState.STREAMING}
            className={`p-2 rounded-full transition-all duration-300 shrink-0 ${
              input.trim() && appState !== AppState.STREAMING 
                ? 'bg-indigo-600 text-white hover:bg-indigo-500 rotate-0 shadow-lg shadow-indigo-900/50' 
                : 'bg-white/5 text-white/10 cursor-not-allowed rotate-90'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};