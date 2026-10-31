"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CloudRain,
  Leaf,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  Sprout,
  Trash2,
  Bot,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface CopilotChatProps {
  districtId: string;
  districtName: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  {
    label: "5-day rainfall & moisture",
    query: "What is the 5-day rainfall forecast and moisture outlook?",
    Icon: CloudRain,
  },
  {
    label: "Crop planting recommendations",
    query: "What are the recommended crops and soil conditions for planting right now?",
    Icon: Sprout,
  },
  {
    label: "Satellite NDVI canopy vigour",
    query: "Explain the current satellite NDVI reading and vegetative health.",
    Icon: Leaf,
  },
  {
    label: "30-year rainfall anomaly",
    query: "How does current rainfall compare to the 30-year ERA5 historical normal?",
    Icon: ShieldAlert,
  },
];

export function CopilotChat({ districtId, districtName }: CopilotChatProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Messages are kept strictly in memory for this session (temporary)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-welcome",
      sender: "assistant",
      text: `Hello! I am your Climate Intelligence Copilot for **${districtName} District**.\n\nI have access to live meteorological forecasts, 30-year historical rainfall baselines, satellite vegetation indices (NDVI), and verified local field checks. How can I assist your agricultural and climate planning today?`,
      timestamp: "Ready",
    },
  ]);

  // When district changes, add a clean divider message
  useEffect(() => {
    setMessages([
      {
        id: `switch-${districtId}-${Date.now()}`,
        sender: "assistant",
        text: `Switched context to **${districtName} District**. I am ready to analyze weather, soil moisture, and satellite canopy data for ${districtName}.`,
        timestamp: "Ready",
      },
    ]);
  }, [districtId, districtName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleClear = () => {
    setMessages([
      {
        id: `clear-${Date.now()}`,
        sender: "assistant",
        text: `Conversation cleared. Ask any question regarding **${districtName} District** climate signals.`,
        timestamp: "Ready",
      },
    ]);
  };

  const handleSend = async (queryText?: string) => {
    const message = (queryText || input).trim();
    if (!message || loading) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: message,
      timestamp: timeStr,
    };

    const assistantId = `a-${Date.now()}`;
    const initialAssistantMessage: ChatMessage = {
      id: assistantId,
      sender: "assistant",
      text: "",
      timestamp: timeStr,
    };

    const previousHistory = messages.filter((m) => m.id !== "initial-welcome");

    setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          areaId: districtId,
          history: previousHistory.map((m) => ({
            role: m.sender,
            text: m.text,
          })),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Server returned ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body received from server");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId ? { ...msg, text: accumulatedText } : msg
          )
        );
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                text: `Could not synthesize response: ${err.message}. Please verify the connection and try again.`,
              }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#d5dfda] bg-white overflow-hidden flex flex-col shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 bg-[#f8f9f5] border-b border-[#d5dfda] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-[#195c70] text-[#e3ed8c] flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="size-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-[#132e36]">
                Climate Evidence Assistant
              </h2>
              <Badge variant="signal">{districtName}</Badge>
            </div>
            <p className="text-xs text-[#4a6365]">
              Real-time reasoning across Open-Meteo, ERA5 baseline, NASA MODIS NDVI, and local checks
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          title="Clear temporary conversation history"
          className="text-xs gap-1.5 text-[#4a6365] hover:text-[#132e36]"
        >
          <Trash2 className="size-3.5" />
          <span className="hidden sm:inline">Clear Chat</span>
        </Button>
      </div>

      {/* Suggested Quick Prompt Pills */}
      <div className="px-4 py-2.5 border-b border-[#e2ece7] bg-[#fcfdfc] flex flex-wrap gap-2">
        {QUICK_PROMPTS.map(({ label, query, Icon }) => (
          <button
            key={label}
            type="button"
            onClick={() => handleSend(query)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#cad7d1] bg-white hover:bg-[#edf3f0] px-3 py-1 text-xs font-semibold text-[#132e36] transition-colors cursor-pointer disabled:opacity-50"
          >
            <Icon className="size-3 text-[#195c70]" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Chat Messages Stream Area */}
      <div className="overflow-y-auto p-5 space-y-4 h-[480px] bg-[#f9faf8]">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 ${
              m.sender === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <div
              className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                m.sender === "user"
                  ? "bg-[#195c70] text-white"
                  : "bg-[#132e36] text-[#e3ed8c]"
              }`}
            >
              {m.sender === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.sender === "user"
                  ? "bg-[#195c70] text-white rounded-tr-xs"
                  : "bg-white text-[#132e36] border border-[#d5dfda] shadow-xs rounded-tl-xs"
              }`}
            >
              {m.text ? (
                <div className="prose prose-sm max-w-none leading-relaxed text-inherit prose-headings:font-bold prose-headings:text-inherit prose-h3:text-base prose-h4:text-sm prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {m.text}
                  </ReactMarkdown>
                </div>
              ) : (
                <span className="inline-flex items-center gap-2 text-xs text-[#4a6365] animate-pulse">
                  <RefreshCw className="size-3.5 animate-spin text-[#195c70]" />
                  Synthesizing climate evidence...
                </span>
              )}
              <div
                className={`text-[10px] mt-2 pt-1 border-t text-right tabular-nums ${
                  m.sender === "user"
                    ? "border-white/20 text-white/70"
                    : "border-[#e5ece8] text-[#4a6365]"
                }`}
              >
                {m.timestamp}
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3.5 border-t border-[#d5dfda] bg-white flex items-center gap-2.5"
      >
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask any climate question for ${districtName} (e.g. planting time, rainfall anomaly, soil moisture)...`}
          disabled={loading}
          className="flex-1 bg-[#fcfdfa] text-sm"
        />
        <Button type="submit" disabled={loading || !input.trim()} className="font-semibold px-4">
          {loading ? (
            <RefreshCw className="size-4 animate-spin mr-1.5" />
          ) : (
            <Send className="size-4 mr-1.5" />
          )}
          <span>Send</span>
        </Button>
      </form>
    </div>
  );
}
