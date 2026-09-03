import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { getEmergencyGuidance } from '../services/aiService';
import { MessageSquare, Send, Bot, User, Loader2, Info, Mic, Globe, AlertTriangle } from 'lucide-react';

export default function AIAssistant() {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: t('assistant.welcome'),
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [category, setCategory] = useState('other');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input.trim(), timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await getEmergencyGuidance(category, currentInput, history, t);
      const assistantMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: t('assistant.errorMsg'),
        timestamp: new Date().toISOString(),
      }]);
    }

    setIsLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    t('assistant.quick1'),
    t('assistant.quick2'),
    t('assistant.quick3'),
    t('assistant.quick4'),
  ];

  return (
    <div className="max-w-3xl mx-auto flex flex-col animate-fade-in" style={{ height: 'calc(100vh - 140px)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-sentinel-500/10 flex items-center justify-center">
          <Bot className="w-5 h-5 text-sentinel-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>{t('assistant.title')}</h1>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t('assistant.subtitle')}</p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="p-3 rounded-lg mb-4 flex items-start gap-2 text-xs" style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}>
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-sentinel-500" />
        <div>
          <p>{t('assistant.disclaimer')}</p>
          <p className="mt-1 flex items-center gap-1">
            <Globe className="w-3 h-3" />
            {t('assistant.languageNote')}
          </p>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 px-1">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'assistant' ? 'bg-sentinel-100 dark:bg-sentinel-900/30' : 'bg-gray-200 dark:bg-gray-700'
            }`}>
              {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-sentinel-600" /> : <User className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'assistant'
                ? 'rounded-tl-sm'
                : 'bg-sentinel-500 text-white rounded-tr-sm'
            }`}
              style={msg.role === 'assistant' ? { background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text)' } : {}}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.role === 'assistant' && (
                <span className="inline-flex items-center gap-1 mt-2 text-[10px] opacity-60">
                  <Bot className="w-3 h-3" /> {t('common.aiGenerated')}
                </span>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-sentinel-100 dark:bg-sentinel-900/30 flex items-center justify-center">
              <Bot className="w-4 h-4 text-sentinel-600" />
            </div>
            <div className="rounded-2xl rounded-tl-sm px-4 py-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('assistant.thinking')}
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Prompts */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {quickPrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => { setInput(prompt); }}
              className="px-3 py-1.5 rounded-full text-xs font-medium hover:opacity-80 transition-opacity"
              style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <textarea
            className="input-field pr-12 resize-none"
            rows={1}
            placeholder={t('assistant.placeholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="btn-primary px-4 flex items-center justify-center"
          style={{ minWidth: '48px' }}
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
