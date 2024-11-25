import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Mic, MicOff, Send, Loader2 } from 'lucide-react';
import { create } from 'zustand';

// Define types for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

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
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'pending'>('pending');
  const [error, setError] = useState<string | null>(null);
  const [isAccessible, setIsAccessible] = useState(true);
  const { messages, addMessage, clearMessages } = useAIAssistant();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Improved accessibility announcement
  const announceRef = useRef<HTMLDivElement>(null);

  // Web Speech API setup
  const recognition = useRef<any>(null);
  const synthesis = window.speechSynthesis;
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [retryCount, setRetryCount] = useState<number>(0);
  const MAX_RETRIES = 3;
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const checkMicrophonePermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicPermission('granted');
        return stream;
      } catch (error) {
        console.error('Microphone permission error:', error);
        setMicPermission('denied');
        setError('Microphone access denied. Please enable microphone access to use voice features.');
        return null;
      }
    };

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setError('Speech recognition is not supported in your browser.');
      return;
    }

    const initializeSpeechRecognition = async () => {
      const stream = await checkMicrophonePermission();
      if (!stream) return;
      recognition.current = new SpeechRecognitionAPI();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;

      // Improve accuracy with configurations
      recognition.current.lang = 'en-US';
      recognition.current.maxAlternatives = 3;

      recognition.current.onresult = (event: SpeechRecognitionEvent) => {
        try {
          // Get the most confident result
          const results = Array.from(event.results);
          const mostConfidentResult = results
            .map(result => ({
              transcript: result[0].transcript as string,
              confidence: result[0].confidence as number
            }))
            .reduce((prev, current) => 
              current.confidence > prev.confidence ? current : prev
            );

          setInputText(mostConfidentResult.transcript);
          setRetryCount(0); // Reset retry count on successful recognition
          setError(null); // Clear any previous errors
        } catch (error) {
          console.error('Speech recognition result error:', error);
          setError('Failed to process speech input. Please try again.');
        }
      };

      recognition.current.onerror = async (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        
        if (retryCount < MAX_RETRIES) {
          // Retry logic
          setRetryCount(prev => prev + 1);
          await new Promise(resolve => setTimeout(resolve, 1000));
          if (recognition.current) {
            recognition.current.start();
          }
        } else {
          setIsListening(false);
          addMessage({
            role: 'assistant',
            content: 'Sorry, I had trouble understanding. Could you please try again or type your message?',
            timestamp: new Date()
          });
        }
      };

      // Setup audio analysis for visual feedback
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          const audioContext = new AudioContext();
          const source = audioContext.createMediaStreamSource(stream);
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyserRef.current = analyser;

          const updateAudioLevel = () => {
            if (!analyserRef.current) return;
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            setAudioLevel(average);
            animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
          };

          updateAudioLevel();
        })
        .catch(err => console.error('Error accessing microphone:', err));
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [retryCount]);

  // Enhanced speech synthesis with error handling
  const speak = (text: string) => {
    try {
      // Cancel any ongoing speech
      synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => {
        // Optional: Add callback for speech completion
      };
      utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        console.error('Speech synthesis error:', event.error);
        // Fallback to visual only
        addMessage({
          role: 'assistant',
          content: text,
          timestamp: new Date()
        });
      };

      // Improve voice clarity
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      synthesis.speak(utterance);
    } catch (error) {
      console.error('Speech synthesis error:', error);
      // Fallback to visual only
      addMessage({
        role: 'assistant',
        content: text,
        timestamp: new Date()
      });
    }
  };

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

  const handleSubmit = async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    setError(null);
    const MAX_RETRIES = 3;
    let retries = 0;

    const userMessage = {
      role: 'user' as const,
      content: inputText,
      timestamp: new Date(),
    };
    addMessage(userMessage);

    while (retries < MAX_RETRIES) {
      try {
        const response = await fetch('/api/ai/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: inputText }),
        });

        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }

        const data = await response.json();
        
        const assistantMessage = {
          role: 'assistant' as const,
          content: data.message,
          timestamp: new Date(),
        };
        addMessage(assistantMessage);

        // Provide voice feedback for the response
        if (micPermission === 'granted') {
          speak(data.message);
        }
        
        setInputText('');
        break; // Success, exit the retry loop
      } catch (error) {
        console.error(`Attempt ${retries + 1} failed:`, error);
        retries++;
        
        if (retries === MAX_RETRIES) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          setError(`Failed to process request after ${MAX_RETRIES} attempts. ${errorMessage}`);
          addMessage({
            role: 'assistant',
            content: 'I apologize, but I\'m having trouble processing your request. Please try again in a moment.',
            timestamp: new Date(),
          });
        } else {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
        }
      }
    }
    setIsLoading(false);
  };

  return (
    <>
      <Button
        className="fixed bottom-4 right-4 md:bottom-8 md:right-8 rounded-full p-4 z-50"
        onClick={() => setIsOpen(true)}
      >
        AI Assistant
      </Button>

            <div id="assistant-description" className="sr-only">
              AI Assistant for managing offers and client interactions. Use voice commands or type your queries.
            </div>
            <div
              ref={announceRef}
              role="status"
              aria-live="polite"
              className="sr-only"
            >
              {messages[messages.length - 1]?.content}
            </div>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent 
  className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] sm:w-[500px] max-h-[90vh] flex flex-col"
  aria-describedby="assistant-description"
>
          <DialogHeader>
            <DialogTitle>AI Assistant</DialogTitle>
          </DialogHeader>

          {error && (
            <div className="px-4 py-2 mb-4 text-sm text-red-800 bg-red-100 rounded-md">
              {error}
            </div>
          )}
          <div className="flex-1 min-h-[300px] max-h-[60vh] overflow-y-auto p-4 space-y-4">
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

          <div className="flex items-center gap-2 p-4 border-t">
            <div className="relative">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleListening}
                className={`relative ${isListening ? 'text-red-500' : ''}`}
                disabled={retryCount >= MAX_RETRIES}
              >
                {isListening ? <MicOff /> : <Mic />}
                {/* Audio level indicator */}
                {isListening && (
                  <div
                    className="absolute inset-0 rounded-full border-2 border-primary animate-pulse"
                    style={{
                      transform: `scale(${1 + (audioLevel / 255) * 0.5})`,
                      opacity: 0.5
                    }}
                  />
                )}
              </Button>
              {/* Retry indicator */}
              {retryCount > 0 && (
                <div className="absolute -top-2 -right-2 bg-warning text-warning-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                  {retryCount}
                </div>
              )}
            </div>

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
