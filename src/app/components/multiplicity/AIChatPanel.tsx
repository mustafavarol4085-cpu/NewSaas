import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Sparkles, X, Minimize2, Maximize2, Send, Lightbulb } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { streamChatMessage, type ChatMessage } from "../../../services/openaiService";
import { searchKBBySimilarity } from "../../../services/kbService";
import type { KBChunk } from "../../../services/types";

interface Message {
  role: "user" | "ai";
  content: string;
  timestamp: Date;
}

interface AIChatPanelProps {
  role: "rep" | "manager";
  context: {
    userName?: string;
    overallScore?: number;
    recentCalls?: Array<{ customer: string; score: number; type: string }>;
    teamData?: Array<{ name: string; score: number; trend: string }>;
    strengths?: string[];
    improvements?: string[];
    aiCoachingData?: {
      masterReport: any;
      agentAnalysis: any[];
      objections: any[];
      questions: any[];
    } | null;
  };
}

export function AIChatPanel({ role, context }: AIChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      content: role === "rep" 
        ? `Hello! I'm your AI Sales Coach. I've analyzed your recent calls and I'm here to help you improve. What would you like to work on today?`
        : `Hello! I'm your Team Intelligence Assistant. I have insights on all your reps' performance. How can I help you coach your team today?`,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Suggested questions based on role
  const suggestedQuestions = role === "rep" 
    ? [
        "How can I improve my closing technique?",
        "What did I miss in my last call?",
        "Give me tips for my next discovery call",
        "How's my talk ratio?",
      ]
    : [
        "Which rep needs coaching this week?",
        "What should I focus on in team training?",
        "Show me Tom's biggest challenges",
        "What are Sarah's best practices?",
      ];

  // Smart AI response generator
  const generateAIResponse = (userMessage: string): string => {
    const lowerMsg = userMessage.toLowerCase();
    const aiData = context.aiCoachingData;

    if (role === "rep") {
      // Rep-specific responses using REAL AI coaching data
      if (lowerMsg.includes("objection") || lowerMsg.includes("price") || lowerMsg.includes("expensive")) {
        if (aiData?.objections && aiData.objections.length > 0) {
          const priceObjection = aiData.objections.find((o: any) => o.category === 'price') || aiData.objections[0];
          return `I analyzed your objection handling. Here's what I found:

🚨 **Objection at ${priceObjection.timestamp}:**
Customer said: "${priceObjection.customer_said}"

📊 **Your Response Score:** ${priceObjection.response_score}/10
${priceObjection.response_analysis ? `\n💡 **Analysis:** ${priceObjection.response_analysis}` : ''}

**Better Responses:**
${priceObjection.suggested_responses?.map((r: string, i: number) => `${i + 1}. "${r}"`).join('\n') || ''}

${priceObjection.was_resolved ? '✅ You resolved it, but could be stronger!' : '❌ This objection wasn\'t fully resolved - practice these responses!'}

Want me to help you practice objection handling?`;
        }
      }

      if (lowerMsg.includes("question") || lowerMsg.includes("discovery")) {
        if (aiData?.questions && aiData.questions.length > 0) {
          const goodQuestions = aiData.questions.filter((q: any) => q.quality_score >= 7);
          const badQuestions = aiData.questions.filter((q: any) => q.quality_score < 7);

          return `📊 **Your Question Quality Analysis:**

✅ **Strong Questions (${goodQuestions.length}):**
${goodQuestions.map((q: any) => `• [${q.timestamp}] "${q.question_text}" (${q.quality_score}/10)\n  ${q.why_good || ''}`).join('\n\n')}

${badQuestions.length > 0 ? `\n⚠️ **Questions to Improve (${badQuestions.length}):**
${badQuestions.map((q: any) => `• [${q.timestamp}] "${q.question_text}" (${q.quality_score}/10)\n  ❌ ${q.why_bad || ''}\n  ✅ Better: "${q.better_alternative || ''}"`).join('\n\n')}` : ''}

🎯 **Focus:** Ask more ${goodQuestions[0]?.question_type || 'open-ended'} questions!`;
        }
      }

      if (lowerMsg.includes("last call") || lowerMsg.includes("recent") || lowerMsg.includes("latest") || lowerMsg.includes("score")) {
        if (aiData?.masterReport) {
          const report = aiData.masterReport;
          return `📊 **Your Latest Call Analysis:**

⭐ **Overall Score:** ${report.overall_score}/100

**Top Strengths:**
${report.top_strengths?.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n') || ''}

**Areas to Improve:**
${report.top_improvements?.map((imp: string, i: number) => `${i + 1}. ${imp}`).join('\n') || ''}

🎯 **Priority Focus:** ${report.priority_coaching_focus}

**Agent Scores:**
${Object.entries(report.agent_scores || {}).map(([key, score]) => `• ${key.replace(/_/g, ' ')}: ${score}/100`).join('\n')}

Want specific tips on any of these areas?`;
        }

        const lastCall = context.recentCalls?.[0];
        return lastCall
          ? `Let me break down your call with ${lastCall.customer}:

📞 **Call Type:** ${lastCall.type}
⭐ **Score:** ${lastCall.score}/100

**Key Insights:**
${context.strengths?.slice(0, 2).map(s => `✅ ${s}`).join('\n') || ''}

**What to improve:**
${context.improvements?.slice(0, 2).map(imp => `⚠️ ${imp}`).join('\n') || ''}

Want me to create a practice script for your next call?`
          : "I need more information about which call you're referring to. Can you specify the customer name or call type?";
      }

      if (lowerMsg.includes("discovery") || lowerMsg.includes("questions")) {
        return `Excellent! Discovery is crucial. Here's your personalized discovery framework:

🎯 **Your Discovery Strengths:**
${context.strengths?.slice(0, 2).map(s => `• ${s}`).join('\n') || "• Building rapport naturally"}

**SPIN Framework for your next call:**

1️⃣ **Situation Questions** (2-3 max)
   "Tell me about your current process for..."
   "How does your team currently handle..."

2️⃣ **Problem Questions** (dig deep!)
   "What challenges are you facing with that?"
   "How is this impacting your team's productivity?"

3️⃣ **Implication Questions** (build urgency)
   "What happens if this problem isn't solved?"
   "How much is this costing you monthly?"

4️⃣ **Need-Payoff Questions** (get them selling themselves)
   "How would it help if you could eliminate this issue?"
   "What would that mean for your team?"

🎬 **Try this in your next call and let me know how it goes!**`;
      }

      if (lowerMsg.includes("talk ratio") || lowerMsg.includes("listening")) {
        return `Talk ratio analysis for your recent calls:

📊 **Your average:** 62% you / 38% customer
🎯 **Best practice:** 40% you / 60% customer

**Why it matters:**
The best sales reps talk LESS. When customers talk more, they:
• Share more pain points (more ammo for you!)
• Feel heard and understood
• Convince themselves to buy

**Quick fixes:**
1. After asking a question, COUNT TO 3 before speaking again
2. Use "Tell me more about that..." to encourage elaboration
3. Replace statements with questions
   ❌ "Our solution handles that"
   ✅ "How are you currently handling that?"

**Practice drill:** In your next call, set a timer and track your ratio. Aim for 45/55 as a first goal!`;
      }

      // Generic helpful response
      return `I'm here to help you improve! I can assist with:

💬 **Call Analysis** - Review specific calls and get detailed feedback
🎯 **Skill Development** - Improve discovery, closing, objection handling
📊 **Performance Insights** - Understand your strengths and areas to work on
🎬 **Practice Scripts** - Get ready for your next call

Your current stats:
• Overall Score: ${context.overallScore || 85}/100
• Recent Calls: ${context.recentCalls?.length || 3} analyzed
• Top Strength: ${context.strengths?.[0] || "Building rapport"}

What specific area would you like to focus on?`;
    } else {
      // Manager-specific responses
      if (lowerMsg.includes("tom")) {
        return `**Tom Martinez - Coaching Plan**

📉 **Current Status:** Needs Immediate Attention
⭐ **Overall Score:** 52/100 (26 points below team avg)

**Root Cause Analysis:**
• Discovery questioning: 45/100 (critical weakness)
• Qualification: 38/100 (missing BANT framework)
• Objection handling: 55/100 (too defensive)
• Rapport: 80/100 (his strength - leverage this!)

**Recommended Actions:**

1️⃣ **This Week:** One-on-one call review session
   • Listen to his Jennifer Wu call together
   • Pause at key moments and ask "What else could you ask here?"

2️⃣ **Shadow Emma Rodriguez**
   • Emma's discovery score: 92/100
   • Have Tom observe her David Kim call
   • Debrief: What did Emma do differently?

3️⃣ **Role-Play Practice** (30 min sessions)
   • You play difficult prospect
   • Focus on open-ended questions
   • Record and review together

4️⃣ **Set Clear Goals:**
   • Improve discovery score to 60+ within 2 weeks
   • Reduce talk ratio from 78% to 50%

**Expected Timeline:** 4-6 weeks to see improvement

Want me to create a detailed 30-day coaching roadmap for Tom?`;
      }

      if (lowerMsg.includes("sarah") && lowerMsg.includes("best")) {
        return `**Sarah Johnson - Best Practices to Share**

⭐ **Sarah's Score:** 85/100 (Top 10% performer)

**What Makes Sarah Excellent:**

1️⃣ **Objection Handling (90/100)**
   • Never gets defensive
   • Uses "Feel, Felt, Found" technique
   • Example: "I understand how you feel. Many clients felt the same way initially. What they found was..."

2️⃣ **Product Knowledge**
   • Speaks with confidence and authority
   • Ties features directly to customer pain points
   • Never says "I'll get back to you"

3️⃣ **Discovery Questions**
   • Uses SPIN framework consistently
   • Asks follow-up questions that dig deeper
   • Listens more than she talks (45/55 ratio)

**How to Scale Sarah's Methods:**

📚 **Team Training Session (45 min)**
• Play 2-3 clips from Sarah's best calls
• Breakdown her objection handling step-by-step
• Group role-play using her techniques

📋 **Create a Playbook**
• Document Sarah's top 10 objection responses
• Share her discovery question templates
• Make it a living document team can access

🎯 **Peer Coaching**
• Pair Sarah with Tom for 2 weeks
• Weekly 30-min shadow sessions
• Sarah shares real-time thought process

Want me to draft the training session agenda?`;
      }

      if (lowerMsg.includes("training") || lowerMsg.includes("focus")) {
        const teamAvg = context.teamData?.reduce((sum, rep) => sum + rep.score, 0) || 0;
        const avgScore = teamAvg / (context.teamData?.length || 3);

        return `**Team Training Priorities - This Week**

📊 **Team Average:** ${Math.round(avgScore)}/100

**Biggest Team Weakness:** Economic Buyer Identification (avg 45/100)

**Why This Matters:**
63% of lost deals happen because reps never spoke to the decision-maker. Your team is losing qualified opportunities at the finish line.

**This Week's Training Plan:**

🎯 **Monday Team Meeting (30 min)**
"Who Really Signs the Check?"

Agenda:
• 5 min: Share Emma's FinanceHub deal (she identified CFO early)
• 10 min: Champion vs Economic Buyer framework
• 10 min: Role-play: "How to ask 'Who else is involved in this decision?'"
• 5 min: Set weekly goal: Every rep must identify EB in next 5 calls

📝 **New Call Requirement:**
Add "Decision-Making Process" section to call notes
- Who needs to approve this?
- What's their role?
- Have they been involved yet?

🎬 **Thursday Review:**
Quick 15-min standup - each rep shares:
- Did you identify the Economic Buyer?
- What question worked?
- What was challenging?

**Expected Impact:** +15% close rate within 30 days

Want me to create the detailed training slides?`;
      }

      if (lowerMsg.includes("risk") || lowerMsg.includes("struggling")) {
        return `**At-Risk Reps Analysis**

🚨 **Tom Martinez** - High Priority
• Score: 52/100 (trending down ⬇️ -8 this week)
• Main issues: Discovery (45), Qualification (38)
• Action: Immediate 1-on-1 coaching session
• Timeline: Daily check-ins for 2 weeks

⚠️ **Watch List:**
Currently all other reps are performing well, but monitor:
• Sarah's closing score (78) - below her usual standard
• Emma's urgency creation - could be more assertive

**Early Warning Signs to Watch:**
✓ Two consecutive weeks of declining scores
✓ Talk ratio above 70%
✓ Call reluctance (cancellations, no-shows)
✓ Negative attitude in team meetings

**Preventive Measures:**
1. Weekly 1-on-1s with each rep (even top performers)
2. Celebrate wins publicly
3. Create psychological safety for asking questions
4. Provide specific, actionable feedback

Tom needs attention NOW. Want me to outline a recovery plan?`;
      }

      if (lowerMsg.includes("emma")) {
        return `**Emma Rodriguez - Top Performer Profile**

🏆 **Overall Score:** 88/100 (Team Leader)
📈 **Trend:** ⬆️ +5 this week (strong momentum)

**Why Emma Excels:**

**Discovery (92/100)** ⭐ Team Best
• Masters the "5 Whys" technique
• Uncovers pain points others miss
• Example: In her David Kim call, she went 3 levels deep on the multi-currency issue

**Key Differentiator:**
Emma doesn't just find pain points - she quantifies them.
"How many hours per week does this cost your team?"
"What's the dollar impact of these delays?"

**What Emma Could Improve:**
• Closing (85) - could be more assertive
• Creating urgency - sometimes too consultative
• Ask for the business more directly

**How to Leverage Emma:**

1️⃣ **Make her a peer coach** - pair with Tom
2️⃣ **Record best practices** - create training library
3️⃣ **Team presentation** - have her share her discovery framework
4️⃣ **Promotion path** - consider team lead role

Emma is promotion-ready. Want to discuss a career development plan for her?`;
      }

      // Generic manager response
      return `I'm your Team Intelligence Assistant! I can help you with:

👥 **Rep Analysis** - Deep dive into individual performance
📊 **Team Trends** - Identify patterns and opportunities  
🎯 **Coaching Plans** - Specific action plans for improvement
🏆 **Best Practices** - Scale what's working across the team
⚠️ **Risk Management** - Early warning on struggling reps

**Your Team Snapshot:**
${context.teamData?.map(rep => 
  `• ${rep.name}: ${rep.score}/100 ${rep.trend === 'up' ? '⬆️' : rep.trend === 'down' ? '⬇️' : '➡️'}`
).join('\n') || "• 3 active reps"}

**Quick Insights:**
• Team avg: ${Math.round((context.teamData?.reduce((sum, rep) => sum + rep.score, 0) || 0) / (context.teamData?.length || 3))}/100
• At-risk reps: ${context.teamData?.filter(rep => rep.score < 60).length || 1}
• Top performer: ${context.teamData?.[0]?.name || "Emma Rodriguez"}

What would you like to explore?`;
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessageContent = inputValue;

    // Add user message
    const userMessage: Message = {
      role: "user",
      content: userMessageContent,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // Show typing indicator
    setIsTyping(true);

    try {
      let kbResults: KBChunk[] = [];
      try {
        kbResults = await searchKBBySimilarity(userMessageContent, 0.45, 3);
      } catch (kbError) {
        console.warn('KB search failed, continuing without KB context:', kbError);
      }

      // Convert messages to ChatMessage format
      const chatMessages: ChatMessage[] = messages.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : 'user',
        content: msg.content
      }));

      // Add current user message
      chatMessages.push({
        role: 'user',
        content: userMessageContent
      });

      if (kbResults.length > 0) {
        const kbContext = kbResults
          .map((chunk, index) => {
            const title = chunk.document_title || 'Untitled document';
            const excerpt = chunk.chunk_text?.slice(0, 350) || '';
            return `${index + 1}. ${title}\n${excerpt}`;
          })
          .join('\n\n');

        chatMessages.push({
          role: 'system',
          content: `Relevant knowledge base references for the latest user question:\n${kbContext}\n\nUse these references when helpful. If you use them, cite document titles explicitly in the response.`,
        });
      }

      // Create placeholder for AI response
      const aiMessageId = Date.now();
      const aiMessage: Message = {
        role: "ai",
        content: "",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      // Stream response from OpenAI
      let fullResponse = '';
      for await (const chunk of streamChatMessage(chatMessages, context)) {
        fullResponse += chunk;
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.role === 'ai') {
            lastMessage.content = fullResponse;
          }
          return newMessages;
        });
      }

      if (kbResults.length > 0) {
        const referencesText = kbResults
          .map((chunk, index) => `• ${index + 1}. ${chunk.document_title || 'Untitled document'}`)
          .join('\n');

        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage?.role === 'ai') {
            lastMessage.content = `${lastMessage.content}\n\n📚 References from playbook:\n${referencesText}`;
          }
          return newMessages;
        });
      }

      setIsTyping(false);
    } catch (error: any) {
      console.error('Error sending message:', error);

      // Determine error message
      let errorMessage = "I'm having trouble connecting to my AI brain right now. Please try again in a moment. 🤖";

      if (error.message?.includes('API key not configured')) {
        errorMessage = "⚠️ OpenAI API key not configured. Please add your API key to .env.local file:\n\nVITE_OPENAI_API_KEY=sk-your-key-here\n\nThen restart the dev server.";
      } else if (error.message?.includes('401')) {
        errorMessage = "🔑 Invalid API key. Please check your OpenAI API key in .env.local";
      } else if (error.message?.includes('429')) {
        errorMessage = "⏱️ Rate limit exceeded. Please wait a moment and try again.";
      }

      // Fallback to local response if OpenAI fails
      const aiResponse: Message = {
        role: "ai",
        content: errorMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage.role === 'ai' && !lastMessage.content) {
          newMessages[newMessages.length - 1] = aiResponse;
        } else {
          newMessages.push(aiResponse);
        }
        return newMessages;
      });
      setIsTyping(false);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInputValue(question);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full px-6 py-4 shadow-2xl hover:shadow-cyan-500/50 transition-all hover:scale-105 flex items-center gap-3 z-50 group"
      >
        <Sparkles className="w-6 h-6 animate-pulse" />
        <div className="text-left">
          <div className="font-bold text-sm">AI {role === "rep" ? "Coach" : "Assistant"}</div>
          <div className="text-xs opacity-90">Ask me anything</div>
        </div>
        <Badge className="bg-white/20 text-white border-0 text-xs animate-bounce">New</Badge>
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 bg-[#1e293b] border-2 border-cyan-500/50 rounded-2xl shadow-2xl transition-all z-50 ${
        isMinimized ? "w-80 h-16" : "w-[450px] h-[650px]"
      }`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm">
              {role === "rep" ? "AI Sales Coach" : "Team Intelligence Assistant"}
            </h3>
            <p className="text-xs opacity-90">
              {isTyping ? "Analyzing..." : "Ready to help"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="h-[440px] overflow-y-auto p-4 space-y-4 bg-[#0f172a]">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 ${
                    message.role === "user"
                      ? "bg-cyan-500 text-white"
                      : "bg-[#1e293b] text-gray-200 border border-cyan-500/30"
                  }`}
                >
                  {message.role === "ai" && (
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-semibold text-cyan-400">AI {role === "rep" ? "Coach" : "Assistant"}</span>
                    </div>
                  )}
                  <div className="text-sm whitespace-pre-line leading-relaxed">{message.content}</div>
                  <div className="text-xs opacity-60 mt-2">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-[#1e293b] border border-cyan-500/30 rounded-2xl p-4 max-w-[85%]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          {messages.length <= 2 && (
            <div className="px-4 pb-2 flex items-center gap-2 overflow-x-auto">
              <Lightbulb className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              <div className="flex gap-2">
                {suggestedQuestions.slice(0, 2).map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="text-xs bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 px-3 py-1.5 rounded-full hover:bg-cyan-500/20 transition-colors whitespace-nowrap"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-cyan-500/30">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="flex-1 bg-[#0f172a] border border-cyan-500/30 text-white placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="bg-cyan-500 hover:bg-cyan-600 text-white border-0 rounded-xl px-4"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              AI-powered insights • Context-aware responses
            </p>
          </div>
        </>
      )}
    </div>
  );
}