import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { TrendingUp, TrendingDown, Minus, Trophy, Users, AlertTriangle, Target, Sparkles, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Calendar, Clock, User, FileText, ChevronDown, ArrowUpDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { useState, useRef, useEffect } from "react";
import { AIChatPanel } from "./AIChatPanel";
import { AICoachPanel } from "./AICoachPanel";
import { EnrichedScheduledCallCard } from "./EnrichedScheduledCallCard";
import {
  useAllScheduledCalls,
  useAllCalls,
  useAllAnalysis,
  useAllReps,
  useAllTranscripts,
  useAllInsights,
  useAllKeyMoments
} from "../../../services/hooks";
import { getAICoachingSummary } from "../../../services/aiCoachService";

export function ManagerPerformanceDashboard() {
  const [selectedCallId, setSelectedCallId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [callSortBy, setCallSortBy] = useState<"date" | "score" | "name">("date");
  const [scheduleSortBy, setScheduleSortBy] = useState<"date" | "name" | "type">("date");
  const [selectedRep1, setSelectedRep1] = useState("Sarah Johnson");
  const [selectedRep2, setSelectedRep2] = useState("Tom Martinez");

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

  // Fetch data from Supabase
  const { data: scheduledCallsData, loading: scheduledLoading } = useAllScheduledCalls();
  const { data: supabaseCalls, loading: callsLoading } = useAllCalls();
  const { data: analysisData, loading: analysisLoading } = useAllAnalysis();
  const { data: supabaseReps, loading: repsLoading } = useAllReps();
  const { data: transcriptsData } = useAllTranscripts();
  const { data: insightsData } = useAllInsights();
  const { data: momentsData } = useAllKeyMoments();

  // Debug logs
  console.log('🔍 Manager Dashboard Data:', {
    scheduledCallsData: scheduledCallsData?.length,
    supabaseCalls: supabaseCalls?.length,
    analysisData: analysisData?.length,
    supabaseReps: supabaseReps?.length,
    transcriptsData: transcriptsData?.length,
    insightsData: insightsData?.length,
    momentsData: momentsData?.length
  });

  // Helper functions (same as RepPerformanceDashboard)
  const calculateTalkRatio = (transcript: any) => {
    if (!transcript) return { rep: 50, customer: 50 };

    const text = transcript.transcript_text || '';
    const lines = text.split('\n');
    let repLines = 0;
    let customerLines = 0;

    lines.forEach(line => {
      if (line.trim().startsWith('Rep:')) repLines++;
      if (line.trim().startsWith('Customer:')) customerLines++;
    });

    const total = repLines + customerLines;
    if (total === 0) return { rep: 50, customer: 50 };

    return {
      rep: Math.round((repLines / total) * 100),
      customer: Math.round((customerLines / total) * 100)
    };
  };

  const formatTranscript = (transcript: any) => {
    if (!transcript) return "No transcript available";

    // Prefer transcript_text over segments
    if (transcript.transcript_text) {
      return transcript.transcript_text;
    }

    if (transcript.segments && Array.isArray(transcript.segments)) {
      return transcript.segments
        .map((seg: any) => `${seg.speaker}: ${seg.text}`)
        .join('\n\n');
    }

    return "No transcript available";
  };

  // Convert Supabase calls to display format
  console.log('📞 Manager - supabaseCalls:', supabaseCalls?.length, supabaseCalls);
  const teamCalls = supabaseCalls
    ? (supabaseCalls as any[]).map((call, idx) => {
        const callAnalysis = analysisData?.find((a: any) => a.call_id === call.id);
        const callTranscript = transcriptsData?.find((t: any) => t.call_id === call.id);
        const callInsights = insightsData?.filter((i: any) => i.call_id === call.id) || [];
        const callMoments = momentsData?.filter((m: any) => m.call_id === call.id) || [];
        const talkRatio = calculateTalkRatio(callTranscript);

        // Format duration from seconds to MM:SS
        const durationFormatted = call.duration_seconds
          ? `${Math.floor(call.duration_seconds / 60)}:${String(call.duration_seconds % 60).padStart(2, '0')}`
          : "00:00";

        return {
          id: idx + 1,
          dbCallId: call.id,
          repId: call.rep_id || null,
          rep: call.rep_name || "Unknown Rep",
          customer: call.customer_name || "Unknown Customer",
          company: call.company || "Unknown Company",
          industry: call.industry || "Technology",
          type: call.call_type || "Call",
          date: call.started_at
            ? new Date(call.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : "Unknown",
          time: call.started_at
            ? new Date(call.started_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
            : "Unknown",
          duration: durationFormatted,
          score: callAnalysis?.scores?.overall || 0,
          summary: callAnalysis?.coaching?.feedback || "No summary available",
          audioUrl: call.audio_url || null,
          transcript: formatTranscript(callTranscript),
          talkRatio: talkRatio,
          keyMoments: callMoments.map((moment: any) => ({
            time: moment.time || "0:00",
            label: moment.label || "Moment",
          })),
          aiInsights: callInsights.map((insight: any) => ({
            timestamp: insight.timestamp || "0:00",
            type: insight.type || "positive",
            text: insight.text || "",
          })),
        };
      })
    : [
    {
      id: 1,
      dbCallId: null,
      repId: null,
      rep: "Emma Rodriguez",
      customer: "David Kim",
      company: "FinanceHub",
      industry: "Financial Services",
      type: "Discovery",
      date: "Jan 20, 2026",
      time: "4:00 PM",
      duration: "18:00",
      score: 88,
      summary: "Strong discovery call with excellent needs analysis. Rep demonstrated active listening and set clear next steps with proposal delivery timeline.",
      audioUrl: null,
      transcript: `Rep: Hello David, this is Emma Rodriguez from FinanceHub. Thanks for scheduling this call with me.

Customer: Hi Emma, yes, I've been looking into your platform for our accounting needs.

Rep: Wonderful! Before we dive in, I'd love to understand more about your current setup. What's working well, and what's not working so well with your current accounting system?

Customer: We're using QuickBooks right now. It's okay for basic stuff, but we struggle with multi-currency transactions since we work with international clients. Also, the reporting features are pretty limited.

Rep: Got it. So multi-currency support and advanced reporting are key priorities. How many international transactions would you say you process monthly?

Customer: Probably around 30-40 transactions across five different currencies.

Rep: That makes sense. Our platform handles that seamlessly with real-time exchange rates. On the reporting side, what specific reports would be most valuable to you?

Customer: We need cash flow forecasting, P&L by department, and ideally some custom dashboards for our board meetings.

Rep: All of that is included in our Professional tier. One thing I should mention—there is a learning curve for the advanced features. Would your team be open to a training session as part of the onboarding?

Customer: That would actually be really helpful. How long does onboarding usually take?

Rep: Typically 2-3 weeks with training. I won't sugarcoat it—the first month can be an adjustment period, but our clients consistently tell us it's worth it. We'd assign you a dedicated account manager to help with the transition.

Customer: What about pricing? I saw your website lists $299/month, but we're a small team of just 8 people.

Rep: For your size and needs, the Professional plan at $299 is the right fit. I don't have flexibility on the monthly rate, but I can offer you the first month free to give your team time to get comfortable with the platform. How does that sound?

Customer: That's fair. I think this could work for us. Can you send me a proposal with the implementation timeline?

Rep: Absolutely. I'll have that to you by tomorrow morning. And just to set expectations, the proposal will include the onboarding schedule, training sessions, and a direct line to your account manager. Sound good?

Customer: Perfect. I'll review it with my CFO and get back to you by Friday.

Rep: Great! I'll also include some client references in your industry. Thanks for your time today, David.

Customer: Thanks, Emma. Talk soon!`,
      talkRatio: { rep: 42, customer: 58 },
      keyMoments: [
        { time: "1:15", label: "Discovery Phase" },
        { time: "4:30", label: "Pain Point Identified" },
        { time: "7:00", label: "Next Steps Set" },
      ],
      aiInsights: [
        {
          timestamp: "2:45",
          type: "positive",
          text: "Perfect SPIN question: 'What's the impact of this problem on your team?'",
        },
        {
          timestamp: "5:20",
          type: "positive",
          text: "Exceptional active listening - paraphrased customer's pain point accurately",
        },
      ],
    },
    {
      id: 2,
      dbCallId: null,
      repId: null,
      rep: "Sarah Johnson",
      customer: "Michael Chen",
      company: "TechSolutions",
      industry: "Technology",
      type: "Demo",
      date: "Jan 20, 2026",
      time: "10:00 AM",
      duration: "22:00",
      score: 85,
      summary: "Effective demo scheduling call with good discovery. Rep identified pain points and secured next steps with decision makers involved.",
      audioUrl: null,
      transcript: `Rep: Good morning, this is Sarah Johnson from TechSolutions. Am I speaking with Michael Chen?

Customer: Yes, that's me. Hi Sarah.

Rep: Great! Thanks for taking my call, Michael. I see you recently downloaded our whitepaper on cloud migration strategies. How's your company currently handling data storage?

Customer: We're using a mix of on-premise servers and some basic cloud storage. It's becoming a bit of a headache to manage, honestly.

Rep: I completely understand. Many of our clients were in a similar position before they switched. Can you tell me more about the specific challenges you're facing?

Customer: Well, our IT team spends a lot of time on maintenance, and we've had a couple of near-misses with data security. Plus, our costs keep climbing.

Rep: Those are exactly the pain points we help solve. Based on what you're telling me, it sounds like you have about 50-100 employees. Is that right?

Customer: Actually, we're closer to 200 now. We've grown pretty fast in the last year.

Rep: That's fantastic growth! Congratulations. With that size, you'd definitely benefit from our Enterprise plan. It includes 24/7 support, automated backups, and enterprise-grade security. May I ask, what's your timeline for making a decision on this?

Customer: We're hoping to have something in place by end of Q1. So about two months from now.

Rep: Perfect timing. Our implementation typically takes 3-4 weeks. I'd love to set up a demo for you and your IT lead next week. How does Tuesday or Wednesday look for you?

Customer: Tuesday could work. What time?

Rep: How about 2 PM EST? I'll send you a calendar invite with a custom demo link.

Customer: Sounds good, Sarah. I'll make sure our CTO joins as well.

Rep: Excellent! I'll also send over a couple of case studies from companies in your industry. Looking forward to showing you how we can solve those pain points. Have a great day, Michael!

Customer: Thanks, you too!`,
      talkRatio: { rep: 65, customer: 35 },
      keyMoments: [
        { time: "1:30", label: "Discovery Phase" },
        { time: "3:45", label: "Objection Handled" },
        { time: "6:12", label: "Demo Scheduled" },
      ],
      aiInsights: [
        {
          timestamp: "2:15",
          type: "positive",
          text: "Great open-ended question: 'What challenges are you facing with your current solution?'",
        },
        {
          timestamp: "5:48",
          type: "improvement",
          text: "Missed opportunity to create urgency - could mention limited Q1 pricing",
        },
      ],
    },
    {
      id: 3,
      dbCallId: null,
      repId: null,
      rep: "Tom Martinez",
      customer: "Jennifer Wu",
      company: "MarketPro",
      industry: "Marketing",
      type: "Outbound",
      date: "Jan 20, 2026",
      time: "2:30 PM",
      duration: "11:00",
      score: 52,
      summary: "Weak cold call with poor timing and pushy approach. Rep failed to build rapport and didn't respect prospect's time constraints. Needs coaching on permission-based selling.",
      audioUrl: null,
      transcript: `Rep: Hi, is this Jennifer?

Customer: Yes, who's calling?

Rep: This is Tom from MarketPro. I wanted to talk to you about our marketing automation software.

Customer: I'm actually pretty busy right now. Can you send me an email instead?

Rep: I understand you're busy, but this will only take a minute. We have a special promotion running this week—

Customer: Look, I really don't have time for a sales pitch right now.

Rep: I get it, but our software has helped hundreds of companies increase their ROI by up to 300%. Don't you want to hear how?

Customer: Not really. We already use a marketing platform and we're happy with it.

Rep: But have you considered the features we offer? We have AI-powered email campaigns, social media scheduling, and analytics dashboards. What platform are you using now?

Customer: I don't think I need to share that. I'm sorry, but I really need to go.

Rep: Wait, wait. What if I could get you a 20% discount? Our manager approved it for this week only.

Customer: I appreciate the offer, but I'm not interested. Please remove me from your call list.

Rep: Are you sure? This is a limited-time offer and—

Customer: Yes, I'm sure. Goodbye.`,
      talkRatio: { rep: 78, customer: 22 },
      keyMoments: [
        { time: "0:45", label: "Pitch Started" },
        { time: "3:10", label: "Objection Raised" },
      ],
      aiInsights: [
        {
          timestamp: "1:20",
          type: "improvement",
          text: "Too many leading questions - ask more open-ended discovery questions",
        },
        {
          timestamp: "3:15",
          type: "negative",
          text: "Failed to qualify budget - critical information missing",
        },
      ],
    },
  ];

  // Calculate team metrics and rankings from real data
  const calculateTeamMetrics = () => {
    if (!supabaseReps || !teamCalls || teamCalls.length === 0) {
      return {
        teamRankings: [],
        repsData: {},
        teamAvgScore: 0
      };
    }

    // Group calls by rep
    const callsByRep: Record<string, any[]> = {};
    teamCalls.forEach(call => {
      if (!callsByRep[call.rep]) {
        callsByRep[call.rep] = [];
      }
      callsByRep[call.rep].push(call);
    });

    // Calculate metrics for each rep
    const repMetrics = Object.entries(callsByRep).map(([repName, calls]) => {
      const totalScore = calls.reduce((sum, call) => sum + call.score, 0);
      const avgScore = Math.round(totalScore / calls.length);

      // Get latest call for this rep
      const latestCall = calls[calls.length - 1];

      // Calculate dimensions average (from analysis data)
      const repAnalyses = calls
        .map(call => analysisData?.find((a: any) => a.call_id === (supabaseCalls as any[]).find(sc => sc.customer_name === call.customer)?.id))
        .filter(a => a && a.scores);

      const dimensions = {
        discovery: 0,
        qualification: 0,
        objectionHandling: 0,
        closing: 0,
        rapport: 0
      };

      if (repAnalyses.length > 0) {
        repAnalyses.forEach((analysis: any) => {
          if (analysis.scores) {
            // Scores are directly in scores object, not in scores.dimensions
            dimensions.discovery += analysis.scores.discovery || 0;
            dimensions.qualification += analysis.scores.qualification || 0;
            dimensions.objectionHandling += analysis.scores.objection_handling || 0;
            dimensions.closing += analysis.scores.closing || 0;
            dimensions.rapport += analysis.scores.rapport_building || 0;
          }
        });

        Object.keys(dimensions).forEach(key => {
          dimensions[key as keyof typeof dimensions] = Math.round(
            dimensions[key as keyof typeof dimensions] / repAnalyses.length
          );
        });
      }

      // Get coaching data from latest analysis
      const latestAnalysis = repAnalyses[repAnalyses.length - 1];
      const strengths = latestAnalysis?.coaching?.strengths || ["Professional communication"];
      const improvements = latestAnalysis?.coaching?.improvement_areas || ["Continue improving"];

      return {
        name: repName,
        avgScore,
        latestCall,
        calls,
        dimensions,
        strengths,
        improvements
      };
    });

    // Sort by average score
    repMetrics.sort((a, b) => b.avgScore - a.avgScore);

    // Calculate team average
    const teamAvgScore = Math.round(
      repMetrics.reduce((sum, rep) => sum + rep.avgScore, 0) / repMetrics.length
    );

    // Build team rankings
    const teamRankings = repMetrics.map((rep, idx) => ({
      rank: idx + 1,
      name: rep.name,
      customer: rep.latestCall.customer,
      type: rep.latestCall.type,
      score: rep.avgScore,
      trend: rep.avgScore >= teamAvgScore ? "up" : "down",
      trendValue: rep.avgScore - teamAvgScore,
      vsTeamAvg: rep.avgScore - teamAvgScore,
      chartData: rep.calls.map((call, callIdx) => ({
        call: callIdx + 1,
        score: call.score
      }))
    }));

    // Build reps data object
    const repsDataObj: Record<string, any> = {};
    repMetrics.forEach(rep => {
      repsDataObj[rep.name] = {
        name: rep.name,
        score: rep.avgScore,
        dimensions: rep.dimensions,
        strengths: rep.strengths,
        improvements: rep.improvements
      };
    });

    return {
      teamRankings,
      repsData: repsDataObj,
      teamAvgScore
    };
  };

  const { teamRankings, repsData, teamAvgScore } = calculateTeamMetrics();

  // Calculate team-wide metrics
  const calculateDashboardMetrics = () => {
    if (!teamCalls || teamCalls.length === 0) {
      return {
        totalCalls: 0,
        teamWinRate: 0,
        atRiskReps: 0,
        scheduledToday: 0
      };
    }

    // Total calls
    const totalCalls = teamCalls.length;

    // Win rate
    const successfulOutcomes = teamCalls.filter(call => {
      const outcome = call.type?.toLowerCase() || '';
      return outcome.includes('demo') || outcome.includes('discovery') || outcome.includes('proposal');
    }).length;
    const teamWinRate = Math.round((successfulOutcomes / totalCalls) * 100);

    // At-risk reps (score < 60)
    const atRiskReps = Object.values(repsData).filter((rep: any) => rep.score < 60).length;

    // Scheduled today
    const scheduledToday = teamScheduledCalls.length;

    return {
      totalCalls,
      teamWinRate,
      atRiskReps,
      scheduledToday
    };
  };

  // Get currently selected reps (with fallback to first available reps)
  const availableReps = Object.keys(repsData);
  const rep1Data = repsData[selectedRep1] || repsData[availableReps[0]] || {
    name: "No data",
    score: 0,
    dimensions: { discovery: 0, qualification: 0, objectionHandling: 0, closing: 0, rapport: 0 },
    strengths: [],
    improvements: []
  };
  const rep2Data = repsData[selectedRep2] || repsData[availableReps[1]] || {
    name: "No data",
    score: 0,
    dimensions: { discovery: 0, qualification: 0, objectionHandling: 0, closing: 0, rapport: 0 },
    strengths: [],
    improvements: []
  };

  // Build comparison data
  const comparisons = [
    { name: "Discovery", rep1: rep1Data.dimensions.discovery, rep2: rep2Data.dimensions.discovery },
    { name: "Qualification", rep1: rep1Data.dimensions.qualification, rep2: rep2Data.dimensions.qualification },
    { name: "Objection Handling", rep1: rep1Data.dimensions.objectionHandling, rep2: rep2Data.dimensions.objectionHandling },
    { name: "Closing", rep1: rep1Data.dimensions.closing, rep2: rep2Data.dimensions.closing },
    { name: "Rapport", rep1: rep1Data.dimensions.rapport, rep2: rep2Data.dimensions.rapport },
  ];

  const teamAvgTrend = [
    { week: "Week 1", avg: 75 },
    { week: "Week 2", avg: 77 },
    { week: "Week 3", avg: 76 },
    { week: "Week 4", avg: 78 },
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

  const getTrendIcon = (trend: string, value: number) => {
    if (trend === "up") {
      return (
        <div className="flex items-center gap-1 text-emerald-600">
          <TrendingUp className="w-4 h-4" />
          <span className="text-sm font-medium">+{value}</span>
        </div>
      );
    }
    if (trend === "down") {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <TrendingDown className="w-4 h-4" />
          <span className="text-sm font-medium">{value}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-gray-600">
        <Minus className="w-4 h-4" />
        <span className="text-sm font-medium">0</span>
      </div>
    );
  };

  const getRankBadge = (rank: number) => {
    const colors = {
      1: "bg-gradient-to-br from-yellow-400 to-orange-500",
      2: "bg-gradient-to-br from-gray-300 to-gray-500",
      3: "bg-gradient-to-br from-orange-400 to-orange-600",
    };
    return colors[rank as keyof typeof colors] || "bg-gradient-to-br from-purple-500 to-indigo-600";
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Convert duration string (MM:SS) to seconds
  const parseDuration = (duration: string): number => {
    const [mins, secs] = duration.split(":").map(Number);
    return mins * 60 + secs;
  };

  // Audio player handlers
  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
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

  const selectedCall = teamCalls.find((c) => c.id === selectedCallId);
  const callDuration = selectedCall ? parseDuration(selectedCall.duration) : 0;

  // Sort team calls based on selected criteria
  const sortedTeamCalls = [...teamCalls].sort((a, b) => {
    if (callSortBy === "score") {
      return b.score - a.score; // Highest score first
    } else if (callSortBy === "name") {
      return a.customer.localeCompare(b.customer);
    } else { // date
      const timeA = a.time.includes("AM") || a.time.includes("PM") 
        ? parseInt(a.time) + (a.time.includes("PM") && !a.time.startsWith("12") ? 12 : 0)
        : parseInt(a.time);
      const timeB = b.time.includes("AM") || b.time.includes("PM")
        ? parseInt(b.time) + (b.time.includes("PM") && !b.time.startsWith("12") ? 12 : 0)
        : parseInt(b.time);
      return timeB - timeA; // Most recent first
    }
  });

  // Transform scheduled calls from Supabase to display format
  console.log('📅 Manager - scheduledCallsData:', scheduledCallsData?.length, scheduledCallsData);
  const teamScheduledCalls = scheduledCallsData
    ? (scheduledCallsData as any[]).map((call, idx) => {
        const scheduledDate = call.scheduled_date ? new Date(call.scheduled_date) : null;

        // Get rep name from supabaseReps
        const rep = (supabaseReps as any[])?.find(r => r.id === call.rep_id);

        return {
          id: idx + 1,
          rep: rep?.name || "Unknown Rep",
          customer: call.customer_name || "Unknown",
          company: call.company || "Unknown Company",
          type: call.call_type || "Call",
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
        };
      })
    : [
    {
      id: 1,
      rep: "Emma Rodriguez",
      customer: "Sarah Williams",
      company: "FinTech Pro",
      type: "Discovery",
      time: "9:00 AM",
      duration: "30 min",
      priority: "high",
    },
    {
      id: 2,
      rep: "Sarah Johnson",
      customer: "Robert Anderson",
      company: "TechFlow Inc.",
      type: "Discovery",
      time: "10:00 AM",
      duration: "30 min",
      priority: "high",
    },
    {
      id: 3,
      rep: "Tom Martinez",
      customer: "Michelle Lee",
      company: "Growth Labs",
      type: "Demo",
      time: "11:30 AM",
      duration: "45 min",
      priority: "medium",
    },
    {
      id: 4,
      rep: "Emma Rodriguez",
      customer: "Carlos Rivera",
      company: "Innovate Systems",
      type: "Follow-up",
      time: "1:00 PM",
      duration: "20 min",
      priority: "high",
    },
    {
      id: 5,
      rep: "Sarah Johnson",
      customer: "Lisa Martinez",
      company: "CloudNine Solutions",
      type: "Demo",
      time: "2:00 PM",
      duration: "45 min",
      priority: "medium",
    },
    {
      id: 6,
      rep: "Tom Martinez",
      customer: "James Chen",
      company: "SecureData Inc.",
      type: "Follow-up",
      time: "3:30 PM",
      duration: "20 min",
      priority: "low",
    },
  ];

  // Calculate dashboard metrics after teamScheduledCalls is defined
  const dashboardMetrics = calculateDashboardMetrics();

  // Sort scheduled calls based on selected criteria
  const sortedScheduledCalls = [...teamScheduledCalls].sort((a, b) => {
    if (scheduleSortBy === "name") {
      return a.customer.localeCompare(b.customer);
    } else if (scheduleSortBy === "type") {
      return a.type.localeCompare(b.type);
    } else { // date
      const timeA = parseInt(a.time);
      const timeB = parseInt(b.time);
      return timeA - timeB; // Earliest first
    }
  });

  return (
    <div className="min-h-screen bg-[#0a1628]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1e3a8a] to-[#1e40af] text-white px-8 py-8 shadow-2xl border-b border-cyan-500/20">
        <div className="max-w-[1600px] mx-auto">
          <h1 className="text-3xl font-bold mb-2 text-cyan-400">Multiplicity Manager Dashboard</h1>
          <p className="text-cyan-200">Team Performance & Coaching Overview</p>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <Card className="p-6 border border-cyan-500/30 bg-[#1e293b] shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">Team Avg Score</p>
                <p className="text-3xl font-bold text-white">{teamAvgScore || 0}</p>
                <div className="flex items-center gap-1 mt-2 text-gray-400">
                  <span className="text-sm font-medium">From {teamCalls.length} calls</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border border-cyan-500/30 bg-[#1e293b] shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">Total Calls</p>
                <p className="text-3xl font-bold text-white">{dashboardMetrics.totalCalls}</p>
                <p className="text-sm text-gray-400 mt-2">{Object.keys(repsData).length} reps</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border border-cyan-500/30 bg-[#1e293b] shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">Team Win Rate</p>
                <p className="text-3xl font-bold text-white">{dashboardMetrics.teamWinRate}%</p>
                <div className="flex items-center gap-1 mt-2 text-gray-400">
                  <span className="text-sm font-medium">From {teamCalls.length} calls</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <Trophy className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border border-cyan-500/30 bg-[#1e293b] shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">At-Risk Reps</p>
                <p className={`text-3xl font-bold ${dashboardMetrics.atRiskReps > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {dashboardMetrics.atRiskReps}
                </p>
                <p className="text-sm text-gray-400 mt-2">{dashboardMetrics.scheduledToday} scheduled today</p>
              </div>
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-12 gap-6">
          {/* Team Performance Rankings */}
          <div className="col-span-7">
            <h2 className="text-lg font-semibold text-cyan-400 mb-4">Team Performance Rankings</h2>
            <div className="space-y-4">
              {teamRankings.map((member) => (
                <Card
                  key={member.rank}
                  className={`p-6 border-2 shadow-lg ${getScoreBg(member.score)}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Rank Badge */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${getRankBadge(member.rank)} shadow-md`}>
                      {member.rank}
                    </div>

                    {/* Member Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{member.name}</h3>
                          <p className="text-sm text-gray-600">Latest: {member.customer} • {member.type}</p>
                        </div>
                        <div className="text-right">
                          <div className={`text-4xl font-bold ${getScoreColor(member.score)}`}>
                            {member.score}
                          </div>
                          <span className="text-xs text-gray-500">/100</span>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="flex items-center gap-6 mb-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 font-medium">Trend:</span>
                          {getTrendIcon(member.trend, member.trendValue)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 font-medium">vs Team Avg:</span>
                          <Badge className={member.vsTeamAvg > 0 ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-red-100 text-red-700 border-red-300"}>
                            {member.vsTeamAvg > 0 ? "+" : ""}{member.vsTeamAvg}
                          </Badge>
                        </div>
                      </div>

                      {/* Trend Chart */}
                      <div className="bg-white/70 rounded-lg p-3 border border-gray-200">
                        <ResponsiveContainer width="100%" height={60}>
                          <LineChart data={member.chartData}>
                            <XAxis dataKey="call" hide />
                            <YAxis hide domain={[0, 100]} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "white",
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="score"
                              stroke={member.score >= 80 ? "#10b981" : member.score >= 60 ? "#f59e0b" : "#ef4444"}
                              strokeWidth={2}
                              dot={{ fill: member.score >= 80 ? "#10b981" : member.score >= 60 ? "#f59e0b" : "#ef4444", r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                        <p className="text-xs text-center text-gray-500 mt-1">Last 4 calls</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Team Trend */}
            <Card className="p-6 border border-cyan-500/30 bg-[#1e293b] shadow-lg shadow-cyan-500/10 mt-6">
              <h3 className="text-sm font-semibold text-white mb-4">Team Average Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={teamAvgTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#9ca3af' }} stroke="#475569" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#9ca3af' }} stroke="#475569" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #06b6d4",
                      borderRadius: "8px",
                      color: "#fff"
                    }}
                  />
                  <Line type="monotone" dataKey="avg" stroke="#06b6d4" strokeWidth={3} dot={{ fill: "#06b6d4", r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Rep Comparison */}
          <div className="col-span-5">
            <h2 className="text-lg font-semibold text-cyan-400 mb-4">Rep Comparison</h2>
            <Card className="p-6 border border-cyan-500/30 bg-[#1e293b] shadow-lg shadow-cyan-500/10">
              {/* Rep Selectors */}
              <div className="mb-6">
                <div className="grid grid-cols-2 gap-4">
                  {/* Rep 1 Selector */}
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Select Rep 1:</p>
                    <div className="space-y-2">
                      {availableReps.map((repName) => (
                        <button
                          key={repName}
                          onClick={() => setSelectedRep1(repName)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedRep1 === repName
                              ? "bg-cyan-500 text-white shadow-md"
                              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          }`}
                        >
                          {repName}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rep 2 Selector */}
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Select Rep 2:</p>
                    <div className="space-y-2">
                      {availableReps.map((repName) => (
                        <button
                          key={repName}
                          onClick={() => setSelectedRep2(repName)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedRep2 === repName
                              ? "bg-cyan-500 text-white shadow-md"
                              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          }`}
                        >
                          {repName}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Winner Banner */}
              <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg p-4 mb-6 text-center shadow-lg shadow-cyan-500/20">
                <div className="flex items-center justify-center gap-2">
                  <Trophy className="w-6 h-6" />
                  <span className="text-xl font-bold">{rep1Data.name} by {rep1Data.score - rep2Data.score} points</span>
                </div>
              </div>

              {/* Scores */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className={`p-4 rounded-lg border-2 text-center ${getScoreBg(rep1Data.score)}`}>
                  <p className="text-sm font-medium text-gray-600 mb-1">{rep1Data.name}</p>
                  <div className={`text-4xl font-bold ${getScoreColor(rep1Data.score)}`}>{rep1Data.score}</div>
                  <span className="text-xs text-gray-500">/100</span>
                </div>
                <div className={`p-4 rounded-lg border-2 text-center ${getScoreBg(rep2Data.score)}`}>
                  <p className="text-sm font-medium text-gray-600 mb-1">{rep2Data.name}</p>
                  <div className={`text-4xl font-bold ${getScoreColor(rep2Data.score)}`}>{rep2Data.score}</div>
                  <span className="text-xs text-gray-500">/100</span>
                </div>
              </div>

              {/* Dimension Breakdown */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-white mb-3">Dimension Breakdown</h4>
                <div className="space-y-3">
                  {comparisons.map((comp, index) => (
                    <div key={index} className="border-b border-gray-700 pb-3 last:border-0">
                      <p className="text-xs font-medium text-gray-400 mb-2">{comp.name}</p>
                      <div className="grid grid-cols-3 gap-2 items-center">
                        <div className={`text-center p-2 rounded ${comp.rep1 > comp.rep2 ? "bg-cyan-500/20 border border-cyan-500/40" : "bg-gray-700/50"}`}>
                          <div className={`text-lg font-bold ${comp.rep1 > comp.rep2 ? "text-cyan-300" : "text-gray-400"}`}>
                            {comp.rep1}
                          </div>
                        </div>
                        <div className="text-center">
                          <Badge className="bg-cyan-500/30 text-cyan-200 text-xs border border-cyan-500/40">+{comp.rep1 - comp.rep2}</Badge>
                        </div>
                        <div className={`text-center p-2 rounded ${comp.rep2 > comp.rep1 ? "bg-cyan-500/20 border border-cyan-500/40" : "bg-gray-700/50"}`}>
                          <div className={`text-lg font-bold ${comp.rep2 > comp.rep1 ? "text-cyan-300" : "text-gray-400"}`}>
                            {comp.rep2}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Side by Side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <h5 className="text-xs font-semibold text-white mb-2">{rep1Data.name}</h5>
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-2 mb-2">
                    <p className="text-xs font-medium text-emerald-300 mb-1">Strengths:</p>
                    {rep1Data.strengths.map((s, i) => (
                      <p key={i} className="text-xs text-gray-300">• {s}</p>
                    ))}
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded p-2">
                    <p className="text-xs font-medium text-amber-300 mb-1">Improve:</p>
                    {rep1Data.improvements.map((s, i) => (
                      <p key={i} className="text-xs text-gray-300">• {s}</p>
                    ))}
                  </div>
                </div>
                <div>
                  <h5 className="text-xs font-semibold text-white mb-2">{rep2Data.name}</h5>
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-2 mb-2">
                    <p className="text-xs font-medium text-emerald-300 mb-1">Strengths:</p>
                    {rep2Data.strengths.map((s, i) => (
                      <p key={i} className="text-xs text-gray-300">• {s}</p>
                    ))}
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded p-2">
                    <p className="text-xs font-medium text-amber-300 mb-1">Improve:</p>
                    {rep2Data.improvements.slice(0, 2).map((s, i) => (
                      <p key={i} className="text-xs text-gray-300">• {s}</p>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Team Insights */}
            <Card className="p-6 border border-cyan-500/40 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 shadow-lg shadow-cyan-500/10 mt-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">Team Insights</h4>
                  <ul className="space-y-2 text-sm text-gray-200">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>Champion identification is strongest team skill (avg 88)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>Economic Buyer identification needs attention (avg 45)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 font-bold">•</span>
                      <span>Consider Emma's discovery techniques for team training</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Team Call Recordings - Full Width Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-cyan-400">Team Call Recordings</h2>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-gray-400" />
              <select
                value={callSortBy}
                onChange={(e) => setCallSortBy(e.target.value as "date" | "score" | "name")}
                className="bg-[#1e293b] border border-cyan-500/30 text-cyan-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-cyan-500"
              >
                <option value="date">By Date</option>
                <option value="score">By Score</option>
                <option value="name">By Name</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-12 gap-6">
            {/* Calls List */}
            <div className="col-span-4">
              <div className="space-y-2">
                {sortedTeamCalls.map((call) => (
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
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-cyan-400 font-medium">
                        👤 {call.rep}
                      </p>
                      <div className={`text-lg font-bold ${getScoreColor(call.score)}`}>
                        {call.score}<span className="text-xs text-gray-500 ml-0.5">/100</span>
                      </div>
                    </div>

                    {/* Customer Name */}
                    <p className="text-xs text-gray-300 mb-1">
                      Customer: {call.customer}
                    </p>

                    {/* Date, Time, Duration */}
                    <p className="text-xs text-gray-500">
                      {call.date} • {call.time} • Duration: {call.duration}
                    </p>
                  </Card>
                ))}
              </div>
            </div>

            {/* Call Player & Details */}
            <div className="col-span-8">
              {selectedCall ? (
                <Card className="p-6 border border-cyan-500/30 bg-[#1e293b] shadow-lg shadow-cyan-500/10">
                  {/* Score & Summary */}
                  <div className="flex items-start gap-6 pb-6 border-b border-gray-700">
                    <div className={`w-24 h-24 rounded-2xl flex items-center justify-center border-4 ${getScoreBg(selectedCall.score)} shadow-lg`}>
                      <div className="text-center">
                        <div className={`text-4xl font-bold ${getScoreColor(selectedCall.score)}`}>
                          {selectedCall.score}
                        </div>
                        <div className="text-xs text-gray-400 font-medium">/100</div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm font-semibold text-cyan-400">Rep:</span>
                        <span className="text-sm text-white">{selectedCall.rep}</span>
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
                  <div className="mb-4">
                    {/* Hidden audio element - always render to maintain ref */}
                    <audio
                      ref={audioRef}
                      src={selectedCall.audioUrl || ''}
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
                    />

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
                          className="bg-gray-700 hover:bg-gray-600 text-white border-0"
                        >
                          <SkipBack className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={handlePlayPause}
                          size="sm"
                          className="bg-cyan-500 hover:bg-cyan-600 text-white border-0 w-10 h-10"
                        >
                          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                        </Button>
                        <Button
                          onClick={handleSkipForward}
                          size="sm"
                          className="bg-gray-700 hover:bg-gray-600 text-white border-0"
                        >
                          <SkipForward className="w-4 h-4" />
                        </Button>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-cyan-400 font-medium">{formatTime(currentTime)}</span>
                            <input
                              type="range"
                              min="0"
                              max={duration || callDuration}
                              value={currentTime}
                              onChange={handleSeek}
                              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                            />
                            <span className="text-sm text-gray-400">{formatTime(duration || callDuration)}</span>
                          </div>
                        </div>
                        <button
                          onClick={handleMuteToggle}
                          className="hover:bg-gray-700 p-2 rounded transition-colors"
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
                          <Badge key={idx} variant="outline" className="text-xs border-cyan-500/40 text-cyan-300">
                            {moment.time} - {moment.label}
                          </Badge>
                        ))}
                      </div>

                      {/* Talk Ratio */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-400">Talk Ratio</span>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-cyan-400">Rep {selectedCall.talkRatio.rep}%</span>
                            <span className="text-gray-500">•</span>
                            <span className="text-blue-400">Customer {selectedCall.talkRatio.customer}%</span>
                          </div>
                        </div>
                        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden flex">
                          <div 
                            className="bg-cyan-500 h-full" 
                            style={{ width: `${selectedCall.talkRatio.rep}%` }}
                          />
                          <div 
                            className="bg-blue-500 h-full" 
                            style={{ width: `${selectedCall.talkRatio.customer}%` }}
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
                          <ChevronDown className={`w-4 h-4 transition-transform ${showTranscript ? 'rotate-180' : ''}`} />
                        </Button>
                      </div>

                      {/* Transcript Content */}
                      {showTranscript && (
                        <div className="mt-4 bg-gray-900/50 rounded-lg p-4 border border-gray-600 max-h-96 overflow-y-auto">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Full Conversation</span>
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

                  {/* AI Insights */}
                  <Card className="p-4 border border-cyan-500/40 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 shadow-lg shadow-cyan-500/10">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-sm mb-1">AI Real-Time Insights</h4>
                        <p className="text-xs text-gray-400">Key coaching moments identified during the call</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {selectedCall.aiInsights.map((insight, idx) => (
                        <div 
                          key={idx} 
                          className={`p-2 rounded-lg border-l-4 text-xs ${
                            insight.type === 'positive' 
                              ? 'bg-emerald-500/10 border-emerald-500' 
                              : insight.type === 'improvement'
                              ? 'bg-amber-500/10 border-amber-500'
                              : 'bg-red-500/10 border-red-500'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <Badge variant="outline" className="text-xs border-cyan-500/40 text-cyan-300">
                              {insight.timestamp}
                            </Badge>
                            <p className="text-gray-200 flex-1 text-xs">{insight.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </Card>
              ) : (
                <Card className="p-12 border border-cyan-500/20 bg-[#1e293b] shadow-lg text-center">
                  <div className="text-gray-500">
                    <Play className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <p className="text-lg font-medium text-gray-400">Select a call to listen and review</p>
                    <p className="text-sm text-gray-500 mt-2">Click any call from the list to start</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Team Scheduled Calls */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-cyan-400">Today's Team Schedule</h2>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3 h-3 text-gray-400" />
              <select
                value={scheduleSortBy}
                onChange={(e) => setScheduleSortBy(e.target.value as "date" | "name" | "type")}
                className="bg-[#1e293b] border border-cyan-500/30 text-cyan-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-cyan-500"
              >
                <option value="date">By Time</option>
                <option value="name">By Name</option>
                <option value="type">By Topic</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {sortedScheduledCalls.map((call) => (
              <Card
                key={call.id}
                className="p-4 border border-cyan-500/30 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 hover:shadow-lg hover:shadow-purple-500/20 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-3 h-3 text-cyan-400" />
                      <p className="font-semibold text-white text-sm">{call.rep}</p>
                      {call.priority === "high" && (
                        <Badge className="bg-red-500/20 text-red-300 border border-red-500/40 text-xs">
                          High Priority
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-300 mb-1">{call.customer} • {call.company}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{call.time}</span>
                      </div>
                      <span>•</span>
                      <Badge variant="outline" className="text-xs border-cyan-500/40 text-cyan-300">
                        {call.type}
                      </Badge>
                      <span>•</span>
                      <span>{call.duration}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

      </div>

      {/* AI Chat Panel */}
      <AIChatPanel
        role="manager"
        context={{
          teamData: teamRankings.map(rep => ({ name: rep.name, score: rep.score, trend: rep.trend })),
        }}
      />
    </div>
  );
}