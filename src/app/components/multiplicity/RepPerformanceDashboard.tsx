import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  TrendingUp,
  Target,
  AlertTriangle,
  Sparkles,
  Calendar,
  Clock,
  User,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  FileText,
  ChevronDown,
  ArrowUpDown,
  Phone,
  Award,
  ExternalLink,
  CheckCircle2,
  Info,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { useState, useRef, useEffect } from "react";
import { AIChatPanel } from "./AIChatPanel";
import { AICoachPanel } from "./AICoachPanel";
import { EnrichedScheduledCallCard } from "./EnrichedScheduledCallCard";
import { MeetingAssistant } from "./MeetingAssistant";
import { useAuth } from "../auth/AuthProvider";
import {
  useAllCalls,
  useAllAnalysis,
  useAllScheduledCalls,
  useAllTranscripts,
  useAllInsights,
  useAllKeyMoments
} from "../../../services/hooks";
import { getAICoachingSummaryWithEmail } from "../../../services/aiCoachService";
import { addLiveTranscriptSegment, endLiveCallSession, startLiveCallSession } from "../../../services/liveCallService";
import { generateLiveMicroTip } from "../../../services/openaiService";

export function RepPerformanceDashboard() {
  const { user } = useAuth();
  const repName = user?.user_metadata?.name || 'Sarah Johnson';
  const [selectedCallId, setSelectedCallId] = useState<number>(1);
  const { data: supabaseCalls, loading } = useAllCalls();
  const { data: analysisData, loading: analysisLoading } = useAllAnalysis();
  // Fetch all scheduled calls for all reps
  const { data: scheduledCallsData, loading: scheduledLoading } = useAllScheduledCalls();
  // Fetch transcripts, insights, and key moments
  const { data: transcriptsData } = useAllTranscripts();
  const { data: insightsData } = useAllInsights();
  const { data: momentsData } = useAllKeyMoments();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [callSortBy, setCallSortBy] = useState<"date" | "score" | "name">(
    "date"
  );
  const [scheduleSortBy, setScheduleSortBy] = useState<
    "date" | "name" | "type"
  >("date");
  const [liveAssistantMessage, setLiveAssistantMessage] = useState<string | null>(null);
  const [startingLiveCallId, setStartingLiveCallId] = useState<string | null>(null);
  const [activeLiveSessionId, setActiveLiveSessionId] = useState<string | null>(null);
  const [activeLiveCustomer, setActiveLiveCustomer] = useState<string | null>(null);
  const [activeLiveCallType, setActiveLiveCallType] = useState<string | null>(null);
  const [liveSnippet, setLiveSnippet] = useState("");
  const [liveSpeaker, setLiveSpeaker] = useState<"rep" | "customer" | "unknown">("rep");
  const [isGeneratingLiveTip, setIsGeneratingLiveTip] = useState(false);
  const [liveTip, setLiveTip] = useState<string | null>(null);
  const [isEndingLiveSession, setIsEndingLiveSession] = useState(false);

  // Meeting Assistant full-screen state
  const [showMeetingAssistant, setShowMeetingAssistant] = useState(false);
  const [meetingAssistantData, setMeetingAssistantData] = useState<{
    sessionId: string;
    customerName: string;
    callType: string;
    company?: string;
  } | null>(null);

  // AI Coaching state
  const [aiCoachingData, setAiCoachingData] = useState<{
    masterReport: any;
    agentAnalysis: any[];
    objections: any[];
    questions: any[];
  } | null>(null);
  const [loadingAICoaching, setLoadingAICoaching] = useState(false);

  // Audio player ref
  const audioRef = useRef<HTMLAudioElement>(null);

  // Function to create short AI summary from coaching feedback
  const createShortSummary = (feedback: string | undefined): string => {
    if (!feedback) return "Analysis in progress...";

    // Extract first 2 sentences or first 120 characters
    const sentences = feedback.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 0) {
      const firstTwo = sentences.slice(0, 2).join('. ').trim();
      if (firstTwo.length > 120) {
        return firstTwo.substring(0, 117) + '...';
      }
      return firstTwo + (firstTwo.endsWith('.') ? '' : '.');
    }
    
    return feedback.substring(0, 117) + '...';
  };

  // Helper function to calculate talk ratio from transcript
  const calculateTalkRatio = (transcript: any) => {
    // Try segments first
    if (transcript?.segments && Array.isArray(transcript.segments) && transcript.segments.length > 0) {
      const repCount = transcript.segments.filter((s: any) => s.speaker === 'rep').length;
      const customerCount = transcript.segments.filter((s: any) => s.speaker === 'customer').length;
      const total = repCount + customerCount;

      if (total > 0) {
        return {
          rep: Math.round((repCount / total) * 100),
          customer: Math.round((customerCount / total) * 100),
        };
      }
    }

    // Fallback: calculate from transcript_text by counting lines
    if (transcript?.transcript_text) {
      const lines = transcript.transcript_text.split('\n').filter((line: string) => line.trim().length > 0);
      const repLines = lines.filter((line: string) => line.trim().startsWith('Rep:')).length;
      const customerLines = lines.filter((line: string) => line.trim().startsWith('Customer:')).length;
      const total = repLines + customerLines;

      if (total > 0) {
        return {
          rep: Math.round((repLines / total) * 100),
          customer: Math.round((customerLines / total) * 100),
        };
      }
    }

    return { rep: 50, customer: 50 };
  };

  // Helper function to format transcript from segments
  const formatTranscript = (transcript: any) => {
    if (!transcript) {
      return "Transcript not available";
    }

    // Prefer transcript_text (full conversation) over segments (short snippets)
    if (transcript.transcript_text && transcript.transcript_text.length > 50) {
      return transcript.transcript_text;
    }

    // Fallback to segments if transcript_text is not available
    if (transcript.segments && Array.isArray(transcript.segments)) {
      return transcript.segments
        .map((seg: any) => {
          const speaker = seg.speaker === 'rep' ? 'Rep' : 'Customer';
          return `${speaker}: ${seg.text}`;
        })
        .join('\n\n');
    }

    return "Transcript not available";
  };

  // Convert Supabase calls to display format with analysis data
  const displayCalls = supabaseCalls && (supabaseCalls as any[]).length > 0
    ? (supabaseCalls as any[])
        .filter((call: any) => call.rep_name === repName)
        .map((call, idx) => {
        // Find matching analysis for this call
        const callAnalysis = analysisData?.find((a: any) => a.call_id === call.id);

        // Find matching transcript
        const callTranscript = transcriptsData?.find((t: any) => t.call_id === call.id);

        // Find matching insights
        const callInsights = insightsData?.filter((i: any) => i.call_id === call.id) || [];

        // Find matching key moments
        const callMoments = momentsData?.filter((m: any) => m.call_id === call.id) || [];

        // Calculate talk ratio from transcript (pass full transcript object)
        const talkRatio = calculateTalkRatio(callTranscript);

        // Use started_at for call time, fallback to created_at
        const callDateTime = call.started_at || call.created_at;
        const mappedCall = {
          id: idx + 1,
          rep: call.rep_name || "Unknown",
          customer: call.customer_name || "Unknown Customer",
          company: call.company || "Unknown Company",
          industry: call.industry || "Sales",
          type: call.call_type || "Call",
          date: callDateTime
            ? new Date(callDateTime).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "Unknown",
          time: callDateTime
            ? new Date(callDateTime).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
            : "00:00",
          duration: call.duration_seconds
            ? `${Math.floor(call.duration_seconds / 60)}:${String(
                call.duration_seconds % 60
              ).padStart(2, "0")}`
            : "00:00",
          // Use analysis score if available, otherwise fallback
          score: callAnalysis?.scores?.overall || call.score || 75,
          dimensions: {
            discovery: callAnalysis?.scores?.discovery || 75,
            qualification: callAnalysis?.scores?.qualification || 75,
            objectionHandling: callAnalysis?.scores?.objection_handling || 75,
            closing: callAnalysis?.scores?.closing || 75,
            rapportBuilding: callAnalysis?.scores?.rapport_building || 75,
          },
          summary: createShortSummary(callAnalysis?.coaching?.feedback),
          coaching: callAnalysis?.coaching?.feedback || "Continue with your excellent performance.",
          strengths: callAnalysis?.coaching?.strengths || ["Professional communication"],
          improvements: callAnalysis?.coaching?.improvement_areas || ["Continue improving"],
          outcome: call.outcome || "Call completed",
          audioUrl: call.audio_url || null,
          transcript: formatTranscript(callTranscript),
          aiInsights: callInsights.map((insight: any) => ({
            timestamp: insight.timestamp || "0:00",
            type: insight.type || "positive",
            text: insight.text || "",
          })),
          talkRatio: talkRatio,
          keyMoments: callMoments.map((moment: any) => ({
            time: moment.time || "0:00",
            label: moment.label || "Moment",
          })),
        };
        return mappedCall;
      })
    : [];

  // Default empty call object for when no calls are available
  const defaultCall = {
    id: 0,
    rep: repName,
    customer: "No calls available",
    company: "N/A",
    industry: "N/A",
    type: "N/A",
    date: "N/A",
    time: "N/A",
    duration: "00:00",
    score: 0,
    dimensions: {
      discovery: 0,
      qualification: 0,
      objectionHandling: 0,
      closing: 0,
      rapportBuilding: 0,
    },
    summary: "No calls available for this rep yet.",
    coaching: "Start making calls to get coaching feedback.",
    strengths: [],
    improvements: [],
    outcome: "N/A",
    audioUrl: null,
    transcript: "No transcript available",
    aiInsights: [],
    talkRatio: { rep: 50, customer: 50 },
    keyMoments: [],
  };

  // Fallback for selected call
  const selectedCall =
    displayCalls && displayCalls.length > 0
      ? displayCalls.find((c) => c.id === selectedCallId) || displayCalls[0]
      : defaultCall;

  // Fetch AI coaching data when call is selected
  useEffect(() => {
    const abortController = new AbortController();
    let debounceTimer: NodeJS.Timeout;

    const fetchAICoaching = async () => {
      if (!selectedCall?.id) return;

      // Find the Supabase call ID from the selected mock call
      const supabaseCall = supabaseCalls?.find((c: any) =>
        c.customer_name === selectedCall.customer && c.rep_name === selectedCall.rep
      );

      if (!supabaseCall?.id) {
        console.log('No Supabase call found for selected call');
        return;
      }

      // Debounce to prevent rapid re-fetching
      debounceTimer = setTimeout(async () => {
        if (abortController.signal.aborted) return;

        setLoadingAICoaching(true);
        try {
          console.log('🔍 Fetching AI coaching data for call ID:', supabaseCall.id);
          // Use the new function that also triggers email notification
          const data = await getAICoachingSummaryWithEmail(supabaseCall.id);
          console.log('✅ AI Coaching Data received:', {
            masterReport: data.masterReport,
            objectionsCount: data.objections?.length || 0,
            questionsCount: data.questions?.length || 0,
            objections: data.objections,
            questions: data.questions
          });
          console.log('📧 Email notification triggered via N8N webhook');
          if (!abortController.signal.aborted) {
            setAiCoachingData(data);
          }
        } catch (error) {
          if (!abortController.signal.aborted) {
            console.error('❌ Error fetching AI coaching data:', error);
          }
        } finally {
          if (!abortController.signal.aborted) {
            setLoadingAICoaching(false);
          }
        }
      }, 300); // 300ms debounce
    };

    fetchAICoaching();

    // Cleanup function
    return () => {
      abortController.abort();
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [selectedCallId, supabaseCalls]); // Depend on selectedCallId and supabaseCalls

  // Calculate real metrics from data
  const calculateMetrics = () => {
    if (!displayCalls || displayCalls.length === 0) {
      return {
        averageScore: 0,
        callsThisWeek: 0,
        scheduledToday: 0,
        winRate: 0,
        topSkill: { name: 'N/A', score: 0 }
      };
    }

    // Average Score
    const totalScore = displayCalls.reduce((sum, call) => sum + call.score, 0);
    const averageScore = Math.round(totalScore / displayCalls.length);

    // Calls This Week (assuming all calls in displayCalls are from this week)
    const callsThisWeek = displayCalls.length;

    // Scheduled Today - just count all upcoming scheduled calls
    const scheduledToday = scheduledCalls.length;

    // Win Rate (successful outcomes / total calls)
    const successfulOutcomes = displayCalls.filter(call => {
      const outcome = call.outcome?.toLowerCase() || '';
      return outcome.includes('demo') ||
             outcome.includes('scheduled') ||
             outcome.includes('proposal') ||
             outcome.includes('closed') ||
             outcome.includes('sent');
    }).length;
    const winRate = Math.round((successfulOutcomes / displayCalls.length) * 100);

    // Top Skill (highest average dimension score)
    const dimensionAverages = {
      discovery: 0,
      qualification: 0,
      objectionHandling: 0,
      closing: 0,
      rapportBuilding: 0
    };

    displayCalls.forEach(call => {
      dimensionAverages.discovery += call.dimensions.discovery;
      dimensionAverages.qualification += call.dimensions.qualification;
      dimensionAverages.objectionHandling += call.dimensions.objectionHandling;
      dimensionAverages.closing += call.dimensions.closing;
      dimensionAverages.rapportBuilding += call.dimensions.rapportBuilding;
    });

    Object.keys(dimensionAverages).forEach(key => {
      dimensionAverages[key as keyof typeof dimensionAverages] =
        Math.round(dimensionAverages[key as keyof typeof dimensionAverages] / displayCalls.length);
    });

    const topSkillEntry = Object.entries(dimensionAverages).reduce((max, [key, value]) =>
      value > max.score ? { name: key, score: value } : max
    , { name: '', score: 0 });

    const skillNameMap: Record<string, string> = {
      discovery: 'Discovery',
      qualification: 'Qualification',
      objectionHandling: 'Objection Handling',
      closing: 'Closing',
      rapportBuilding: 'Rapport Building'
    };

    return {
      averageScore,
      callsThisWeek,
      scheduledToday,
      winRate,
      topSkill: {
        name: skillNameMap[topSkillEntry.name] || 'N/A',
        score: topSkillEntry.score
      }
    };
  };

  // Convert duration string (MM:SS) to seconds
  const parseDuration = (duration: string): number => {
    const [mins, secs] = duration.split(":").map(Number);
    return mins * 60 + secs;
  };

  const callDuration = selectedCall ? parseDuration(selectedCall.duration) : 0;

  // Transform scheduled calls from Supabase to display format
  console.log('📅 Total scheduled calls from Supabase:', scheduledCallsData?.length, scheduledCallsData);

  // Get current time in CST
  const nowCST = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });
  const currentTimeCST = new Date(nowCST);

  const scheduledCalls = scheduledCallsData
    ? (scheduledCallsData as any[])
        .filter((call) => (call.rep_id === user?.id || call.rep_name === repName) && new Date(call.scheduled_date) > currentTimeCST)
        .map((call, idx) => {
          const scheduledDate = call.scheduled_date ? new Date(call.scheduled_date) : null;
          return {
            id: idx + 1,
            customer: call.customer_name || "Unknown",
            company: call.company || "Unknown Company",
            type: call.call_type || "Call",
            date: scheduledDate
              ? scheduledDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "America/Chicago",
                })
              : "Unknown",
            time: scheduledDate
              ? scheduledDate.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                  timeZone: "America/Chicago",
                })
              : "TBD",
            duration: call.duration_minutes ? `${call.duration_minutes} min` : "30 min",
            priority: call.priority || "medium",
            notes: call.notes || "No notes available",
            linkedIn: call.linkedin_url || "#",
            preparationTips: Array.isArray(call.preparation_tips)
              ? call.preparation_tips
              : ["Prepare for the call"],
            rawCall: call,
          };
        })
    : [];

  // Calculate metrics after scheduledCalls is defined
  const metrics = calculateMetrics();

  // Performance trend data
  const performanceTrend = [
    { week: "Week 1", score: 78 },
    { week: "Week 2", score: 82 },
    { week: "Week 3", score: 79 },
    { week: "Week 4", score: 85 },
  ];

  // Dimension data for chart
  const dimensionData = [
    { name: "Discovery", score: selectedCall.dimensions.discovery },
    { name: "Qualification", score: selectedCall.dimensions.qualification },
    { name: "Objection", score: selectedCall.dimensions.objectionHandling },
    { name: "Closing", score: selectedCall.dimensions.closing },
    { name: "Rapport", score: selectedCall.dimensions.rapportBuilding },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-emerald-50 border-emerald-200";
    if (score >= 60) return "bg-amber-50 border-amber-200";
    return "bg-red-50 border-red-200";
  };

  const getBarColor = (score: number) => {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#f59e0b";
    return "#ef4444";
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartLiveAssistant = async (call: any) => {
    const rawCall = call?.rawCall;
    if (!rawCall?.id || !rawCall?.rep_id) {
      setLiveAssistantMessage("Unable to start live assistant: missing schedule or rep information.");
      return;
    }

    if (rawCall.live_assistant_enabled === false) {
      setLiveAssistantMessage("Live assistant is disabled for this scheduled call.");
      return;
    }

    if (!rawCall.meeting_url) {
      setLiveAssistantMessage("Meeting link is missing. Ask your manager/admin to add meeting_url.");
      return;
    }

    setStartingLiveCallId(rawCall.id);
    try {
      const session = await startLiveCallSession({
        scheduledCallId: rawCall.id,
        repId: rawCall.rep_id,
        meetingUrl: rawCall.meeting_url,
      });

      if (!session) {
        setLiveAssistantMessage("Could not create live session. Please try again.");
        return;
      }

      setActiveLiveSessionId(session.id);
      setActiveLiveCustomer(call.customer || rawCall.customer_name || null);
      setActiveLiveCallType(call.type || rawCall.call_type || null);
      setLiveTip(null);
      setLiveSnippet("");

      // Open meeting link in background
      window.open(rawCall.meeting_url, '_blank', 'noopener,noreferrer');

      // Launch full-screen Meeting Assistant
      setMeetingAssistantData({
        sessionId: session.id,
        customerName: call.customer || rawCall.customer_name || 'Unknown',
        callType: call.type || rawCall.call_type || 'Call',
        company: rawCall.company || undefined,
      });
      setShowMeetingAssistant(true);
      setLiveAssistantMessage(`Meeting Assistant opened for ${call.customer}.`);
    } finally {
      setStartingLiveCallId(null);
    }
  };

  const handleGenerateLiveTip = async () => {
    if (!activeLiveSessionId) {
      setLiveAssistantMessage("No active live session found. Start a live session first.");
      return;
    }

    const snippet = liveSnippet.trim();
    if (!snippet) {
      setLiveAssistantMessage("Type a short live transcript snippet first.");
      return;
    }

    if (isGeneratingLiveTip) return;

    setIsGeneratingLiveTip(true);
    try {
      await addLiveTranscriptSegment({
        sessionId: activeLiveSessionId,
        speaker: liveSpeaker,
        text: snippet,
      });

      const tip = await generateLiveMicroTip({
        transcriptSnippet: snippet,
        customerName: activeLiveCustomer || undefined,
        callType: activeLiveCallType || undefined,
      });

      setLiveTip(tip);
      setLiveAssistantMessage("Live coaching tip generated.");
      setLiveSnippet("");
    } catch (error) {
      console.error(error);
      setLiveAssistantMessage("Failed to generate live coaching tip. Try again.");
    } finally {
      setIsGeneratingLiveTip(false);
    }
  };

  const handleEndLiveSession = async () => {
    if (!activeLiveSessionId || isEndingLiveSession) return;

    setIsEndingLiveSession(true);
    try {
      const ok = await endLiveCallSession(activeLiveSessionId);
      if (!ok) {
        setLiveAssistantMessage("Could not end live session. Please try again.");
        return;
      }

      setLiveAssistantMessage("Live session ended.");
      setActiveLiveSessionId(null);
      setActiveLiveCustomer(null);
      setActiveLiveCallType(null);
      setLiveSnippet("");
      setLiveTip(null);
    } finally {
      setIsEndingLiveSession(false);
    }
  };

  // Audio player handlers
  const handlePlayPause = async () => {
    if (audioRef.current) {
      try {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setIsPlaying(true);
              })
              .catch((error) => {
                console.error('Play error:', error);
                setIsPlaying(false);
              });
          } else {
            setIsPlaying(true);
          }
        }
      } catch (err) {
        console.error('Audio control error:', err);
        setIsPlaying(false);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseInt(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleSkipBack = () => {
    const newTime = Math.max(0, currentTime - 10);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleSkipForward = () => {
    const newTime = Math.min(duration, currentTime + 10);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleMuteToggle = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Update current time as audio plays
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(Math.floor(audio.currentTime));
    const updateDuration = () => setDuration(Math.floor(audio.duration));
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Reset audio when call changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [selectedCallId]);

  // Sort calls based on selected criteria
  const sortedCalls = [...displayCalls].sort((a, b) => {
    if (callSortBy === "score") {
      return b.score - a.score; // Highest score first
    } else if (callSortBy === "name") {
      return a.customer.localeCompare(b.customer);
    } else {
      // date - For simplicity, using time as proxy
      const timeA =
        a.time.includes("AM") || a.time.includes("PM")
          ? parseInt(a.time) +
            (a.time.includes("PM") && !a.time.startsWith("12") ? 12 : 0)
          : parseInt(a.time);
      const timeB =
        b.time.includes("AM") || b.time.includes("PM")
          ? parseInt(b.time) +
            (b.time.includes("PM") && !b.time.startsWith("12") ? 12 : 0)
          : parseInt(b.time);
      return timeB - timeA; // Most recent first
    }
  });

  // Sort scheduled calls based on selected criteria
  const sortedScheduledCalls = [...scheduledCalls].sort((a, b) => {
    if (scheduleSortBy === "name") {
      return a.customer.localeCompare(b.customer);
    } else if (scheduleSortBy === "type") {
      return a.type.localeCompare(b.type);
    } else {
      // date
      const timeA = parseInt(a.time);
      const timeB = parseInt(b.time);
      return timeA - timeB; // Earliest first
    }
  });

  return (
    <>
      {/* Full-screen Meeting Assistant overlay */}
      {showMeetingAssistant && meetingAssistantData && (
        <MeetingAssistant
          sessionId={meetingAssistantData.sessionId}
          customerName={meetingAssistantData.customerName}
          callType={meetingAssistantData.callType}
          company={meetingAssistantData.company}
          onClose={() => {
            setShowMeetingAssistant(false);
            setMeetingAssistantData(null);
            setActiveLiveSessionId(null);
            setActiveLiveCustomer(null);
            setActiveLiveCallType(null);
            setLiveSnippet("");
            setLiveTip(null);
          }}
        />
      )}
    <div className="min-h-screen bg-[#0a1628]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1e3a8a] to-[#1e40af] text-white px-8 py-8 shadow-2xl border-b border-cyan-500/20">
        <div className="max-w-[1600px] mx-auto">
          <h1 className="text-3xl font-bold mb-2 text-cyan-400">
            {repName} - Performance Dashboard
          </h1>
          <p className="text-cyan-200">Real-Time Call Scoring & Coaching Insights</p>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <Card className="p-6 border border-cyan-500/30 bg-[#1e293b] shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">
                  Average Score
                </p>
                <p className="text-3xl font-bold text-white">{metrics.averageScore}</p>
                <div className="flex items-center gap-1 mt-2 text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">Based on {displayCalls.length} calls</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border border-cyan-500/30 bg-[#1e293b] shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">
                  Calls This Week
                </p>
                <p className="text-3xl font-bold text-white">{metrics.callsThisWeek}</p>
                <p className="text-sm text-gray-400 mt-2">{metrics.scheduledToday} scheduled today</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Phone className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border border-cyan-500/30 bg-[#1e293b] shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 transition-shadow group relative">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-gray-400">Win Rate</p>
                  <div className="relative group/tooltip">
                    <Info className="w-3.5 h-3.5 text-gray-500 hover:text-cyan-400 cursor-help transition-colors" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:block w-64 bg-gray-900 border border-cyan-500/40 rounded-lg p-3 text-xs text-gray-300 shadow-xl z-50">
                      <p className="font-semibold text-cyan-400 mb-1">
                        How is this calculated?
                      </p>
                      <p>Win Rate = (Successful Outcomes / Total Calls) × 100</p>
                      <p className="mt-1 text-gray-400">
                        Successful outcomes include: demos scheduled, proposals
                        sent, and deals closed.
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-3xl font-bold text-white">{metrics.winRate}%</p>
                <div className="flex items-center gap-1 mt-2 text-gray-400">
                  <span className="text-sm font-medium">From {displayCalls.length} calls</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border border-cyan-500/30 bg-[#1e293b] shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">
                  Top Skill
                </p>
                <p className="text-xl font-bold text-white">
                  {metrics.topSkill.name}
                </p>
                <p className="text-sm text-gray-400 mt-2">Avg: {metrics.topSkill.score}/100</p>
              </div>
              <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-amber-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Recent Calls */}
          <div className="col-span-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-cyan-400">
                Recent Calls {loading && <span className="text-xs text-gray-400 ml-2">(Loading...)</span>}
              </h2>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-gray-400" />
                <select
                  value={callSortBy}
                  onChange={(e) =>
                    setCallSortBy(e.target.value as "date" | "score" | "name")
                  }
                  className="bg-[#1e293b] border border-cyan-500/30 text-cyan-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-cyan-500"
                >
                  <option value="date">By Date</option>
                  <option value="score">By Score</option>
                  <option value="name">By Name</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              {sortedCalls.map((call) => (
                <Card
                  key={call.id}
                  onClick={() => setSelectedCallId(call.id)}
                  className={`p-3 cursor-pointer border-2 transition-all ${
                    selectedCallId === call.id
                      ? "border-cyan-500 shadow-lg shadow-cyan-500/30 bg-[#1e3a5f]"
                      : "border-cyan-500/20 hover:border-cyan-500/40 bg-[#1e293b] hover:shadow-md hover:shadow-cyan-500/10"
                  }`}
                >
                  {/* Company + Type Badge - Compact Header */}
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-400 truncate flex-1">
                      {call.company}
                    </p>
                    <Badge
                      variant="outline"
                      className="text-xs border-cyan-500/40 text-cyan-300 ml-2"
                    >
                      {call.type}
                    </Badge>
                  </div>

                  {/* Rep and Score Row - Main Info */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-cyan-400 font-medium">
                      👤 {call.rep}
                    </p>
                    <div className={`text-lg font-bold ${getScoreColor(call.score)}`}>
                      {call.score}<span className="text-xs text-gray-500 ml-0.5">/100</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Performance Trend */}
            <Card className="p-6 border border-cyan-500/30 bg-[#1e293b] shadow-lg shadow-cyan-500/10 mt-6">
              <h3 className="text-sm font-semibold text-white mb-4">
                4-Week Trend
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={performanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 12, fill: "#9ca3af" }}
                    stroke="#475569"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12, fill: "#9ca3af" }}
                    stroke="#475569"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #06b6d4",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    dot={{ fill: "#06b6d4", r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Scheduled Calls */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">
                  Today's Schedule {scheduledLoading && <span className="text-xs text-gray-400 ml-2">(Loading...)</span>}
                </h3>
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  <select
                    value={scheduleSortBy}
                    onChange={(e) =>
                      setScheduleSortBy(
                        e.target.value as "date" | "name" | "type"
                      )
                    }
                    className="bg-[#1e293b] border border-cyan-500/30 text-cyan-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="date">By Time</option>
                    <option value="name">By Name</option>
                    <option value="type">By Topic</option>
                  </select>
                </div>
              </div>
              {liveAssistantMessage && (
                <p className="text-xs text-amber-300 mb-3">{liveAssistantMessage}</p>
              )}

              {activeLiveSessionId && (
                <Card className="mb-4 p-4 border border-cyan-500/30 bg-[#0f172a]">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-sm font-semibold text-cyan-300">
                      Live Assistant Active {activeLiveCustomer ? `• ${activeLiveCustomer}` : ""}
                    </p>
                    <Button
                      onClick={handleEndLiveSession}
                      disabled={isEndingLiveSession}
                      className="h-8 px-3 bg-red-700/40 hover:bg-red-700/60 text-red-100 border border-red-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isEndingLiveSession ? "Ending..." : "End Session"}
                    </Button>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-2">
                    <select
                      value={liveSpeaker}
                      onChange={(e) => setLiveSpeaker(e.target.value as "rep" | "customer" | "unknown")}
                      className="col-span-1 bg-[#1e293b] border border-cyan-500/30 text-cyan-300 text-xs rounded px-2 py-2 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="rep">Rep</option>
                      <option value="customer">Customer</option>
                      <option value="unknown">Unknown</option>
                    </select>
                    <textarea
                      value={liveSnippet}
                      onChange={(e) => setLiveSnippet(e.target.value)}
                      placeholder="Paste latest spoken sentence for instant coaching..."
                      rows={2}
                      className="col-span-3 bg-[#1e293b] border border-cyan-500/30 text-white text-xs rounded px-2 py-2 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <Button
                    onClick={handleGenerateLiveTip}
                    disabled={isGeneratingLiveTip}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white border-0 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isGeneratingLiveTip ? "Generating Instant Tip..." : "Get Instant Tip (Fast Model)"}
                  </Button>

                  {liveTip && (
                    <div className="mt-3 rounded-lg border border-cyan-500/30 bg-[#1e293b] p-3">
                      <p className="text-[11px] text-cyan-300 mb-1">Live Micro-Coaching</p>
                      <p className="text-sm text-gray-100 whitespace-pre-wrap">{liveTip}</p>
                    </div>
                  )}
                </Card>
              )}

              <div className="space-y-3">
                {sortedScheduledCalls.length > 0 ? (
                  sortedScheduledCalls.map((call: any) => (
                    <div key={call.id} className="bg-[#1e293b]/50 rounded-lg">
                      <EnrichedScheduledCallCard call={call.rawCall} />
                      <div className="px-4 pb-4">
                        <Button
                          onClick={() => handleStartLiveAssistant(call)}
                          disabled={startingLiveCallId === call.rawCall?.id}
                          className="w-full bg-cyan-700/40 hover:bg-cyan-700/60 text-cyan-100 border border-cyan-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {startingLiveCallId === call.rawCall?.id ? "Starting Live Assistant..." : "Start with Live Call Assistant"}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm text-center py-4">
                    No scheduled calls for today
                  </p>
                )}
              </div>


            </div>
          </div>

          {/* Right Column - Call Details */}
          <div className="col-span-8">
            <h2 className="text-lg font-semibold text-cyan-400 mb-4">
              {selectedCall.rep.split(' ')[0]}-{selectedCall.customer.split(' ')[0]} • {selectedCall.date} {selectedCall.time}
            </h2>

            {/* Score & Summary */}
            <Card className="p-6 border border-cyan-500/30 bg-[#1e293b] shadow-lg shadow-cyan-500/10 mb-6">
              <div className="flex items-start gap-6 pb-6 border-b border-gray-700">
                <div
                  className={`w-24 h-24 rounded-2xl flex items-center justify-center border-4 ${getScoreBg(
                    selectedCall.score
                  )} shadow-lg`}
                >
                  <div className="text-center">
                    <div
                      className={`text-4xl font-bold ${getScoreColor(
                        selectedCall.score
                      )}`}
                    >
                      {selectedCall.score}
                    </div>
                    <div className="text-xs text-gray-400 font-medium">
                      /100
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-semibold text-cyan-400">
                      Rep:
                    </span>
                    <span className="text-sm text-white">
                      {selectedCall.rep}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    Customer: {selectedCall.customer}
                  </h3>
                  <p className="text-sm text-gray-400 mb-3">
                    {selectedCall.company} • {selectedCall.industry}
                  </p>
                  <div className="flex items-center gap-3 mb-3">
                    <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      {selectedCall.type}
                    </Badge>
                    <span className="text-sm text-gray-400">
                      {selectedCall.date} • {selectedCall.time}
                    </span>
                    <span className="text-sm text-gray-400">
                      • Duration: {selectedCall.duration}
                    </span>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-3">
                    <p className="text-sm text-gray-200 leading-relaxed">
                      {selectedCall.summary}
                    </p>
                  </div>
                </div>
              </div>

              {/* Audio Player */}
              <div className="py-6 border-b border-gray-700">
                {/* Hidden audio element - always render to maintain ref */}
                {selectedCall.audioUrl && (
                  <audio
                    ref={audioRef}
                    crossOrigin="anonymous"
                    preload="auto"
                    onLoadedMetadata={() => {
                      if (audioRef.current) {
                        setDuration(Math.floor(audioRef.current.duration));
                      }
                    }}
                    onTimeUpdate={() => {
                      if (audioRef.current) {
                        setCurrentTime(Math.floor(audioRef.current.currentTime));
                      }
                    }}
                    onEnded={() => setIsPlaying(false)}
                    onError={(e) => {
                      console.error('❌ Audio error:', e);
                      setIsPlaying(false);
                    }}
                  >
                    <source src={selectedCall.audioUrl} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                )}

                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  {!selectedCall.audioUrl && (
                    <div className="text-center py-2 mb-3 bg-amber-500/10 border border-amber-500/30 rounded">
                      <p className="text-xs text-amber-300">⚠️ Audio file not available for this call</p>
                    </div>
                  )}
                  <div className="flex items-center gap-4 mb-3">
                    <Button
                      onClick={handleSkipBack}
                      size="sm"
                      disabled={!selectedCall.audioUrl}
                      className="bg-gray-700 hover:bg-gray-600 text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <SkipBack className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={handlePlayPause}
                      size="sm"
                      disabled={!selectedCall.audioUrl}
                      className="bg-cyan-500 hover:bg-cyan-600 text-white border-0 w-10 h-10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5 ml-0.5" />
                      )}
                    </Button>
                    <Button
                      onClick={handleSkipForward}
                      size="sm"
                      disabled={!selectedCall.audioUrl}
                      className="bg-gray-700 hover:bg-gray-600 text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <SkipForward className="w-4 h-4" />
                    </Button>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-cyan-400 font-medium">
                          {formatTime(currentTime)}
                        </span>
                        <input
                          type="range"
                          min="0"
                          max={duration || callDuration}
                          value={currentTime}
                          onChange={handleSeek}
                          className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                        <span className="text-sm text-gray-400">
                          {formatTime(duration || callDuration)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={handleMuteToggle}
                      disabled={!selectedCall.audioUrl}
                      className="hover:bg-gray-700 p-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isMuted ? (
                        <VolumeX className="w-5 h-5 text-gray-400" />
                      ) : (
                        <Volume2 className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>

                  {/* Key Moments */}
                  <div className="flex items-center gap-2 flex-wrap mt-3">
                    {selectedCall.keyMoments.map((moment, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="text-xs border-cyan-500/40 text-cyan-300"
                      >
                        {moment.time} - {moment.label}
                      </Badge>
                    ))}
                  </div>

                  {/* Talk Ratio */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">Talk Ratio</span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-cyan-400">
                          Rep {selectedCall.talkRatio.rep}%
                        </span>
                        <span className="text-gray-500">•</span>
                        <span className="text-blue-400">
                          Customer {selectedCall.talkRatio.customer}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden flex">
                      <div
                        className="bg-cyan-500 h-full"
                        style={{ width: `${selectedCall.talkRatio.rep}%` }}
                      />
                      <div
                        className="bg-blue-500 h-full"
                        style={{
                          width: `${selectedCall.talkRatio.customer}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* View Transcript Button */}
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <Button
                      onClick={() => setShowTranscript(!showTranscript)}
                      size="sm"
                      className="w-full bg-gray-700 hover:bg-gray-600 text-white border-0 flex items-center justify-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      {showTranscript ? "Hide Transcript" : "View Transcript"}
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          showTranscript ? "rotate-180" : ""
                        }`}
                      />
                    </Button>
                  </div>

                  {/* Transcript Content */}
                  {showTranscript && (
                    <div className="mt-4 bg-gray-900/50 rounded-lg p-4 border border-gray-600 max-h-96 overflow-y-auto">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          Full Conversation
                        </span>
                        <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs">
                          {selectedCall.duration}
                        </Badge>
                      </div>
                      <pre className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap font-sans">
                        {selectedCall.transcript}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {/* Performance Dimensions Bar Chart */}
              <div className="pt-6">
                <h4 className="text-sm font-semibold text-white mb-4">
                  Performance Dimensions
                </h4>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dimensionData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fontSize: 12, fill: "#9ca3af" }}
                      stroke="#475569"
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={120}
                      tick={{ fontSize: 12, fill: "#9ca3af" }}
                      stroke="#475569"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #06b6d4",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    />
                    <Bar
                      dataKey="score"
                      fill="#06b6d4"
                      radius={[0, 8, 8, 0]}
                    >
                      {dimensionData.map((entry, index) => (
                        <Bar
                          key={`bar-${index}`}
                          dataKey="score"
                          fill={getBarColor(entry.score)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* AI Insights Timeline */}
            <Card className="p-6 border border-cyan-500/40 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 shadow-lg shadow-cyan-500/10 mb-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">
                    AI Real-Time Insights
                  </h4>
                  <p className="text-xs text-gray-400">
                    Key moments and coaching opportunities identified during
                    the call
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {selectedCall.aiInsights.map((insight, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border-l-4 ${
                      insight.type === "positive"
                        ? "bg-emerald-500/10 border-emerald-500"
                        : insight.type === "improvement"
                        ? "bg-amber-500/10 border-amber-500"
                        : "bg-red-500/10 border-red-500"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Badge
                        variant="outline"
                        className="text-xs border-cyan-500/40 text-cyan-300 mt-0.5"
                      >
                        {insight.timestamp}
                      </Badge>
                      <p className="text-sm text-gray-200 flex-1">
                        {insight.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* AI Coaching Summary */}
            <Card className="p-6 border border-purple-500/40 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 shadow-lg shadow-purple-500/10 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">
                    AI Coaching Summary
                  </h4>
                  <p className="text-sm text-gray-200 leading-relaxed mb-4">
                    {selectedCall.coaching}
                  </p>

                  {/* Detailed Recommendations */}
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                    <p className="text-xs font-semibold text-purple-300 mb-2">
                      🎯 Actionable Next Steps:
                    </p>
                    <ul className="space-y-1.5 text-xs text-gray-300">
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400">1.</span>
                        <span>
                          Review objection handling specific to booking the next
                          meeting and trial closes
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400">2.</span>
                        <span>
                          Practice urgency creation scripts with time-bound
                          offers (e.g., "if we were able to offer Q1 pricing,
                          would you feel comfortable moving forward by March
                          31st?")
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400">3.</span>
                        <span>
                          Implement active listening cues: paraphrasing and
                          confirmation questions to improve talk/listen ratio to
                          55/45
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </Card>

            {/* AI Coach Panel */}
            {aiCoachingData && (
              <Card className="p-6 border border-purple-500/30 bg-[#1e293b] shadow-lg shadow-purple-500/10 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <h4 className="font-semibold text-white">AI Coach Analysis</h4>
                </div>
                <AICoachPanel
                  masterReport={aiCoachingData.masterReport}
                  objections={aiCoachingData.objections}
                  questions={aiCoachingData.questions}
                  agentAnalysis={aiCoachingData.agentAnalysis}
                />
              </Card>
            )}

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-2 gap-6">
              <Card className="p-6 border border-emerald-500/40 bg-[#1e293b] shadow-lg shadow-emerald-500/10">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h4 className="font-semibold text-white">Strengths</h4>
                </div>
                <ul className="space-y-2">
                  {selectedCall.strengths.map((strength: string, index: number) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-gray-300"
                    >
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="p-6 border border-amber-500/40 bg-[#1e293b] shadow-lg shadow-amber-500/10">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <h4 className="font-semibold text-white">
                    Top Area of Opportunity
                  </h4>
                </div>
                <ul className="space-y-2">
                  {selectedCall.improvements.map((improvement: string, index: number) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-gray-300"
                    >
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* AI Chat Panel */}
      <AIChatPanel
        role="rep"
        context={{
          userName: "Sarah",
          overallScore: 85,
          recentCalls: displayCalls.map((c: any) => ({
            customer: c.customer,
            score: c.score,
            type: c.type,
          })),
          strengths: selectedCall.strengths,
          improvements: selectedCall.improvements,
          aiCoachingData: aiCoachingData,
        }}
      />
    </div>
    </>
  );
}
