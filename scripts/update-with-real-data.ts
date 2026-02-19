import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Good transcripts and coaching like the mock calls
const callsData = [
  {
    rep: 'Sarah Johnson',
    customer: 'Michael Chen',
    company: 'TechSolutions',
    industry: 'Cloud Migration',
    type: 'Demo',
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
    strengths: ['Strong discovery questions', 'Good rapport building', 'Clear value proposition', 'Professional tone'],
    improvements: ['Add more urgency in closing', 'Quantify ROI better', 'Shorter talk-time ratio'],
    keyMoments: [
      { time: '0:30', label: 'Initial Rapport' },
      { time: '2:15', label: 'Discovery Questions' },
      { time: '4:45', label: 'Pain Point Identification' },
      { time: '6:30', label: 'Solution Positioning' },
      { time: '8:00', label: 'Closing' }
    ],
    insights: [
      { timestamp: '0:30', type: 'positive', text: 'Great opening - personalized reference to whitepaper download' },
      { timestamp: '2:15', type: 'positive', text: 'Excellent open-ended discovery question about current challenges' },
      { timestamp: '4:00', type: 'positive', text: 'Smart qualifying question - estimated company size and growth' },
      { timestamp: '7:30', type: 'positive', text: 'Effective solution positioning tied directly to customer pain points' },
      { timestamp: '8:30', type: 'improvement', text: 'Could create more urgency - offer limited time promotion' }
    ]
  },
  {
    rep: 'Tom Martinez',
    customer: 'Jennifer Wu',
    company: 'MarketPro',
    industry: 'Marketing Automation',
    type: 'Outbound',
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
    coaching: "Tom's approach needs improvement. Started pitch too early without proper discovery. Customer didn't show buying signals. Work on: listening more, better qualification questions, reducing talk time.",
    strengths: ['Persistent', 'Friendly tone', 'Quick to mention promotion'],
    improvements: ['Ask discovery questions before pitching', 'Better listening skills', 'Understand customer needs first', 'Reduce talk-time ratio', 'Respect customer objections earlier'],
    keyMoments: [
      { time: '0:10', label: 'Initial Contact' },
      { time: '1:00', label: 'Early Pitch Attempt' },
      { time: '3:30', label: 'Objection - Already Using Solution' },
      { time: '4:20', label: 'Discount Offer' },
      { time: '5:45', label: 'Call End' }
    ],
    insights: [
      { timestamp: '0:10', type: 'negative', text: 'Started pitch too quickly - no discovery done yet' },
      { timestamp: '1:20', type: 'negative', text: 'Customer clearly stated busy - should respect that' },
      { timestamp: '3:45', type: 'improvement', text: 'Weak qualification - didn\'t ask about budget or decision timeline' },
      { timestamp: '5:10', type: 'negative', text: 'Struggled with pricing objection - became defensive instead of exploring concerns' },
      { timestamp: '5:45', type: 'negative', text: 'Customer asked to be removed from list - call ended badly' }
    ]
  },
  {
    rep: 'Emma Rodriguez',
    customer: 'David Kim',
    company: 'FinanceHub',
    industry: 'Financial Services',
    type: 'Discovery',
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
    coaching: "Emma did an outstanding job! Excellent discovery with probing questions. Strong qualification and clear understanding of customer needs. Next steps: emphasize ROI and timeline for decision.",
    strengths: ['Excellent discovery questions', 'Strong active listening', 'Great rapport building', 'Clear value proposition', 'Effective closing'],
    improvements: ['Mention price range earlier', 'Discuss implementation support', 'Get commitment for next step details'],
    keyMoments: [
      { time: '0:20', label: 'Rapport Building' },
      { time: '1:30', label: 'Discovery - Current Challenges' },
      { time: '3:00', label: 'Deep Dive - Transaction Volume' },
      { time: '5:15', label: 'Impact Realization' },
      { time: '7:00', label: 'Timeline Discussion' },
      { time: '9:00', label: 'Successful Close' }
    ],
    insights: [
      { timestamp: '1:30', type: 'positive', text: 'Excellent open-ended question about current system' },
      { timestamp: '3:00', type: 'positive', text: 'Great qualifying question - quantified transaction volume' },
      { timestamp: '4:30', type: 'positive', text: 'Powerful follow-up - understood the workaround impact' },
      { timestamp: '5:45', type: 'positive', text: 'Brilliant impact question - connected time savings to business value' },
      { timestamp: '7:30', type: 'positive', text: 'Smart closing - got commitment before demo' }
    ]
  }
];

async function updateCallsWithBetterData() {
  console.log('\n================================================================================');
  console.log('🔄 UPDATING CALLS WITH BETTER TRANSCRIPTS AND DATA');
  console.log('================================================================================\n');

  for (const callData of callsData) {
    // Find the call in database
    const { data: existingCalls } = await supabase
      .from('calls')
      .select('*')
      .eq('customer_name', callData.customer)
      .eq('rep_name', callData.rep)
      .limit(1);

    if (!existingCalls || existingCalls.length === 0) {
      console.log(`❌ Call not found: ${callData.customer} (${callData.rep})`);
      continue;
    }

    const call = existingCalls[0];
    console.log(`✅ Updating: ${callData.customer} (${callData.rep})`);

    // Update transcript with full text
    const { error: transcriptError } = await supabase
      .from('transcripts')
      .update({
        transcript_text: callData.transcript,
      })
      .eq('call_id', call.id);

    if (transcriptError) {
      console.log(`   ❌ Transcript error: ${transcriptError.message}`);
    } else {
      console.log(`   ✅ Updated transcript`);
    }

    // Update or create analysis with full coaching
    const { data: existingAnalysis } = await supabase
      .from('analysis')
      .select('*')
      .eq('call_id', call.id)
      .limit(1);

    if (existingAnalysis && existingAnalysis.length > 0) {
      const { error: analysisError } = await supabase
        .from('analysis')
        .update({
          coaching: {
            feedback: callData.coaching,
            strengths: callData.strengths,
            improvement_areas: callData.improvements
          }
        })
        .eq('call_id', call.id);

      if (analysisError) {
        console.log(`   ❌ Analysis error: ${analysisError.message}`);
      } else {
        console.log(`   ✅ Updated analysis`);
      }
    }

    // Update or create insights
    for (const insight of callData.insights) {
      const { error: insightError } = await supabase
        .from('insights')
        .upsert(
          {
            call_id: call.id,
            timestamp: insight.timestamp,
            type: insight.type,
            text: insight.text
          },
          { onConflict: 'call_id,timestamp' }
        );

      if (insightError) {
        console.log(`   ⚠️  Insight error: ${insightError.message}`);
      }
    }
    console.log(`   ✅ Updated insights (${callData.insights.length})`);

    // Update or create key moments
    for (const moment of callData.keyMoments) {
      const { error: momentError } = await supabase
        .from('key_moments')
        .upsert(
          {
            call_id: call.id,
            time: moment.time,
            label: moment.label
          },
          { onConflict: 'call_id,time' }
        );

      if (momentError) {
        console.log(`   ⚠️  Key moment error: ${momentError.message}`);
      }
    }
    console.log(`   ✅ Updated key moments (${callData.keyMoments.length})`);

    console.log();
  }

  console.log('================================================================================');
  console.log('✅ All calls updated with better data!');
  console.log('================================================================================\n');
}

updateCallsWithBetterData().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
