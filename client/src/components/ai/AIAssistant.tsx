import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Mic, MicOff, Send, Loader2 } from 'lucide-react';
import { create } from 'zustand';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAssistantStore {
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
}

const useAIAssistant = create<AIAssistantStore>((set) => ({
  messages: [],
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  clearMessages: () => set({ messages: [] }),
}));

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { messages, addMessage, clearMessages } = useAIAssistant();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Web Speech API setup
  const recognition = useRef<SpeechRecognition | null>(null);
  const synthesis = window.speechSynthesis;

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      recognition.current = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;

      recognition.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        setInputText(transcript);
      };

      recognition.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleListening = () => {
    if (!recognition.current) return;

    if (isListening) {
      recognition.current.stop();
    } else {
      recognition.current.start();
      setInputText('');
    }
    setIsListening(!isListening);
  };

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    synthesis.speak(utterance);
  };

  const handleSubmit = async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    addMessage({
      role: 'user',
      content: inputText,
      timestamp: new Date(),
    });

    try {
      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: inputText }),
      });

      if (!response.ok) throw new Error('Failed to process request');

      const data = await response.json();
      
      addMessage({
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      });

      // Provide voice feedback for the response
      speak(data.message);
    } catch (error) {
      console.error('Error processing AI request:', error);
      addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request.',
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
      setInputText('');
    }
  };

  return (
    <>
      <Button
        className="fixed bottom-4 right-4 rounded-full p-4"
        onClick={() => setIsOpen(true)}
      >
        AI Assistant
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>AI Assistant</DialogTitle>
          </DialogHeader>

          <div className="h-[400px] overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <Card
                key={index}
                className={`p-3 ${
                  message.role === 'user' ? 'bg-primary/10 ml-auto' : 'bg-secondary/10'
                } max-w-[80%]`}
              >
                {message.content}
              </Card>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex items-center gap-2 p-4">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleListening}
              className={isListening ? 'text-red-500' : ''}
            >
              {isListening ? <MicOff /> : <Mic />}
            </Button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md"
              placeholder="Type your message..."
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            />

            <Button 
              onClick={handleSubmit}
              disabled={isLoading || !inputText.trim()}
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
