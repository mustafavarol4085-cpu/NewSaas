/**
 * AI Coach Service - Fetch AI agent analysis and coaching data
 */

import { supabase } from './supabase';
import type { 
  AgentAnalysis, 
  Objection, 
  Question, 
  RepSkill, 
  MasterCoachReport,
  CustomerProfile 
} from './types';

// Request cache to prevent duplicate fetches
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds cache

// Track in-flight requests to prevent duplicates
const inflightRequests = new Map<string, Promise<any>>();

/**
 * Get cached data or execute fetch function
 */
function getCached<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
  // Check cache first
  const cached = requestCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return Promise.resolve(cached.data);
  }

  // Check if request is already in-flight
  if (inflightRequests.has(key)) {
    return inflightRequests.get(key)!;
  }

  // Execute new request
  const promise = fetchFn().then(data => {
    requestCache.set(key, { data, timestamp: Date.now() });
    inflightRequests.delete(key);
    return data;
  }).catch(error => {
    inflightRequests.delete(key);
    throw error;
  });

  inflightRequests.set(key, promise);
  return promise;
}

/**
 * Fetch all agent analysis for a call
 */
export async function getAgentAnalysis(callId: string): Promise<AgentAnalysis[]> {
  return getCached(`agent_analysis_${callId}`, async () => {
    const { data, error } = await supabase
      .from('agent_analysis')
      .select('*')
      .eq('call_id', callId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching agent analysis:', error);
      return [];
    }

    return data || [];
  });
}

/**
 * Fetch objections detected in a call
 */
export async function getObjections(callId: string): Promise<Objection[]> {
  return getCached(`objections_${callId}`, async () => {
    const { data, error } = await supabase
      .from('objections')
      .select('*')
      .eq('call_id', callId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching objections:', error);
      return [];
    }

    return data || [];
  });
}

/**
 * Fetch questions asked by rep in a call
 */
export async function getQuestions(callId: string): Promise<Question[]> {
  return getCached(`questions_${callId}`, async () => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('call_id', callId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching questions:', error);
      return [];
    }

    return data || [];
  });
}

/**
 * Fetch rep skills with trends
 */
export async function getRepSkills(repId: string): Promise<RepSkill[]> {
  const { data, error } = await supabase
    .from('rep_skills')
    .select('*')
    .eq('rep_id', repId)
    .order('measurement_date', { ascending: false });

  if (error) {
    console.error('Error fetching rep skills:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch master coach report for a call
 */
export async function getMasterCoachReport(callId: string): Promise<MasterCoachReport | null> {
  return getCached(`master_coach_${callId}`, async () => {
    const { data, error } = await supabase
      .from('master_coach_reports')
      .select('*')
      .eq('call_id', callId)
      .single();

    if (error) {
      console.error('Error fetching master coach report:', error);
      return null;
    }

    return data;
  });
}

/**
 * Fetch customer profile with enrichment data
 */
export async function getCustomerProfile(customerName: string, company?: string): Promise<CustomerProfile | null> {
  let query = supabase
    .from('customer_profiles')
    .select('*')
    .eq('customer_name', customerName);

  if (company) {
    query = query.eq('company', company);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error('Error fetching customer profile:', error);
    return null;
  }

  return data;
}

/**
 * Get AI coaching summary for a call (combines all agent data)
 */
export async function getAICoachingSummary(callId: string) {
  const [masterReport, agentAnalysis, objections, questions] = await Promise.all([
    getMasterCoachReport(callId),
    getAgentAnalysis(callId),
    getObjections(callId),
    getQuestions(callId),
  ]);

  return {
    masterReport,
    agentAnalysis,
    objections,
    questions,
  };
}

/**
 * Get AI coaching summary and trigger email notification
 */
export async function getAICoachingSummaryWithEmail(callId: string) {
  return getAICoachingSummary(callId);
}

