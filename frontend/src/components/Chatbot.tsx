import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faPaperclip, faMicrophone, faRobot, faUser, faCircle, faTimes } from '@fortawesome/free-solid-svg-icons';
import { checkHealth } from '@/lib/api';
import { useTranslation } from 'react-i18next';

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: string;
  type?: 'text' | 'summary' | 'keywords' | 'answer' | 'legal_sections';
  legalSections?: LegalSection[];
  summary?: string;
  structuredKeywords?: Record<string, string>;
}

interface LegalSection {
  section: string;
  title: string;
  description: string;
  punishment: string;
  act: string;
  bailable: string;
  cognizable: string;
}

interface KeywordItem {
  label: string;
  value: string;
}

const Chatbot = () => {
  const { t } = useTranslation('common');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'bot',
      content: t('chatbot.welcome'),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text'
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isFirstInput, setIsFirstInput] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check backend connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      const healthy = await checkHealth();
      setIsConnected(healthy);
      if (!healthy) {
        const errorMessage: Message = {
          id: 'connection-error',
          role: 'bot',
          content: '⚠️ Unable to connect to the backend server. Please ensure the backend is running on http://localhost:8000',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'text'
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    };
    checkConnection();
  }, []);

  const conversations = [
    { title: 'Property Dispute Query', time: '2 hours ago' },
    { title: 'Employment Law Question', time: 'Yesterday' },
    { title: 'Contract Review Help', time: '2 days ago' },
    { title: 'Family Law Consultation', time: '1 week ago' },
  ];

  const suggestedQuestions = [
    'What are my rights as a tenant?',
    'How to file a consumer complaint?',
    'Explain Section 498A IPC',
    'What is the legal process for property registration?',
    'What are workplace harassment laws?',
    'How to file an FIR (First Information Report)?',
    'Explain the legal procedure for contract review',
    'What documents do I need for a property dispute?',
  ];

  const renderKeywords = (keywords: KeywordItem[]) => {
    if (!keywords || keywords.length === 0) return null;

    // Group keywords by priority
    const priority = ['Reporter', 'Victim', 'Suspect', 'Witness'];
    const times = ['Time of incident', 'Time when victim was found', 'Visitor time', 'Time'];
    
    const priorityKeywords = keywords.filter(k => priority.includes(k.label));
    const timeKeywords = keywords.filter(k => times.includes(k.label));
    const otherKeywords = keywords.filter(k => 
      !priority.includes(k.label) && !times.includes(k.label)
    );

    const orderedKeywords = [...priorityKeywords, ...timeKeywords, ...otherKeywords];

    return (
      <div className="space-y-2 mt-2">
        {orderedKeywords.map((kw, idx) => (
          <div 
            key={idx} 
            className="flex items-start space-x-2 bg-primary/5 p-2 rounded-lg hover:bg-primary/10 transition-colors duration-200"
          >
            <span className="font-bold text-primary text-sm min-w-[140px]">{kw.label}:</span>
            <span className="text-foreground text-sm flex-1">{kw.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text'
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('http://localhost:8000/api/chat/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: currentInput, 
          language: navigator.language?.startsWith('ta') ? 'ta' : 'en',
          is_first_input: isFirstInput
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      if (data.success) {
        const isIncidentReport = data.query_type === 'incident_report';
        
        // 1. Show SUMMARY first (for incident reports on first input)
        if (isIncidentReport && isFirstInput && data.summary) {
          const summaryMessage: Message = {
            id: `${Date.now()}-summary`,
            role: 'bot',
            content: data.summary,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'summary'
          };
          setMessages(prev => [...prev, summaryMessage]);
        }
        
        // 2. Keywords are now only logged in backend, NOT displayed in frontend
        // (Removed keyword display section)

        // 3. Show legal sections if available
        if (data.legal_sections && data.legal_sections.length > 0) {
          setTimeout(() => {
            const legalSectionsMessage: Message = {
              id: `${Date.now()}-legal-sections`,
              role: 'bot',
              content: '',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              type: 'legal_sections',
              legalSections: data.legal_sections
            };
            setMessages(prev => [...prev, legalSectionsMessage]);
          }, 300);
        }

        // 4. Show the detailed answer (includes case type classification)
        if (data.answer) {
          setTimeout(() => {
            const answerMessage: Message = {
              id: `${Date.now()}-answer`,
              role: 'bot',
              content: data.answer,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              type: 'answer'
            };
            setMessages(prev => [...prev, answerMessage]);
          }, 500);
        }

        // Mark that first input is done
        if (isFirstInput) {
          setIsFirstInput(false);
        }

        setIsConnected(true);
      } else {
        throw new Error(data.error || 'Server returned unsuccessful response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `${Date.now()}-error`,
        role: 'bot',
        content: error instanceof Error
          ? `⚠️ ${error.message}`
          : 'Sorry, I encountered an error while processing your request. Please check that the backend server is running and try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'text'
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsConnected(false);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    const allowedTypes = ['.pdf', '.docx', '.doc', '.txt'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExt)) {
      alert('Please upload a PDF, DOCX, DOC, or TXT file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', navigator.language?.startsWith('ta') ? 'ta' : 'en');

    setIsTyping(true);

    try {
      const response = await fetch('http://localhost:8000/api/upload/document', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      if (data.success) {
        // Show uploaded file info
        const fileMessage: Message = {
          id: `${Date.now()}-file`,
          role: 'user',
          content: `📄 Uploaded: ${data.filename}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'text'
        };
        setMessages(prev => [...prev, fileMessage]);

        // Show summary
        if (data.summary) {
          const summaryMessage: Message = {
            id: `${Date.now()}-summary`,
            role: 'bot',
            content: data.summary,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'summary'
          };
          setMessages(prev => [...prev, summaryMessage]);
        }

        // Keywords are logged in backend only, not displayed in frontend

        setIsFirstInput(false);
      } else {
        throw new Error(data.error || 'Document processing failed');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      const errorMessage: Message = {
        id: `${Date.now()}-error`,
        role: 'bot',
        content: error instanceof Error
          ? `⚠️ ${error.message}`
          : 'Sorry, I encountered an error processing your document.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'text'
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const renderMessageContent = (message: Message) => {
    switch (message.type) {
      case 'summary':
        return (
          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-lg">
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-xl">📋</span>
              <span className="font-bold text-blue-700 dark:text-blue-300">Summary</span>
            </div>
            <div className="text-foreground whitespace-pre-wrap">{message.content}</div>
          </div>
        );

      case 'keywords':
        // Use structured keywords if available, otherwise fallback to labeled keywords
        if (message.structuredKeywords && Object.keys(message.structuredKeywords).length > 0) {
          return (
            <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded-r-lg">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-xl">🔑</span>
                <span className="font-bold text-green-700 dark:text-green-300">Extracted Information (Key-Value Pairs)</span>
              </div>
              <div className="space-y-2 mt-2">
                {Object.entries(message.structuredKeywords).map(([key, value], idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start space-x-2 bg-primary/5 p-2 rounded-lg hover:bg-primary/10 transition-colors duration-200"
                  >
                    <span className="font-bold text-primary text-sm min-w-[180px]">{key}:</span>
                    <span className="text-foreground text-sm flex-1">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        
        // Fallback to labeled keywords
        try {
          const keywords: KeywordItem[] = JSON.parse(message.content);
          return (
            <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded-r-lg">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-xl">🔑</span>
                <span className="font-bold text-green-700 dark:text-green-300">Extracted Keywords</span>
              </div>
              {renderKeywords(keywords)}
            </div>
          );
        } catch {
          return <div className="text-foreground whitespace-pre-wrap">{message.content}</div>;
        }

      case 'legal_sections':
        return (
          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-lg">
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-xl">⚖️</span>
              <span className="font-bold text-blue-700 dark:text-blue-300">Relevant Legal Sections</span>
            </div>
            <div className="space-y-4">
              {message.legalSections?.map((section, idx) => (
                <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="font-bold text-lg text-blue-700 dark:text-blue-300 mb-2">
                    {section.section} - {section.title}
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    <span className="font-semibold">Act:</span> {section.act}
                  </div>
                  <div className="text-sm mb-3">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">Description:</span>
                    <p className="mt-1 text-foreground">{section.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">Punishment:</span>
                      <p className="mt-1 text-foreground">{section.punishment}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">Bailable:</span> {section.bailable}<br/>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">Cognizable:</span> {section.cognizable}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'answer':
        return (
          <div className="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 p-4 rounded-r-lg">
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-xl">💡</span>
              <span className="font-bold text-purple-700 dark:text-purple-300">Detailed Analysis</span>
            </div>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {message.content.split('\n').map((line, idx) => {
                // Handle bold headings (SUMMARY, SECTION 2, SECTION 3, etc.)
                if (line.match(/^\*\*(.*?)\*\*$/)) {
                  const heading = line.replace(/\*\*/g, '');
                  return (
                    <h3 key={idx} className="font-bold text-lg mt-6 mb-3 text-purple-700 dark:text-purple-300 border-b border-purple-200 dark:border-purple-800 pb-2">
                      {heading}
                    </h3>
                  );
                }
                // Handle Step 1:, Step 2: format
                if (line.match(/^Step\s+\d+:/i)) {
                  return (
                    <div key={idx} className="ml-4 mb-3 mt-2">
                      <strong className="text-purple-600 dark:text-purple-400">{line.match(/^Step\s+\d+:[^:]*/i)?.[0]}</strong>
                      {line.replace(/^Step\s+\d+:[^:]*:\s*/i, '') && (
                        <span className="ml-2">{line.replace(/^Step\s+\d+:[^:]*:\s*/i, '')}</span>
                      )}
                    </div>
                  );
                }
                // Handle Section [Number] [Act] – [Title] format
                if (line.match(/^Section\s+\d+/i) && line.includes('–')) {
                  return (
                    <div key={idx} className="ml-4 mb-2 mt-3">
                      <strong className="text-purple-600 dark:text-purple-400">{line}</strong>
                    </div>
                  );
                }
                // Handle "Reason:" lines
                if (line.trim().startsWith('Reason:')) {
                  return (
                    <div key={idx} className="ml-8 mb-3 italic text-gray-700 dark:text-gray-300">
                      {line}
                    </div>
                  );
                }
                // Handle bullet points
                if (line.trim().startsWith('•')) {
                  return (
                    <div key={idx} className="ml-4 mb-2 flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      <span>{line.trim().substring(1).trim()}</span>
                    </div>
                  );
                }
                // Handle numbered lists (1., 2., etc.)
                if (line.match(/^\d+\./)) {
                  return (
                    <div key={idx} className="ml-4 mb-2">
                      {line}
                    </div>
                  );
                }
                // Regular text
                return line.trim() ? (
                  <p key={idx} className="mb-2">{line}</p>
                ) : (
                  <br key={idx} />
                );
              })}
            </div>
          </div>
        );

      default:
        return <div className="whitespace-pre-wrap">{message.content}</div>;
    }
  };

  return (
    <div className="bg-background flex flex-col pt-16" style={{ height: '100vh', boxSizing: 'border-box' }}>
      <div className="w-full h-full flex flex-col px-4 py-4">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
          {/* Conversations Sidebar */}
          <div className="lg:col-span-1 bg-card rounded-xl shadow-lg p-4 animate-slide-in-left overflow-y-auto">
            <h2 className="text-lg font-bold mb-4 text-foreground">Recent Conversations</h2>
            <div className="space-y-2">
              {conversations.map((conv, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-muted/50 hover:bg-muted hover:shadow-md cursor-pointer transition-all duration-300 hover-lift animate-scale-in group"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="font-semibold text-sm text-foreground mb-1 group-hover:text-primary transition-colors duration-300">{conv.title}</div>
                  <div className="text-xs text-muted-foreground">{conv.time}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3 bg-card rounded-xl shadow-lg flex flex-col animate-slide-in-right h-full min-h-0">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 gradient-primary rounded-full flex items-center justify-center animate-scale-bounce shadow-lg hover:scale-110 transition-transform duration-300">
                  <FontAwesomeIcon icon={faRobot} className="text-white" />
                </div>
                <div>
                  <div className="font-bold text-foreground">Legal AI Assistant</div>
                  <div className={`text-sm flex items-center space-x-1 ${
                    isConnected === true 
                      ? 'text-success' 
                      : isConnected === false 
                      ? 'text-destructive' 
                      : 'text-muted-foreground'
                  }`}>
                    <FontAwesomeIcon 
                      icon={faCircle} 
                      className={`text-xs ${
                        isConnected === true ? 'animate-pulse-glow' : ''
                      }`} 
                    />
                    <span>
                      {isConnected === true 
                        ? 'Online' 
                        : isConnected === false 
                        ? 'Offline' 
                        : 'Connecting...'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-scale-in`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className={`flex items-start space-x-2 max-w-[85%] group`}>
                    {message.role === 'bot' && (
                      <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-md">
                        <FontAwesomeIcon icon={faRobot} className="text-white text-sm" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div
                        className={`rounded-lg transition-all duration-300 ${
                          message.role === 'user'
                            ? 'bg-primary text-white p-3 hover:shadow-glow'
                            : 'bg-transparent'
                        }`}
                      >
                        {message.role === 'user' ? (
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        ) : (
                          renderMessageContent(message)
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 ml-1">{message.timestamp}</div>
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-md">
                        <FontAwesomeIcon icon={faUser} className="text-white text-sm" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex items-start space-x-2 animate-slide-in-left">
                  <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center">
                    <FontAwesomeIcon icon={faRobot} className="text-white text-sm" />
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Questions */}
            {messages.length === 1 && (
              <div className="px-4 pb-2">
                <div className="text-sm text-muted-foreground mb-2">Suggested questions:</div>
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(question)}
                      className="px-3 py-1.5 bg-muted text-foreground rounded-full text-sm hover:bg-primary hover:text-white hover:scale-105 active:scale-95 transition-all duration-300 animate-scale-in shadow-sm hover:shadow-md"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center space-x-2">
                <label className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer">
                  <FontAwesomeIcon icon={faPaperclip} />
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg hover:scale-110 active:scale-95 transition-all duration-300">
                  <FontAwesomeIcon icon={faMicrophone} />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type your legal question here..."
                  className="flex-1 px-4 py-2 bg-muted border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:scale-[1.02] transition-all duration-300"
                />
                <button
                  onClick={handleSend}
                  className="p-3 bg-primary text-white rounded-lg hover:shadow-glow hover:scale-110 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
                  disabled={!input.trim()}
                >
                  <FontAwesomeIcon icon={faPaperPlane} className="hover:translate-x-1 transition-transform duration-300" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
