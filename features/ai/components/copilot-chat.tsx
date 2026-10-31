'use client';

import React, { useState } from 'react';
import { Bot, Send, Sparkles, AlertCircle, RefreshCw, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

interface CopilotChatProps {
  districtId: string;
  districtName: string;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citations?: Array<{ source: string; detail: string }>;
  timestamp: string;
}

const QUICK_PROMPTS = [
  '🌧️ 5-day rainfall forecast',
  '🌱 Planting & crop advice',
  '🛰️ Sentinel-2 NDVI analysis',
  '⚠️ Official Meteo advisory',
];

export function CopilotChat({ districtId, districtName }: CopilotChatProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am your grounded **Ijuru Climate Copilot** for **${districtName}**. Ask me about the 5-day weather forecast, Sentinel-2 NDVI vegetation health, CHIRPS rainfall baselines, or recent ground observations.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, areaId: districtId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');

      const botMsg: Message = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: data.reply,
        citations: data.citations,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `Unable to synthesize climate signals right now: ${err.message}. Please check your connection.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col transition-all">
      {/* Header bar */}
      <div
        className="px-4 py-3 bg-muted/40 border-b border-border flex items-center justify-between cursor-pointer hover:bg-muted/60"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-600 flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm leading-none">Ijuru Climate Copilot</h3>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                {districtName}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Grounded synthesis of Sentinel-2, CHIRPS & Meteo Rwanda
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label={isOpen ? "Collapse Copilot" : "Expand Copilot"}
          className="text-muted-foreground hover:text-foreground p-1"
        >
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="flex flex-col h-[420px]">
          {/* Quick Prompts Bar */}
          <div className="p-2 border-b border-border bg-muted/20 flex flex-wrap gap-1.5 text-xs">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => handleSend(p)}
                disabled={loading}
                className="bg-background hover:bg-muted text-foreground border border-border/80 px-2.5 py-1 rounded-full transition-colors text-[11px] flex items-center gap-1"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Messages scroll area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 ${
                    m.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-muted/70 text-foreground border border-border/60 rounded-bl-none'
                  }`}
                >
                  <div className="whitespace-pre-line leading-relaxed text-[13px]">{m.text}</div>

                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-border/50 text-[11px] text-muted-foreground space-y-1">
                      <div className="font-semibold text-[10px] tracking-wide uppercase text-muted-foreground/80 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Grounded Citations
                      </div>
                      {m.citations.map((c, idx) => (
                        <div key={idx} className="flex items-start gap-1">
                          <span className="font-medium text-foreground">{c.source}:</span>
                          <span className="text-muted-foreground">{c.detail}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground px-1 mt-1">{m.timestamp}</span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-xl w-fit">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                Synthesizing satellite & weather data...
              </div>
            )}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 border-t border-border bg-background flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask climate advice for ${districtName}...`}
              disabled={loading}
              className="flex-1 bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white p-2 rounded-lg transition-colors flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
