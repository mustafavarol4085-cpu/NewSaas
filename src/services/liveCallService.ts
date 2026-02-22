import { supabase } from './supabase';
import type { LiveCallSession } from './types';

export async function startLiveCallSession(input: {
  scheduledCallId: string;
  repId: string;
  meetingUrl?: string | null;
}): Promise<LiveCallSession | null> {
  try {
    const { data, error } = await supabase
      .from('live_call_sessions')
      .insert({
        scheduled_call_id: input.scheduledCallId,
        rep_id: input.repId,
        status: 'active',
        meeting_url_snapshot: input.meetingUrl || null,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as LiveCallSession;
  } catch (error) {
    console.error('Error starting live call session:', error);
    return null;
  }
}

export async function endLiveCallSession(sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('live_call_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error ending live call session:', error);
    return false;
  }
}

export async function addLiveTranscriptSegment(input: {
  sessionId: string;
  speaker?: 'rep' | 'customer' | 'unknown';
  text: string;
}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('live_transcript_segments')
      .insert({
        session_id: input.sessionId,
        speaker: input.speaker || 'unknown',
        text: input.text,
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error adding live transcript segment:', error);
    return false;
  }
}
