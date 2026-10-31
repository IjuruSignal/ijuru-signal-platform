"use client";

import React, { useState, useEffect } from "react";
import {
  Phone,
  PhoneOff,
  Delete,
  RotateCcw,
  Signal,
  Battery,
  WifiOff,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function UssdPhoneSimulator() {
  const [sessionInput, setSessionInput] = useState<string>("");
  const [currentScreenText, setCurrentScreenText] = useState<string>(
    "Ijuru Signal USSD Simulator\nPress [CALL] or dial *384*96# to start."
  );
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [historySteps, setHistorySteps] = useState<string[]>([]);
  const [lastCharCount, setLastCharCount] = useState<number>(0);
  const [isEndSession, setIsEndSession] = useState<boolean>(false);

  // Call the live USSD API endpoint
  const sendUssdText = async (text: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ussd?text=${encodeURIComponent(text)}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const rawText = await res.text();
      setCurrentScreenText(rawText);
      setLastCharCount(rawText.length);
      setIsSessionActive(true);
      setIsEndSession(rawText.startsWith("END "));
    } catch (err: any) {
      setCurrentScreenText(
        `END Connection Error:\nFailed to reach /api/ussd\n${err?.message || "Check network"}`
      );
      setIsEndSession(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartCall = () => {
    setHistorySteps([]);
    setSessionInput("");
    sendUssdText("");
  };

  const handleKeypadPress = (val: string) => {
    if (!isSessionActive || isEndSession) {
      // Just typing the dial code
      setSessionInput((prev) => (prev.length < 15 ? prev + val : prev));
      return;
    }

    // In active CON session: pressing a digit submits this step
    const nextSteps = [...historySteps, val];
    const newTextParam = nextSteps.join("*");
    setHistorySteps(nextSteps);
    setSessionInput("");
    sendUssdText(newTextParam);
  };

  const handleManualSend = () => {
    if (sessionInput === "*384*96#" || sessionInput === "*384#" || !isSessionActive) {
      handleStartCall();
      return;
    }

    if (sessionInput.trim()) {
      handleKeypadPress(sessionInput.trim());
    }
  };

  const handleEndCall = () => {
    setIsSessionActive(false);
    setIsEndSession(false);
    setHistorySteps([]);
    setSessionInput("");
    setCurrentScreenText("Session Closed.\nDial *384*96# to test again.");
    setLastCharCount(0);
  };

  const handleQuickPreset = (steps: string[]) => {
    setHistorySteps(steps);
    setSessionInput("");
    sendUssdText(steps.join("*"));
  };

  return (
    <div className="grid lg:grid-cols-[340px_minmax(0,1fr)] gap-8 items-start">
      {/* 2G Feature Phone Hardware Shell */}
      <div className="relative mx-auto w-full max-w-[340px] bg-gradient-to-b from-[#1c2c30] to-[#0f1b1e] p-5 rounded-[40px] shadow-2xl border-4 border-[#2b444b] text-[#f3f4ee]">
        {/* Top Earpiece Speaker */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-1.5 bg-[#0b1315] rounded-full border border-[#2b444b]/50" />
        </div>

        {/* Retro Monochrome / Phosphor LCD Screen */}
        <div className="relative bg-[#0d211a] border-2 border-[#1f4a3b] rounded-2xl p-3.5 shadow-inner mb-4 overflow-hidden min-h-[220px] flex flex-col justify-between">
          {/* LCD Screen Glow Overlay */}
          <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />

          {/* Top Status Bar */}
          <div className="flex items-center justify-between text-[11px] font-mono text-[#5eead4] border-b border-[#1f4a3b]/60 pb-1.5 mb-2">
            <span className="flex items-center gap-1 font-semibold">
              <Signal className="size-3 text-[#2ec4b6]" /> MTN-RW
            </span>
            <span className="flex items-center gap-1">
              <WifiOff className="size-2.5 text-[#5eead4]/60" /> 2G GSM
            </span>
            <span className="flex items-center gap-1">
              <Battery className="size-3 text-[#2ec4b6]" /> 100%
            </span>
          </div>

          {/* Screen Content Display */}
          <div className="font-mono text-[12px] leading-[1.38] text-[#99f6e4] whitespace-pre-line flex-1 overflow-y-auto select-none py-1">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8 gap-2">
                <span className="animate-pulse text-[#2ec4b6] text-sm font-bold">
                  Requesting Telco Gateway...
                </span>
                <span className="text-[10px] text-[#5eead4]/70">
                  Sub-150ms HTTP webhook roundtrip
                </span>
              </div>
            ) : (
              currentScreenText
            )}
          </div>

          {/* Bottom Screen Bar: Character Count & Active Indicator */}
          <div className="border-t border-[#1f4a3b]/60 pt-1.5 mt-2 flex items-center justify-between text-[10px] font-mono text-[#5eead4]/80">
            <span className="flex items-center gap-1">
              {isEndSession ? (
                <span className="text-[#e5a93b] font-bold">END DIALOGUE</span>
              ) : isSessionActive ? (
                <span className="text-[#2ec4b6] font-bold animate-pulse">● CON ACTIVE</span>
              ) : (
                <span>IDLE</span>
              )}
            </span>
            <span>
              {lastCharCount > 0 ? `${lastCharCount}/160 chars` : "GSM 1-Screen"}
            </span>
          </div>
        </div>

        {/* Input buffer if user is typing manually */}
        <div className="mb-3 px-2 flex items-center justify-between bg-[#142327] rounded-lg border border-[#2b444b] py-1 text-xs font-mono">
          <span className="text-gray-400">Reply:</span>
          <span className="text-[#e5a93b] font-bold tracking-wider">
            {sessionInput || (isSessionActive && !isEndSession ? "Tap choice..." : "*384*96#")}
          </span>
          <button
            onClick={() => setSessionInput((p) => p.slice(0, -1))}
            className="text-gray-400 hover:text-white p-0.5"
            title="Backspace"
          >
            <Delete className="size-3.5" />
          </button>
        </div>

        {/* Call Controls: Green Call & Red End */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={isSessionActive && !isEndSession ? handleManualSend : handleStartCall}
            className="flex items-center justify-center gap-1.5 bg-[#1b7a63] hover:bg-[#209277] active:scale-95 transition-all text-white font-bold py-2.5 rounded-xl text-xs shadow-md border border-[#2ec4b6]/50"
          >
            <Phone className="size-3.5" />
            {isSessionActive && !isEndSession ? "SEND" : "DIAL (*384#)"}
          </button>
          <button
            onClick={handleEndCall}
            className="flex items-center justify-center gap-1.5 bg-[#992a2a] hover:bg-[#b83333] active:scale-95 transition-all text-white font-bold py-2.5 rounded-xl text-xs shadow-md border border-[#eb5757]/50"
          >
            <PhoneOff className="size-3.5" />
            END / RESET
          </button>
        </div>

        {/* Numeric Keypad Matrix (3x4) */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: "1", sub: "" },
            { key: "2", sub: "abc" },
            { key: "3", sub: "def" },
            { key: "4", sub: "ghi" },
            { key: "5", sub: "jkl" },
            { key: "6", sub: "mno" },
            { key: "7", sub: "pqrs" },
            { key: "8", sub: "tuv" },
            { key: "9", sub: "wxyz" },
            { key: "*", sub: "" },
            { key: "0", sub: "+" },
            { key: "#", sub: "" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => handleKeypadPress(item.key)}
              className="bg-[#1b2a2e] hover:bg-[#24373d] active:bg-[#2b444b] active:scale-95 transition-all py-2.5 rounded-xl border border-[#2b444b] flex flex-col items-center justify-center text-white shadow-sm"
            >
              <span className="font-bold text-sm leading-tight">{item.key}</span>
              {item.sub && (
                <span className="text-[9px] uppercase tracking-widest text-gray-400 leading-none">
                  {item.sub}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Simulator Explanations & Quick-Presets Panel */}
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-[#e5a93b]/20 text-[#e5a93b] border-[#e5a93b]/40 font-bold px-2.5 py-0.5">
              Live Interactive Telco Gateway
            </Badge>
            <Badge className="bg-emerald-500/10 text-[#2ec4b6] border-emerald-500/30 font-semibold px-2.5 py-0.5">
              Sub-150ms Response
            </Badge>
          </div>
          <h3 className="text-2xl font-extrabold text-[#132e36] tracking-tight">
            Try the Africa&apos;s Talking USSD Gateway Live
          </h3>
          <p className="text-sm text-[#3d5a63] mt-1.5 leading-relaxed">
            This simulator communicates directly with our live production webhook at{" "}
            <code className="bg-[#e2e8e6] px-1.5 py-0.5 rounded font-mono text-xs text-[#132e36] font-semibold">
              /api/ussd
            </code>
            . Experience exactly how a smallholder farmer with a basic $15 Nokia phone accesses district rainfall, 30-year anomalies, and soil moisture anywhere in Rwanda.
          </p>
        </div>

        {/* 1-Click Interactive Presets */}
        <div className="bg-white p-5 rounded-2xl border border-[#d6dedb] shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-[#132e36] mb-3 flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-[#e5a93b]" />
            1-Click Scenario Quick-Dials
          </div>
          <div className="grid sm:grid-cols-2 gap-2.5">
            <button
              onClick={() => handleQuickPreset(["2", "1", "1"])}
              className="text-left p-3 rounded-xl border border-[#e2e8e6] hover:border-[#2ec4b6] hover:bg-[#f0fdf4] transition-all group"
            >
              <div className="font-bold text-xs text-[#132e36] group-hover:text-[#1b7a63] flex items-center justify-between">
                <span>Musanze Rain Outlook</span>
                <span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">2*1*1</span>
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                North Province &rarr; Musanze &rarr; Today &amp; Tomorrow Rain %
              </div>
            </button>

            <button
              onClick={() => handleQuickPreset(["2", "1", "2"])}
              className="text-left p-3 rounded-xl border border-[#e2e8e6] hover:border-[#2ec4b6] hover:bg-[#f0fdf4] transition-all group"
            >
              <div className="font-bold text-xs text-[#132e36] group-hover:text-[#1b7a63] flex items-center justify-between">
                <span>Musanze 5-Day Rainfall</span>
                <span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">2*1*2</span>
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                Cumulative mm vs 30-Year CHIRPS Baseline Anomaly
              </div>
            </button>

            <button
              onClick={() => handleQuickPreset(["3", "2", "3"])}
              className="text-left p-3 rounded-xl border border-[#e2e8e6] hover:border-[#2ec4b6] hover:bg-[#f0fdf4] transition-all group"
            >
              <div className="font-bold text-xs text-[#132e36] group-hover:text-[#1b7a63] flex items-center justify-between">
                <span>Muhanga Soil &amp; Crops</span>
                <span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">3*2*3</span>
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                Southern Province &rarr; Topsoil % &amp; Staple Crop Canopy
              </div>
            </button>

            <button
              onClick={() => handleQuickPreset(["1", "1", "4"])}
              className="text-left p-3 rounded-xl border border-[#e2e8e6] hover:border-[#2ec4b6] hover:bg-[#f0fdf4] transition-all group"
            >
              <div className="font-bold text-xs text-[#132e36] group-hover:text-[#1b7a63] flex items-center justify-between">
                <span>Gasabo Quick Overview</span>
                <span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">1*1*4</span>
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                Kigali &rarr; Elevation, temp, 5-day mm &amp; soil overview
              </div>
            </button>
          </div>
        </div>

        {/* Technical Telco Specifications */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-[#132e36] text-white p-4 rounded-xl border border-[#1f4651]">
            <div className="text-[11px] font-bold text-[#e5a93b] uppercase tracking-wider mb-1">
              GSM Screen Budget
            </div>
            <div className="text-xl font-extrabold text-white">≤ 160 Chars</div>
            <p className="text-xs text-[#aac3ca] mt-1">
              Every screen is engineered to prevent telco pagination fees and text fragmentation on 2G screens.
            </p>
          </div>

          <div className="bg-[#132e36] text-white p-4 rounded-xl border border-[#1f4651]">
            <div className="text-[11px] font-bold text-[#2ec4b6] uppercase tracking-wider mb-1">
              Bilingual Prompts
            </div>
            <div className="text-xl font-extrabold text-white">Ikinyarwanda / EN</div>
            <p className="text-xs text-[#aac3ca] mt-1">
              Dual Kinyarwanda/English prompts (Hitamo Intara, Ubuhehere) ensure effortless smallholder adoption.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
