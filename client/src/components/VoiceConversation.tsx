import { useState, useRef, useEffect, useCallback } from 'react';
import { ContentBlock } from '../types';
import { Button } from '@/components/ui/button';
import { SparklesIcon, LoaderIcon } from './icons';
import { Mic, MicOff, X, Volume2, VolumeX } from 'lucide-react';

interface VoiceConversationProps {
  topicTitle: string;
  contentBlocks: ContentBlock[];
  onClose: () => void;
}

interface ConversationTurn {
  role: 'user' | 'assistant';
  text: string;
}

export default function VoiceConversation({ 
  topicTitle, 
  contentBlocks, 
  onClose 
}: VoiceConversationProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([]);
  const [statusText, setStatusText] = useState('Tap the mic to start talking');
  const [autoListen, setAutoListen] = useState(true);
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initialize speech synthesis
    synthRef.current = window.speechSynthesis;

    // Initialize speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setCurrentTranscript(finalTranscript || interimTranscript);

        // Reset silence timeout on new speech
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }

        // If we have a final transcript, wait a bit then send
        if (finalTranscript.trim()) {
          silenceTimeoutRef.current = setTimeout(() => {
            handleSendMessage(finalTranscript.trim());
          }, 1200); // 1.2 seconds of silence triggers send
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setStatusText('Error with voice recognition. Try again.');
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (!isProcessing && !isSpeaking && autoListen) {
          // Don't auto-restart, let user tap again
          setStatusText('Tap the mic to continue');
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isProcessing || isSpeaking) return;

    try {
      setCurrentTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
      setStatusText('Listening... speak now');
    } catch (error) {
      console.error('Failed to start recognition:', error);
    }
  }, [isProcessing, isSpeaking]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    setIsListening(false);
  }, []);

  const speakText = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!synthRef.current) {
        resolve();
        return;
      }

      // Cancel any ongoing speech
      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Try to get a natural voice
      const voices = synthRef.current.getVoices();
      const preferredVoice = voices.find(v => 
        v.name.includes('Google') || 
        v.name.includes('Natural') || 
        v.name.includes('Samantha')
      ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setStatusText('Speaking...');
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        resolve();
      };

      synthRef.current.speak(utterance);
    });
  }, []);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isProcessing) return;

    stopListening();
    setIsProcessing(true);
    setCurrentTranscript('');
    setStatusText('Thinking...');

    // Add user message to history
    const newHistory = [...conversationHistory, { role: 'user' as const, text }];
    setConversationHistory(newHistory);

    try {
      // Build recent history for context
      const recentHistory = newHistory.slice(-6).map(m => ({
        role: m.role,
        content: m.text
      }));

      const response = await fetch('/api/gemini/topic-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: contentBlocks,
          topicTitle,
          question: text,
          chatHistory: recentHistory
        })
      });

      if (!response.ok) throw new Error('Failed to get response');
      
      const data = await response.json();
      const aiResponse = data.answer || "I'm not sure about that.";

      // Add AI response to history
      setConversationHistory(prev => [...prev, { role: 'assistant', text: aiResponse }]);

      // Speak the response
      setIsProcessing(false);
      await speakText(aiResponse);

      // After speaking, ready for next input
      setStatusText('Tap the mic to ask another question');

    } catch (error) {
      console.error('Error:', error);
      setConversationHistory(prev => [...prev, { 
        role: 'assistant', 
        text: "Sorry, I couldn't process that. Try again." 
      }]);
      setIsProcessing(false);
      setStatusText('Tap the mic to try again');
    }
  }, [conversationHistory, contentBlocks, topicTitle, stopListening, speakText, isProcessing]);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsSpeaking(false);
    setStatusText('Tap the mic to continue');
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-6"
      data-testid="voice-conversation-overlay"
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4"
        onClick={onClose}
        data-testid="button-close-voice"
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Topic indicator */}
      <div className="absolute top-4 left-4 flex items-center gap-2 text-muted-foreground">
        <SparklesIcon className="h-5 w-5 text-primary" />
        <span className="text-sm font-medium truncate max-w-[200px]">{topicTitle}</span>
      </div>

      {/* Conversation display */}
      <div className="flex-1 w-full max-w-md overflow-y-auto mb-8 space-y-4">
        {conversationHistory.map((turn, index) => (
          <div 
            key={index}
            className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                turn.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-foreground'
              }`}
            >
              <p className="text-sm">{turn.text}</p>
            </div>
          </div>
        ))}

        {/* Current transcript (while speaking) */}
        {currentTranscript && (
          <div className="flex justify-end">
            <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-primary/50 text-primary-foreground">
              <p className="text-sm italic">{currentTranscript}...</p>
            </div>
          </div>
        )}
      </div>

      {/* Status text */}
      <p className="text-muted-foreground text-center mb-6" data-testid="voice-status">
        {statusText}
      </p>

      {/* Main controls */}
      <div className="flex items-center gap-4">
        {isSpeaking ? (
          <Button
            variant="outline"
            size="lg"
            className="w-20 h-20 rounded-full"
            onClick={stopSpeaking}
            data-testid="button-stop-speaking"
          >
            <VolumeX className="h-8 w-8" />
          </Button>
        ) : (
          <Button
            variant={isListening ? 'destructive' : 'default'}
            size="lg"
            className={`w-20 h-20 rounded-full transition-all ${
              isListening ? 'animate-pulse scale-110' : ''
            } ${isProcessing ? 'opacity-50' : ''}`}
            onClick={toggleListening}
            disabled={isProcessing}
            data-testid="button-voice-toggle"
          >
            {isProcessing ? (
              <LoaderIcon className="h-8 w-8 animate-spin" />
            ) : isListening ? (
              <MicOff className="h-8 w-8" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </Button>
        )}
      </div>

      {/* Visual feedback for listening */}
      {isListening && (
        <div className="mt-6 flex gap-1">
          <div className="w-2 h-8 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-12 bg-primary rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-6 bg-primary rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          <div className="w-2 h-10 bg-primary rounded-full animate-pulse" style={{ animationDelay: '450ms' }} />
          <div className="w-2 h-4 bg-primary rounded-full animate-pulse" style={{ animationDelay: '600ms' }} />
        </div>
      )}

      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="mt-6 flex items-center gap-2 text-primary">
          <Volume2 className="h-5 w-5 animate-pulse" />
          <span className="text-sm">AI is speaking...</span>
        </div>
      )}
    </div>
  );
}
