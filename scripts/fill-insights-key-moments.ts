import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Complete call data with all information
const callsDataComplete = [
  {
    customerName: 'Michael Chen',
    repName: 'Sarah Johnson',
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
    customerName: 'Jennifer Wu',
    repName: 'Tom Martinez',
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
    customerName: 'David Kim',
    repName: 'Emma Rodriguez',
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

async function fillInCompleteData() {
  console.log('\n================================================================================');
  console.log('📝 FILLING IN INSIGHTS AND KEY MOMENTS');
  console.log('================================================================================\n');

  for (const callData of callsDataComplete) {
    // Find call
    const { data: calls } = await supabase
      .from('calls')
      .select('id')
      .eq('customer_name', callData.customerName)
      .eq('rep_name', callData.repName)
      .limit(1);

    if (!calls || calls.length === 0) {
      console.log(`❌ Call not found: ${callData.customerName} (${callData.repName})`);
      continue;
    }

    const callId = calls[0].id;
    console.log(`✅ Processing: ${callData.customerName} (${callData.repName})`);

    // Delete existing insights first
    await supabase
      .from('insights')
      .delete()
      .eq('call_id', callId);

    // Delete existing key moments first
    await supabase
      .from('key_moments')
      .delete()
      .eq('call_id', callId);

    // Add insights
    const insightRows = callData.insights.map(insight => ({
      call_id: callId,
      timestamp: insight.timestamp,
      type: insight.type,
      text: insight.text
    }));

    const { error: insightError } = await supabase
      .from('insights')
      .insert(insightRows);

    if (insightError) {
      console.log(`   ❌ Insights error: ${insightError.message}`);
    } else {
      console.log(`   ✅ Added ${insightRows.length} insights`);
    }

    // Add key moments
    const momentRows = callData.keyMoments.map(moment => ({
      call_id: callId,
      time: moment.time,
      label: moment.label
    }));

    const { error: momentError } = await supabase
      .from('key_moments')
      .insert(momentRows);

    if (momentError) {
      console.log(`   ❌ Key moments error: ${momentError.message}`);
    } else {
      console.log(`   ✅ Added ${momentRows.length} key moments`);
    }

    console.log();
  }

  console.log('================================================================================');
  console.log('✅ Complete data filled in!');
  console.log('================================================================================\n');
}

fillInCompleteData().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
