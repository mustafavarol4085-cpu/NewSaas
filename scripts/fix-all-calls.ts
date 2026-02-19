import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Mock call 1, 2, 3 gibi complete ve working data
const completeCallData: { [key: string]: any } = {
  'Michael Chen-Sarah Johnson': {
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
    coaching: "Sarah demonstrated excellent discovery skills by asking probing questions about the customer's pain points. She effectively handled objections with data-driven responses. To improve: create more urgency in closing.",
    strengths: ["Strong discovery questions", "Good rapport building", "Clear value proposition"],
    improvements: ["Add more urgency in closing", "Quantify ROI better"],
    keyMoments: [
      { time: "0:30", label: "Initial Rapport" },
      { time: "2:15", label: "Discovery Questions" },
      { time: "4:45", label: "Pain Point ID" },
      { time: "6:30", label: "Solution Positioning" },
      { time: "8:00", label: "Successful Close" }
    ]
  },
  'Jennifer Wu-Tom Martinez': {
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
    coaching: "Tom needs improvement. Started pitch too early without discovery. Didn't respect customer objections. Work on: listening more, asking discovery questions first, reducing talk time, respecting buyer signals.",
    strengths: ["Persistent", "Friendly tone"],
    improvements: ["Ask discovery questions before pitching", "Better listening skills", "Reduce talk-time ratio", "Respect objections sooner"],
    keyMoments: [
      { time: "0:10", label: "Initial Contact" },
      { time: "1:00", label: "Early Pitch" },
      { time: "3:30", label: "Customer Objection" },
      { time: "4:20", label: "Discount Offer" },
      { time: "5:45", label: "Call End" }
    ]
  },
  'David Kim-Emma Rodriguez': {
    transcript: `Rep: Hello David, this is Emma Rodriguez from FinanceHub. Thanks for scheduling this call with me.

Customer: Hi Emma, yes, I've been looking into your platform for our accounting needs.

Rep: Wonderful! Before we dive in, I'd love to understand more about your current setup. What's working well, and what's not working so well with your current accounting system?

Customer: We're using QuickBooks right now. It's okay for basic stuff, but we struggle with multi-currency transactions since we work with international clients. Also, the reporting features are pretty limited.

Rep: Got it. So multi-currency support and advanced reporting are key priorities. How many international transactions would you say you process monthly?

Customer: We're handling around 200-300 transactions, and it's growing. We've been managing with workarounds but it's becoming a headache.

Rep: That volume definitely justifies a more sophisticated solution. When you say workarounds, what does that look like?

Customer: We're manually reconciling a lot of transactions and exporting data to Excel for more detailed analysis. It takes our accounting team probably 10-15 hours a week.

Rep: That's significant time that could be better spent on strategic initiatives. What would it mean to your business if you could cut that time in half?

Customer: That would actually free up resources for other priorities. We've been wanting to do more financial forecasting.

Rep: Perfect! That's exactly what advanced accounting platforms enable. Based on what you've shared, it sounds like the right time to evaluate a solution. What's your timeline for making a decision?

Customer: We're looking to implement something in the next quarter.

Rep: Excellent. Let me ask - if we could demonstrate how to handle all those multi-currency scenarios automatically and cut your reconciliation time in half, would that be worth a detailed discussion with your team?

Customer: Absolutely. That would be very valuable.

Rep: Great! I'll set up a personalized demo for you and your team. I'll also prepare a cost-benefit analysis showing your potential time savings. How does next Wednesday look?

Customer: Next Wednesday works perfectly. Please send me a calendar invite.

Rep: Will do! I'm excited to show you how FinanceHub can streamline your operations. Talk soon, David!

Customer: Thanks, Emma. Looking forward to it!`,
    coaching: "Emma did outstanding work! Excellent discovery with probing questions. Strong qualification and clear understanding of customer needs. Leadership-level rapport. Next steps: emphasize ROI and timeline.",
    strengths: ["Excellent discovery questions", "Strong active listening", "Great rapport building", "Clear value proposition", "Effective closing"],
    improvements: ["Mention price range earlier", "Discuss implementation timeline in more detail"],
    keyMoments: [
      { time: "0:20", label: "Rapport Building" },
      { time: "1:30", label: "Discovery - Current Challenges" },
      { time: "3:00", label: "Deep Dive - Transaction Volume" },
      { time: "5:15", label: "Impact Realization" },
      { time: "7:00", label: "Timeline - Q1" },
      { time: "9:00", label: "Successful Close" }
    ]
  }
};

async function updateAllCallsWithCompleteData() {
  console.log('\n================================================================================');
  console.log('📝 UPDATING ALL CALLS WITH COMPLETE MOCK-LIKE DATA');
  console.log('================================================================================\n');

  // Get all calls
  const { data: allCalls } = await supabase
    .from('calls')
    .select('id, customer_name, rep_name');

  if (!allCalls || allCalls.length === 0) {
    console.log('❌ No calls found');
    return;
  }

  for (const call of allCalls) {
    const key = `${call.customer_name}-${call.rep_name}`;
    const data = completeCallData[key];

    if (data) {
      console.log(`✅ ${key}`);

      // Update transcript
      const { error: transcriptError } = await supabase
        .from('transcripts')
        .update({
          transcript_text: data.transcript
        })
        .eq('call_id', call.id);

      if (transcriptError) {
        console.log(`   ❌ Transcript: ${transcriptError.message}`);
      } else {
        console.log(`   ✅ Transcript updated`);
      }

      // Update analysis
      const { error: analysisError } = await supabase
        .from('analysis')
        .update({
          coaching: {
            feedback: data.coaching,
            strengths: data.strengths,
            improvement_areas: data.improvements
          }
        })
        .eq('call_id', call.id);

      if (analysisError) {
        console.log(`   ❌ Analysis: ${analysisError.message}`);
      } else {
        console.log(`   ✅ Analysis updated`);
      }

      // Clear and add key moments
      await supabase
        .from('key_moments')
        .delete()
        .eq('call_id', call.id);

      const momentRows = data.keyMoments.map((m: any) => ({
        call_id: call.id,
        time: m.time,
        label: m.label
      }));

      const { error: momentError } = await supabase
        .from('key_moments')
        .insert(momentRows);

      if (momentError) {
        console.log(`   ❌ Key moments: ${momentError.message}`);
      } else {
        console.log(`   ✅ Key moments added (${momentRows.length})`);
      }
    } else {
      console.log(`⏭️  ${key} - using existing data`);
    }
  }

  console.log('\n================================================================================');
  console.log('✅ Update complete!');
  console.log('================================================================================\n');
}

updateAllCallsWithCompleteData().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
