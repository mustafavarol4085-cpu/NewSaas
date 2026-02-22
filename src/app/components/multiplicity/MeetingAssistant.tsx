
import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import {
  Mic,
  MicOff,
  Send,
  MessageSquare,
  Sparkles,
  Brain,
  Clock,
  User,
  Users,
  FileText,
  Zap,
} from "lucide-react";
import {
  streamMeetingCoaching,
  generateMeetingSummary,
  detectSpeaker,
  type MeetingMessage,
} from "../../../services/openaiService";
import { endLiveCallSession } from "../../../services/liveCallService";
import { searchKBBySimilarity } from "../../../services/kbService";

// Web Speech API types
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface MeetingAssistantProps {
  sessionId: string;
  customerName: string;
  callType: string;
  company?: string;
  onClose: () => void;
}

interface CoachingCard {
  id: string;
  content: string;
  timestamp: string;
  isStreaming: boolean;
}

export function MeetingAssistant({
  sessionId,
  customerName,
  callType,
  company,
  onClose,
}: MeetingAssistantProps) {
  // Conversation state
  const [messages, setMessages] = useState<MeetingMessage[]>([]);
  const [inputText, setInputText] = useState("");

  // Microphone state
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [micSupported, setMicSupported] = useState(true);
  const [micError, setMicError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesRef = useRef<MeetingMessage[]>([]);

  // AI coaching state
  const [coachingCards, setCoachingCards] = useState<CoachingCard[]>([]);
  const [isCoaching, setIsCoaching] = useState(false);
  const [autoCoach, setAutoCoach] = useState(true);
  const [isDetectingSpeaker, setIsDetectingSpeaker] = useState(false);

  // Session state
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Stats
  const [messageCount, setMessageCount] = useState({ rep: 0, customer: 0 });

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const coachingEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCoachingRef = useRef(false);
  const autoCoachRef = useRef(true);

  // Keep refs in sync
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { isCoachingRef.current = isCoaching; }, [isCoaching]);
  useEffect(() => { autoCoachRef.current = autoCoach; }, [autoCoach]);

  // Check speech recognition support
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setMicSupported(false);
    }
  }, []);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, interimText]);

  useEffect(() => {
    coachingEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [coachingCards]);

  const formatElapsed = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getTimestamp = () =>
    new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  // ─── AI Coaching (streaming) ───────────────────────────
  const triggerCoaching = useCallback(
    async (allMessages: MeetingMessage[]) => {
      if (isCoachingRef.current || allMessages.length === 0) return;

      isCoachingRef.current = true;
      setIsCoaching(true);
      const cardId = `coach-${Date.now()}`;
      const newCard: CoachingCard = {
        id: cardId,
        content: "",
        timestamp: getTimestamp(),
        isStreaming: true,
      };
      setCoachingCards((prev) => [...prev, newCard]);

      try {
        // KB context (optional)
        let kbContext = "";
        const lastMsg = allMessages[allMessages.length - 1];
        try {
          const kbResults = await searchKBBySimilarity(lastMsg.text, 0.4, 2);
          if (kbResults.length > 0) {
            kbContext = kbResults.map((r: any) => r.chunk_text).join("\n---\n");
          }
        } catch { /* optional */ }

        let fullContent = "";
        for await (const chunk of streamMeetingCoaching({
          conversationHistory: allMessages,
          customerName,
          callType,
          kbContext: kbContext || undefined,
        })) {
          fullContent += chunk;
          setCoachingCards((prev) =>
            prev.map((c) => (c.id === cardId ? { ...c, content: fullContent } : c))
          );
        }

        setCoachingCards((prev) =>
          prev.map((c) => (c.id === cardId ? { ...c, isStreaming: false } : c))
        );
      } catch (error) {
        console.error("Coaching error:", error);
        setCoachingCards((prev) =>
          prev.map((c) =>
            c.id === cardId
              ? { ...c, content: "⚠️ Could not generate coaching tip.", isStreaming: false }
              : c
          )
        );
      } finally {
        isCoachingRef.current = false;
        setIsCoaching(false);
      }
    },
    [customerName, callType]
  );

  // ─── Add message with AI speaker detection ─────────────
  const addMessageWithSpeakerDetection = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      setIsDetectingSpeaker(true);

      // AI detects speaker
      let speaker: "rep" | "customer" = "rep";
      try {
        speaker = await detectSpeaker({
          newUtterance: text,
          conversationHistory: messagesRef.current,
          customerName,
          callType,
        });
      } catch {
        // fallback to rep
      }

      const newMessage: MeetingMessage = {
        id: `msg-${Date.now()}`,
        speaker,
        text: text.trim(),
        timestamp: getTimestamp(),
      };

      const updatedMessages = [...messagesRef.current, newMessage];
      setMessages(updatedMessages);
      setMessageCount((prev) => ({
        ...prev,
        [speaker]: prev[speaker] + 1,
      }));

      setIsDetectingSpeaker(false);

      // Auto AI coaching
      if (autoCoachRef.current) {
        triggerCoaching(updatedMessages);
      }
    },
    [customerName, callType, triggerCoaching]
  );

  // ─── Speech Recognition (Microphone) ──────────────────
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setMicError("Browser does not support speech recognition. Use Chrome.");
      return;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setMicError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const finalText = result[0].transcript.trim();
          if (finalText.length > 2) {
            addMessageWithSpeakerDetection(finalText);
          }
          setInterimText("");
        } else {
          interim += result[0].transcript;
        }
      }
      if (interim) {
        setInterimText(interim);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        setMicError("Microphone permission denied. Allow access in browser settings.");
      } else if (event.error === "no-speech") {
        // just restart silently
      } else {
        setMicError(`Speech error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still supposed to be listening
      if (recognitionRef.current === recognition) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setMicError("Could not start microphone.");
      setIsListening(false);
    }
  }, [addMessageWithSpeakerDetection]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      const ref = recognitionRef.current;
      recognitionRef.current = null;
      ref.stop();
    }
    setIsListening(false);
    setInterimText("");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  // Auto-start microphone on mount
  useEffect(() => {
    if (micSupported) {
      const timer = setTimeout(() => startListening(), 500);
      return () => clearTimeout(timer);
    }
  }, [micSupported, startListening]);

  // ─── Manual text send ─────────────────────────────────
  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText("");
    addMessageWithSpeakerDetection(text);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ─── End session ──────────────────────────────────────
  const handleEndSession = async () => {
    if (isEnding) return;
    setIsEnding(true);
    stopListening();

    try {
      await endLiveCallSession(sessionId);
      if (timerRef.current) clearInterval(timerRef.current);

      if (messages.length >= 2) {
        setShowSummary(true);
        setIsGeneratingSummary(true);
        try {
          const result = await generateMeetingSummary({
            conversationHistory: messages,
            customerName,
            callType,
          });
          setSummary(result);
        } catch {
          setSummary("Summary generation failed.");
        } finally {
          setIsGeneratingSummary(false);
        }
      } else {
        onClose();
      }
    } catch {
      setIsEnding(false);
    }
  };

  // Manual coaching
  const handleManualCoach = () => {
    if (messages.length > 0) triggerCoaching(messages);
  };

  // ═══════════════════════════════════════════════════════
  // RENDER – Summary
  // ═══════════════════════════════════════════════════════
  if (showSummary) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0f1a] flex items-center justify-center p-6">
        <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-cyan-500/30 bg-[#111827] p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-cyan-400" />
              <h2 className="text-xl font-bold text-white">Meeting Summary</h2>
            </div>
            <Button onClick={onClose} className="bg-cyan-600 hover:bg-cyan-700 text-white border-0">
              Close & Return
            </Button>
          </div>

          <div className="mb-4 flex items-center gap-4 text-sm text-gray-400">
            <span>Customer: {customerName}</span>
            <span>•</span>
            <span>Type: {callType}</span>
            <span>•</span>
            <span>Duration: {formatElapsed(elapsedTime)}</span>
            <span>•</span>
            <span>Messages: {messageCount.rep + messageCount.customer}</span>
          </div>

          {isGeneratingSummary ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-cyan-300 text-sm">AI is analyzing the conversation...</p>
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-gray-200 leading-relaxed">{summary}</div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // RENDER – Main
  // ═══════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 z-50 bg-[#0a0f1a] flex flex-col">
      {/* ─── Top Bar ─── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-cyan-500/20 bg-[#111827]">
        <div className="flex items-center gap-4">
          {/* Live indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-green-500 animate-pulse'}`} />
            <span className={`text-sm font-bold ${isListening ? 'text-red-400' : 'text-green-400'}`}>
              {isListening ? '🎤 LISTENING' : 'LIVE'}
            </span>
          </div>
          <div className="h-5 w-px bg-gray-600" />

          {/* Customer */}
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-white font-medium">{customerName}</span>
            {company && <span className="text-xs text-gray-400">@ {company}</span>}
          </div>
          <div className="h-5 w-px bg-gray-600" />
          <span className="text-xs text-gray-400 uppercase">{callType}</span>
          <div className="h-5 w-px bg-gray-600" />

          {/* Timer */}
          <div className="flex items-center gap-1.5 text-cyan-300">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-sm font-mono">{formatElapsed(elapsedTime)}</span>
          </div>

          {/* Speaker detection indicator */}
          {isDetectingSpeaker && (
            <>
              <div className="h-5 w-px bg-gray-600" />
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                <span className="text-[10px] text-yellow-400">detecting speaker...</span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Message count */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{messageCount.rep + messageCount.customer} msgs</span>
          </div>

          {/* Auto AI toggle */}
          <Button
            onClick={() => setAutoCoach(!autoCoach)}
            className={`h-8 px-3 text-xs border ${
              autoCoach
                ? "bg-cyan-600/30 text-cyan-300 border-cyan-500/40 hover:bg-cyan-600/50"
                : "bg-gray-700/30 text-gray-400 border-gray-600/40 hover:bg-gray-700/50"
            }`}
          >
            <Brain className="w-3.5 h-3.5 mr-1" />
            Auto AI {autoCoach ? "ON" : "OFF"}
          </Button>

          {/* End meeting */}
          <Button
            onClick={handleEndSession}
            disabled={isEnding}
            className="h-8 px-4 bg-red-600/40 hover:bg-red-600/60 text-red-200 border border-red-500/30 disabled:opacity-50"
          >
            {isEnding ? "Ending..." : "End Meeting"}
          </Button>
        </div>
      </div>

      {/* ─── Main Content – 2 columns ─── */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT – Conversation */}
        <div className="flex-1 flex flex-col border-r border-cyan-500/10">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {messages.length === 0 && !interimText && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4 opacity-60">
                <Mic className="w-12 h-12 text-cyan-500/40" />
                <div>
                  <p className="text-gray-400 text-sm font-medium">
                    Meeting with {customerName}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    🎤 Turn on mic → speech is auto-transcribed → AI detects who is speaking
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Or type manually in the text area below
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.speaker === "rep" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    msg.speaker === "rep"
                      ? "bg-cyan-600/20 border border-cyan-500/30 text-cyan-50"
                      : "bg-purple-600/10 border border-purple-500/30 text-purple-50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {msg.speaker === "rep" ? (
                      <User className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <Users className="w-3 h-3 text-purple-400" />
                    )}
                    <span
                      className={`text-[10px] font-semibold uppercase ${
                        msg.speaker === "rep" ? "text-cyan-400" : "text-purple-400"
                      }`}
                    >
                      {msg.speaker === "rep" ? "Rep (You)" : `Customer (${customerName})`}
                    </span>
                    <span className="text-[10px] text-gray-500">{msg.timestamp}</span>
                  </div>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}

            {/* Interim (live transcription preview) */}
            {interimText && (
              <div className="flex justify-center">
                <div className="max-w-[80%] rounded-2xl px-4 py-2.5 bg-yellow-600/10 border border-yellow-500/20 border-dashed">
                  <div className="flex items-center gap-2 mb-1">
                    <Mic className="w-3 h-3 text-yellow-400 animate-pulse" />
                    <span className="text-[10px] font-semibold text-yellow-400">LISTENING...</span>
                  </div>
                  <p className="text-sm text-yellow-200/80 italic">{interimText}</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ─── Input Area ─── */}
          <div className="px-6 py-4 border-t border-cyan-500/10 bg-[#111827]">
            {micError && (
              <p className="text-xs text-red-400 mb-2">{micError}</p>
            )}

            <div className="flex items-end gap-3">
              {/* Mic Button */}
              {micSupported && (
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                    isListening
                      ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30 animate-pulse"
                      : "bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40"
                  }`}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}

              {/* Text Input (for manual fallback) */}
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Or type here... (press Enter to send)"
                rows={2}
                className="flex-1 bg-[#1e293b] border border-gray-600/40 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500/60 resize-none placeholder:text-gray-500"
              />

              {/* Send */}
              <Button
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                className="flex-shrink-0 h-11 w-11 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white border-0 disabled:opacity-40 p-0 flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500">
              <span>🎤 Microphone = auto-listen • AI detects who is speaking • Manual typing also supported</span>
            </div>
          </div>
        </div>

        {/* RIGHT – AI Coaching Panel */}
        <div className="w-[420px] flex flex-col bg-[#0d1117]">
          {/* Coaching Header */}
          <div className="px-5 py-3 border-b border-cyan-500/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-cyan-300">AI Coach</span>
              {isCoaching && (
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                  <span className="text-[10px] text-cyan-400 animate-pulse">thinking...</span>
                </div>
              )}
            </div>
            <Button
              onClick={handleManualCoach}
              disabled={isCoaching || messages.length === 0}
              className="h-7 px-3 text-[11px] bg-cyan-700/30 hover:bg-cyan-700/50 text-cyan-200 border border-cyan-500/30 disabled:opacity-40"
            >
              <Zap className="w-3 h-3 mr-1" />
              Coach Now
            </Button>
          </div>

          {/* Coaching Cards */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {coachingCards.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-50">
                <Sparkles className="w-10 h-10 text-cyan-500/30" />
                <div>
                  <p className="text-gray-400 text-xs font-medium">
                    AI coaching will appear here
                  </p>
                  <p className="text-gray-500 text-[10px] mt-1">
                    Turn on mic or type → AI provides instant coaching
                  </p>
                </div>
              </div>
            )}

            {coachingCards.map((card) => (
              <Card
                key={card.id}
                className={`p-4 border bg-[#111827] transition-all ${
                  card.isStreaming
                    ? "border-cyan-500/50 shadow-lg shadow-cyan-500/10"
                    : "border-gray-700/40"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span className="text-[10px] font-semibold text-cyan-400">AI COACHING</span>
                  </div>
                  <span className="text-[10px] text-gray-500">{card.timestamp}</span>
                </div>
                <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {card.content}
                  {card.isStreaming && (
                    <span className="inline-block w-1.5 h-4 bg-cyan-400 ml-0.5 animate-pulse" />
                  )}
                </div>
              </Card>
            ))}
            <div ref={coachingEndRef} />
          </div>

          {/* Quick Stats */}
          <div className="px-4 py-3 border-t border-cyan-500/10 bg-[#111827]">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-lg bg-[#1e293b]">
                <p className="text-lg font-bold text-cyan-300">{messageCount.rep}</p>
                <p className="text-[10px] text-gray-400">Rep</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-[#1e293b]">
                <p className="text-lg font-bold text-purple-300">{messageCount.customer}</p>
                <p className="text-[10px] text-gray-400">Customer</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-[#1e293b]">
                <p className="text-lg font-bold text-green-300">{coachingCards.length}</p>
                <p className="text-[10px] text-gray-400">AI Tips</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
