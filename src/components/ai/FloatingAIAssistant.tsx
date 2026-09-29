/**
 * Legacy Logic Pro — Floating AI Financial Assistant
 * Section 5.13: Floating chat panel available on report pages, gated by session opt-in from 5.4.
 * Uses gemini-3.1-pro-preview with thinkingLevel: ThinkingLevel.HIGH server-side.
 */

import React, { useState } from 'react';
import { Sparkles, MessageSquare, X, Send, AlertCircle, Bot, CheckCircle2, ShieldAlert } from 'lucide-react';
import { api } from '../../lib/api-client';

interface FloatingAIAssistantProps {
  enableAI: boolean;
  sessionData: any;
  workspaceId: string;
}

interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
  advisory?: string;
  timestamp: string;
}

export const FloatingAIAssistant: React.FC<FloatingAIAssistantProps> = ({
  enableAI,
  sessionData,
  workspaceId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'assistant',
      text: 'Namaste! I am your CA Financial Assistant. I can analyze the currently extracted session data, identify anomaly patterns, verify GST ITC eligibility, and review Trial Balance imbalances.',
      advisory: 'Advisory only. All computations are working papers and must be verified against primary vouchers before statutory sign-off.',
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  if (!enableAI) {
    // Section 5.4: When OFF, the floating AI chat assistant must be visibly disabled/hidden, guaranteeing zero AI API calls
    return null;
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userText = query.trim();
    setQuery('');
    const newMsg: ChatMessage = {
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setLoading(true);

    try {
      const res = await api.queryAI({
        query: userText,
        sessionData,
        enableAI,
        workspaceId,
      });

      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: res.answer,
          advisory: res.advisory,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `Unable to complete AI query: ${err.message || 'API request failed'}. Please verify backend connection.`,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-amber-400 px-4 py-2.5 rounded-full shadow-lg border border-amber-500/30 transition-all transform hover:scale-105"
        >
          <Sparkles size={18} className="text-amber-400 animate-pulse" />
          <span className="text-xs font-semibold text-white tracking-wide">CA Assistant (High Thinking)</span>
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="w-96 sm:w-[420px] h-[520px] bg-white rounded-xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="bg-slate-900 text-white p-3.5 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-500/30">
                AI
              </div>
              <div>
                <div className="text-xs font-semibold flex items-center gap-1.5 text-white">
                  <span>CA Copilot</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 font-mono">
                    Gemini 3.1 Pro · High Thinking
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">Stateless Session Financial Reasoning</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-slate-800 border border-slate-200 shadow-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.advisory && (
                    <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-500 italic flex items-start gap-1">
                      <ShieldAlert size={12} className="shrink-0 text-amber-600 mt-0.5" />
                      <span>{m.advisory}</span>
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-slate-200 text-slate-600 text-xs">
                <Sparkles size={14} className="text-amber-500 animate-spin" />
                <span className="italic font-medium text-slate-600">
                  Synthesizing financial session & formulating reasoned audit response...
                </span>
              </div>
            )}
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-1.5 bg-slate-100 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px] text-slate-600">
            <span className="text-slate-400 shrink-0">Ask:</span>
            <button
              onClick={() => setQuery("What is our net GST liability and any ITC ineligibility?")}
              className="bg-white hover:bg-slate-200 px-2 py-0.5 rounded border border-slate-200 shrink-0 text-slate-700"
            >
              GST Liability?
            </button>
            <button
              onClick={() => setQuery("Which ledger accounts have the highest anomaly count?")}
              className="bg-white hover:bg-slate-200 px-2 py-0.5 rounded border border-slate-200 shrink-0 text-slate-700"
            >
              Top Anomalies?
            </button>
            <button
              onClick={() => setQuery("Is the Trial Balance balanced and what are the largest debtors?")}
              className="bg-white hover:bg-slate-200 px-2 py-0.5 rounded border border-slate-200 shrink-0 text-slate-700"
            >
              TB Imbalance?
            </button>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-2.5 bg-white border-t border-slate-200 flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about GST, TDS, anomalies, or Trial Balance..."
              className="flex-1 bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-3 py-1.5 rounded flex items-center justify-center transition-colors"
            >
              <Send size={14} className="text-amber-400" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
