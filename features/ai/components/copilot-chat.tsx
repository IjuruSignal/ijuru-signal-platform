"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  CloudRain,
  KeyRound,
  Leaf,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  Sprout,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface CopilotChatProps {
  districtId: string;
  districtName: string;
  fullHeight?: boolean;
}

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  mode?: "live_llm" | "grounded_synthesis";
  model?: string;
  citations?: Array<{ source: string; detail: string }>;
  timestamp: string;
}

const QUICK_PROMPTS = [
  {
    label: "5-day rainfall & moisture outlook",
    query: "What is the 5-day rainfall forecast and seasonal moisture balance?",
    Icon: CloudRain,
  },
  {
    label: "Field & crop moisture context",
    query: "Summarize soil moisture, rainfall anomaly, and ground field checks for crop planning.",
    Icon: Sprout,
  },
  {
    label: "Satellite NDVI canopy analysis",
    query: "Explain the current satellite NDVI reading, trend, and coverage quality.",
    Icon: Leaf,
  },
  {
    label: "Official warning & verification check",
    query: "What is the current verification status and where do I check official warnings?",
    Icon: ShieldAlert,
  },
];

export function CopilotChat({
  districtId,
  districtName,
  fullHeight = false,
}: CopilotChatProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiKeyOverride, setApiKeyOverride] = useState("");
  const [modelOverride, setModelOverride] = useState("openrouter/free");
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: `Grounded Climate Evidence Assistant active for ${districtName}. Ask about the 5-day precipitation forecast, 30-year ERA5 rainfall anomaly, satellite NDVI canopy vigour, or verified ground field checks.`,
      timestamp: "Ready",
    },
  ]);

  useEffect(() => {
    const savedKey =
      typeof window !== "undefined"
        ? window.localStorage.getItem("ijuru_openrouter_key") || ""
        : "";
    const savedModel =
      typeof window !== "undefined"
        ? window.localStorage.getItem("ijuru_openrouter_model") ||
          "openrouter/free"
        : "openrouter/free";
    if (savedKey) setApiKeyOverride(savedKey);
    if (savedModel) setModelOverride(savedModel);
  }, []);

  const saveRuntimeKey = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("ijuru_openrouter_key", apiKeyOverride.trim());
      window.localStorage.setItem("ijuru_openrouter_model", modelOverride.trim());
    }
    setKeyDialogOpen(false);
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const nowLabel = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: nowLabel,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          areaId: districtId,
          apiKeyOverride: apiKeyOverride.trim() || undefined,
          modelOverride: modelOverride.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      const botMsg: Message = {
        id: `a-${Date.now()}`,
        sender: "assistant",
        text: data.reply,
        mode: data.mode,
        model: data.model,
        citations: data.citations,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "assistant",
          text: `Unable to synthesize climate signals: ${err.message}. Verify your connection and try again.`,
          timestamp: nowLabel,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#d5dfda] bg-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 bg-[#f8f9f5] border-b border-[#d5dfda] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-[#195c70] text-[#e3ed8c] flex items-center justify-center shrink-0">
            <Sparkles className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base text-[#132e36]">
                Ijuru Climate Evidence Assistant
              </h3>
              <Badge variant="signal">{districtName}</Badge>
            </div>
            <p className="text-xs text-[#4a6365] mt-0.5">
              Answers strictly grounded in Open-Meteo, ERA5, satellite NDVI, and local field checks
            </p>
          </div>
        </div>

        <Dialog open={keyDialogOpen} onOpenChange={setKeyDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <KeyRound className="size-3.5" />
              <span>
                {apiKeyOverride ? "OpenRouter Key Active" : "OpenRouter API Key"}
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configure OpenRouter / OpenAI-Compatible Key</DialogTitle>
              <DialogDescription>
                Set `OPENROUTER_API_KEY` or `AI_API_KEY` in `.env.local` on the server, or paste your OpenRouter key below for instant browser-session LLM synthesis. Without a key, the assistant runs in deterministic grounded synthesis mode.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="or-key">OpenRouter API Key (`sk-or-v1-...`)</Label>
                <Input
                  id="or-key"
                  type="password"
                  value={apiKeyOverride}
                  onChange={(e) => setApiKeyOverride(e.target.value)}
                  placeholder="sk-or-v1-..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="or-model">Model Identifier</Label>
                <Input
                  id="or-model"
                  type="text"
                  value={modelOverride}
                  onChange={(e) => setModelOverride(e.target.value)}
                  placeholder="openrouter/free or meta-llama/llama-3.3-70b-instruct:free"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setApiKeyOverride("");
                  if (typeof window !== "undefined") {
                    window.localStorage.removeItem("ijuru_openrouter_key");
                  }
                  setKeyDialogOpen(false);
                }}
              >
                Use Grounded Default
              </Button>
              <Button onClick={saveRuntimeKey}>Save Key</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Prompt Pills */}
      <div className="px-4 py-2.5 border-b border-[#d5dfda] bg-[#f3f4ee]/60 flex flex-wrap gap-2">
        {QUICK_PROMPTS.map(({ label, query, Icon }) => (
          <button
            key={label}
            type="button"
            onClick={() => handleSend(query)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#c5d3cd] bg-white hover:bg-[#e7ede9] px-3 py-1.5 text-xs font-semibold text-[#132e36] transition-colors cursor-pointer disabled:opacity-50"
          >
            <Icon className="size-3.5 text-[#195c70]" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Messages Area */}
      <div
        className={`overflow-y-auto p-5 space-y-4 ${
          fullHeight ? "h-[520px]" : "h-[380px]"
        }`}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${
              m.sender === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm ${
                m.sender === "user"
                  ? "bg-[#195c70] text-white rounded-br-xs"
                  : "bg-[#f3f4ee] text-[#132e36] border border-[#d5dfda] rounded-bl-xs"
              }`}
            >
              <div className="whitespace-pre-line leading-relaxed">{m.text}</div>

              {m.citations && m.citations.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-[#c9d6d0] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#132e36] inline-flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 text-[#195c70]" />
                      Verified Evidence Sources Cited
                    </span>
                    <span className="text-[11px] text-[#4a6365]">
                      {m.mode === "live_llm"
                        ? `OpenRouter (${m.model})`
                        : "Deterministic Evidence Engine"}
                    </span>
                  </div>
                  <div className="grid gap-1">
                    {m.citations.map((c, idx) => (
                      <div key={idx} className="text-[11px] text-[#4a6365] tabular-nums">
                        <strong className="text-[#132e36]">{c.source}:</strong>{" "}
                        {c.detail}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <span className="text-[11px] text-[#4a6365] px-1 mt-1 tabular-nums">
              {m.timestamp}
            </span>
          </div>
        ))}

        {loading && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-[#d5dfda] bg-[#f3f4ee] px-3.5 py-2.5 text-xs font-medium text-[#4a6365]">
            <RefreshCw className="size-3.5 animate-spin text-[#195c70]" />
            <span>Synthesizing district forecast, baseline, and ground notes...</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3.5 border-t border-[#d5dfda] bg-white flex items-center gap-2.5"
      >
        <Label htmlFor="copilot-query-input" className="sr-only">
          Ask a climate evidence question for {districtName}
        </Label>
        <Input
          id="copilot-query-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about rainfall, NDVI, soil moisture, or field checks in ${districtName}...`}
          disabled={loading}
          className="flex-1"
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          <Send className="size-4" />
          <span>Ask</span>
        </Button>
      </form>
    </div>
  );
}
