import { supabase } from './supabase';

export interface BenchmarkTranscriptRow {
  id: string;
  rep_id: string;
  call_id: string;
  approved_by?: string | null;
  title?: string | null;
  notes?: string | null;
  is_approved_benchmark: boolean;
  benchmark_date: string;
  created_at: string;
  updated_at: string;
}

export async function getBenchmarkTranscripts(): Promise<BenchmarkTranscriptRow[]> {
  try {
    const { data, error } = await supabase
      .from('benchmark_transcripts')
      .select('*')
      .order('benchmark_date', { ascending: false });

    if (error) throw error;
    return (data as BenchmarkTranscriptRow[]) || [];
  } catch (error) {
    console.error('Error fetching benchmark transcripts:', error);
    return [];
  }
}

export async function saveBenchmarkTranscript(input: {
  repId: string;
  callId: string;
  title?: string;
  notes?: string;
  approvedBy?: string;
}): Promise<boolean> {
  try {
    const payload = {
      rep_id: input.repId,
      call_id: input.callId,
      title: input.title || null,
      notes: input.notes || null,
      approved_by: input.approvedBy || null,
      is_approved_benchmark: true,
      benchmark_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('benchmark_transcripts')
      .upsert(payload, { onConflict: 'call_id' });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving benchmark transcript:', error);
    return false;
  }
}

export async function getBenchmarkAverageScore(): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('benchmark_transcripts')
      .select(`
        call_id,
        calls (
          id,
          analysis (
            scores
          )
        )
      `)
      .eq('is_approved_benchmark', true);

    if (error) throw error;

    const scores: number[] = [];
    (data || []).forEach((row: any) => {
      const call = row.calls;
      const analyses = call?.analysis || [];
      analyses.forEach((a: any) => {
        const overall = a?.scores?.overall;
        if (typeof overall === 'number') scores.push(overall);
      });
    });

    if (!scores.length) return null;
    const avg = scores.reduce((sum, value) => sum + value, 0) / scores.length;
    return Math.round(avg);
  } catch (error) {
    console.error('Error calculating benchmark average score:', error);
    return null;
  }
}
