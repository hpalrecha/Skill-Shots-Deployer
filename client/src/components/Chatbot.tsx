import { useState, useRef, useEffect } from 'react';
import { ChatMessage, Topic } from '../types';
import { getChatbotResponse } from '../services/geminiService';
import { XIcon, SendIcon, LoaderIcon, BrainIcon, SparklesIcon } from './icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  topics: Topic[];
}

export default function Chatbot({ isOpen, onClose, topics }: ChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'bot', text: 'Hello! I am your SkillShots AI assistant. How can I help you today?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useThinkingMode, setUseThinkingMode] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputValue,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    const topicList = topics.map(t => `- ${t.title} (${t.category})`).join('\n');
    const systemInstruction = `You are a helpful learning assistant for "SkillShots".
    The user has access to the following learning topics/courses:
    ${topicList}

    If the user asks about these specific topics, try to guide them to the content or answer based on general knowledge about those subjects.
    Be concise and encouraging.`;

    try {
      const botResponseText = await getChatbotResponse(inputValue, useThinkingMode, systemInstruction);
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: botResponseText,
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Card className="fixed bottom-20 right-6 w-full max-w-sm h-[60vh] flex flex-col shadow-2xl z-50 animate-in slide-in-from-bottom-4 duration-300" data-testid="card-chatbot">
      <header className="flex items-center justify-between gap-4 p-4 border-b bg-muted/50 rounded-t-xl">
        <h2 className="text-lg font-bold text-foreground">AI Assistant</h2>
        <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-chatbot">
          <XIcon className="h-5 w-5" />
        </Button>
      </header>

      <div className="flex-1 p-4 overflow-y-auto bg-muted/30">
        <div className="space-y-4">
          {messages.map(message => (
            <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-foreground'}`} data-testid={`message-${message.id}`}>
                <p className="whitespace-pre-wrap text-sm">{message.text}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-card border border-border flex items-center">
                <LoaderIcon className="animate-spin h-5 w-5 text-primary" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-4 border-t bg-card rounded-b-xl">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Switch
            id="thinking-mode"
            checked={useThinkingMode}
            onCheckedChange={setUseThinkingMode}
            data-testid="switch-thinking-mode"
          />
          <Label htmlFor="thinking-mode" className="flex items-center gap-2 cursor-pointer text-sm">
            {useThinkingMode ? <BrainIcon className="h-4 w-4 text-chart-4"/> : <SparklesIcon className="h-4 w-4 text-primary"/>}
            {useThinkingMode ? 'Thinking Mode' : 'Quick Mode'}
          </Label>
        </div>
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Ask anything..."
            disabled={isLoading}
            data-testid="input-chat-message"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !inputValue.trim()}
            data-testid="button-send-message"
          >
            <SendIcon className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
