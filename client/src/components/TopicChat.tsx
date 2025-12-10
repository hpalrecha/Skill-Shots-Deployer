import { useState, useRef, useEffect } from 'react';
import { ContentBlock } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { SendIcon, SparklesIcon, LoaderIcon } from './icons';
import { Mic, MicOff, User, Phone } from 'lucide-react';
import VoiceConversation from './VoiceConversation';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface TopicChatProps {
  topicTitle: string;
  contentBlocks: ContentBlock[];
}

export default function TopicChat({ topicTitle, contentBlocks }: TopicChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [showVoiceMode, setShowVoiceMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if Web Speech API is supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(prev => prev + (prev ? ' ' : '') + transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Speech recognition error:', error);
        setIsListening(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Build conversation history for context (last 6 messages)
      const recentHistory = messages.slice(-6).map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch('/api/gemini/topic-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: contentBlocks,
          topicTitle,
          question: userMessage.content,
          chatHistory: recentHistory
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I couldn't process that. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Voice mode overlay
  if (showVoiceMode) {
    return (
      <VoiceConversation
        topicTitle={topicTitle}
        contentBlocks={contentBlocks}
        onClose={() => setShowVoiceMode(false)}
      />
    );
  }

  return (
    <Card className="p-4" data-testid="topic-chat">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-primary" />
          <h4 className="font-semibold text-foreground">Ask about this topic</h4>
        </div>
        {speechSupported && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowVoiceMode(true)}
            className="gap-2"
            data-testid="button-voice-mode"
          >
            <Phone className="h-4 w-4" />
            Voice Mode
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        I can answer questions about this course content. Ask me anything!
      </p>

      {/* Chat Messages */}
      {messages.length > 0 && (
        <div className="max-h-[300px] overflow-y-auto mb-4 space-y-3 pr-2">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              data-testid={`chat-message-${message.role}`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <SparklesIcon className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                {message.content}
              </div>
              {message.role === 'user' && (
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2 justify-start">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <SparklesIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted px-3 py-2 rounded-lg">
                <LoaderIcon className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Ask a question..."
            disabled={isLoading}
            className="pr-10"
            data-testid="input-chat-question"
          />
          {speechSupported && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={`absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 ${isListening ? 'text-destructive' : 'text-muted-foreground'}`}
              onClick={toggleListening}
              disabled={isLoading}
              data-testid="button-voice-input"
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        <Button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          data-testid="button-send-chat"
        >
          {isLoading ? (
            <LoaderIcon className="h-4 w-4 animate-spin" />
          ) : (
            <SendIcon className="h-4 w-4" />
          )}
        </Button>
      </form>

      {isListening && (
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
          Listening... speak now
        </p>
      )}
    </Card>
  );
}
