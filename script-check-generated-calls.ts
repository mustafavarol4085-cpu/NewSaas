import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function showCalls() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 SON OLUŞTURULAN CALLLAR');
  console.log('='.repeat(80) + '\n');

  const { data: calls } = await supabase
    .from('calls')
    .select('*')
    .eq('source', 'ai_generated')
    .order('created_at', { ascending: false });

  if (!calls || calls.length === 0) {
    console.log('Henüz call oluşturulmadı');
    return;
  }

  calls.forEach((call, i) => {
    const durationMin = Math.round((call.duration_seconds || 0) / 60);
    const callDate = call.started_at?.split('T')[0] || 'N/A';
    const callTime = call.started_at?.split('T')[1]?.substring(0, 5) || 'N/A';

    console.log(`${i + 1}. 📞 ${call.customer_name} (${call.company})`);
    console.log(`   Rep: ${call.rep_name}`);
    console.log(`   Tür: ${call.call_type}`);
    console.log(`   Endüstri: ${call.industry}`);
    console.log(`   📅 Tarih: ${callDate}`);
    console.log(`   🕐 Saat: ${callTime}`);
    console.log(`   ⏱️  Süre: ${durationMin} dakika`);
    console.log(`   ✅ Sonuç: ${call.outcome}`);
    console.log('');
  });

  console.log('\n' + '='.repeat(80));
  console.log('📊 ANALYSIS SKORLARI (İlk 3 Call)');
  console.log('='.repeat(80) + '\n');

  for (let i = 0; i < Math.min(3, calls.length); i++) {
    const call = calls[i];
    const { data: analysis } = await supabase
      .from('analysis')
      .select('*')
      .eq('call_id', call.id)
      .single();

    if (analysis) {
      console.log(`${i + 1}. ${call.customer_name} (${call.rep_name})`);
      console.log(`   Rep Adı: ${call.rep_name}`);
      console.log(`   Müşteri: ${call.customer_name}`);
      console.log(`   Şirket: ${call.company}`);
      console.log(`\n   📊 Skorlar:`);
      console.log(`   ├─ Overall: ${analysis.scores.overall}/100 ${'█'.repeat(Math.round(analysis.scores.overall / 10))}${' '.repeat(10 - Math.round(analysis.scores.overall / 10))}`);
      console.log(`   ├─ Discovery: ${analysis.scores.discovery}/100 ${'█'.repeat(Math.round(analysis.scores.discovery / 10))}${' '.repeat(10 - Math.round(analysis.scores.discovery / 10))}`);
      console.log(`   ├─ Qualification: ${analysis.scores.qualification}/100 ${'█'.repeat(Math.round(analysis.scores.qualification / 10))}${' '.repeat(10 - Math.round(analysis.scores.qualification / 10))}`);
      console.log(`   ├─ Objection Handling: ${analysis.scores.objection_handling}/100 ${'█'.repeat(Math.round(analysis.scores.objection_handling / 10))}${' '.repeat(10 - Math.round(analysis.scores.objection_handling / 10))}`);
      console.log(`   ├─ Closing: ${analysis.scores.closing}/100 ${'█'.repeat(Math.round(analysis.scores.closing / 10))}${' '.repeat(10 - Math.round(analysis.scores.closing / 10))}`);
      console.log(`   └─ Rapport Building: ${analysis.scores.rapport_building}/100 ${'█'.repeat(Math.round(analysis.scores.rapport_building / 10))}${' '.repeat(10 - Math.round(analysis.scores.rapport_building / 10))}`);
      console.log(`\n   💬 Coaching Feedback:`);
      console.log(`   "${analysis.coaching.feedback.substring(0, 120)}..."`);
      console.log(`\n   ✅ Güçlü Yönler:`);
      analysis.coaching.strengths.forEach(s => console.log(`      • ${s}`));
      console.log(`\n   ⚠️  Geliştirilecek Alanlar:`);
      analysis.coaching.improvement_areas.forEach(a => console.log(`      • ${a}`));
      console.log('\n' + '-'.repeat(80) + '\n');
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`✅ TOPLAM: ${calls.length} Yeni Call Oluşturuldu`);
  console.log('='.repeat(80) + '\n');
}

showCalls().catch(console.error);
