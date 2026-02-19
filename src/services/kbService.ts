/**
 * Knowledge Base Service
 * Manages playbooks, SOPs, FAQs with pgvector embeddings
 * Enables semantic search and integration with AI coaching
 */

import { supabase } from './supabase';
import { streamChatMessage } from './openaiService';
import type { KBDocument, KBChunk, KBCoachingReference } from './types';

const openAIApiKey = import.meta.env.VITE_OPENAI_API_KEY;

// =====================================================
// DOCUMENT MANAGEMENT
// =====================================================

/**
 * Upload a new knowledge base document
 */
export async function uploadKBDocument(
  title: string,
  description: string,
  contentText: string,
  documentType: 'playbook' | 'sop' | 'faq' | 'script' | 'objection_handling' | 'product_guide',
  category: string,
  tags: string[] = []
): Promise<KBDocument | null> {
  try {
    const { data: existingDocument } = await supabase
      .from('kb_documents')
      .select('*')
      .eq('title', title)
      .eq('content_text', contentText)
      .eq('is_archived', false)
      .limit(1)
      .maybeSingle();

    if (existingDocument) {
      return existingDocument;
    }

    const { data, error } = await supabase
      .from('kb_documents')
      .insert({
        title,
        description,
        content_text: contentText,
        document_type: documentType,
        category,
        tags,
        is_active: true,
        is_archived: false,
        version: 1,
      })
      .select()
      .single();

    if (error) throw error;

    // Now chunk and embed the document
    await chunkAndEmbedDocument(data.id, contentText, title, documentType, category);

    return data;
  } catch (error) {
    console.error('Error uploading KB document:', error);
    return null;
  }
}

/**
 * Get all active KB documents
 */
export async function getAllKBDocuments(
  category?: string,
  documentType?: string
): Promise<KBDocument[]> {
  try {
    let query = supabase
      .from('kb_documents')
      .select('*')
      .eq('is_active', true)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (category) query = query.eq('category', category);
    if (documentType) query = query.eq('document_type', documentType);

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching KB documents:', error);
    return [];
  }
}

/**
 * Get a specific KB document by ID
 */
export async function getKBDocumentById(documentId: string): Promise<KBDocument | null> {
  try {
    const { data, error } = await supabase
      .from('kb_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching KB document:', error);
    return null;
  }
}

/**
 * Archive a KB document
 */
export async function archiveKBDocument(documentId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('kb_documents')
      .update({
        is_archived: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error archiving KB document:', error);
    return false;
  }
}

/**
 * Update KB document and refresh embeddings
 */
export async function updateKBDocument(
  documentId: string,
  input: {
    title: string;
    description: string;
    contentText: string;
    documentType: 'playbook' | 'sop' | 'faq' | 'script' | 'objection_handling' | 'product_guide';
    category: string;
    tags?: string[];
  }
): Promise<KBDocument | null> {
  try {
    const { data, error } = await supabase
      .from('kb_documents')
      .update({
        title: input.title,
        description: input.description,
        content_text: input.contentText,
        document_type: input.documentType,
        category: input.category,
        tags: input.tags || [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select()
      .single();

    if (error) throw error;

    const { error: deleteChunksError } = await supabase
      .from('kb_chunks')
      .delete()
      .eq('document_id', documentId);

    if (deleteChunksError) throw deleteChunksError;

    await chunkAndEmbedDocument(
      documentId,
      input.contentText,
      input.title,
      input.documentType,
      input.category
    );

    return data;
  } catch (error) {
    console.error('Error updating KB document:', error);
    return null;
  }
}

/**
 * Delete KB document and all related chunks
 */
export async function deleteKBDocument(documentId: string): Promise<boolean> {
  try {
    const { error: deleteChunksError } = await supabase
      .from('kb_chunks')
      .delete()
      .eq('document_id', documentId);

    if (deleteChunksError) throw deleteChunksError;

    const { error: deleteDocError } = await supabase
      .from('kb_documents')
      .delete()
      .eq('id', documentId);

    if (deleteDocError) throw deleteDocError;
    return true;
  } catch (error) {
    console.error('Error deleting KB document:', error);
    return false;
  }
}

// =====================================================
// CHUNKING & EMBEDDING
// =====================================================

/**
 * Split document into chunks (max 2000 chars per chunk with 20% overlap)
 */
function chunkText(
  text: string,
  maxChunkSize: number = 2000,
  overlapPercentage: number = 20
): string[] {
  const chunks: string[] = [];
  const overlapSize = Math.floor(maxChunkSize * (overlapPercentage / 100));

  let currentPosition = 0;

  while (currentPosition < text.length) {
    const endPosition = Math.min(currentPosition + maxChunkSize, text.length);
    const chunk = text.substring(currentPosition, endPosition);

    chunks.push(chunk.trim());

    // Move position forward, accounting for overlap
    currentPosition = endPosition - overlapSize;

    // If we're near the end, break
    if (endPosition === text.length) break;
  }

  return chunks;
}

/**
 * Get embeddings from OpenAI for text chunks
 */
async function getEmbedding(text: string): Promise<number[] | null> {
  try {
    if (!openAIApiKey) {
      console.error('VITE_OPENAI_API_KEY is not configured for embeddings');
      return null;
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAIApiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small', // Or text-embedding-3-large for 3072 dimensions
        input: text,
        dimensions: 1536, // OpenAI's standard dimension
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error getting embedding from OpenAI:', error);
    return null;
  }
}

/**
 * Estimate token count for a text (rough approximation)
 */
function estimateTokenCount(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

/**
 * Extract keywords from text (simple implementation)
 */
function extractKeywords(text: string, count: number = 10): string[] {
  const words = text
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 4);

  // Remove common stop words
  const stopWords = new Set([
    'about', 'after', 'before', 'between', 'into', 'through', 'during', 'that', 'which',
    'their', 'these', 'those', 'from', 'than', 'other', 'with', 'there', 'would', 'could',
  ]);

  const filtered = words.filter((w) => !stopWords.has(w));
  const freq = new Map<string, number>();

  filtered.forEach((word) => {
    freq.set(word, (freq.get(word) || 0) + 1);
  });

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([word]) => word);
}

/**
 * Chunk document and generate embeddings
 */
export async function chunkAndEmbedDocument(
  documentId: string,
  contentText: string,
  documentTitle: string,
  documentType: string,
  category: string,
  sectionTitle?: string
): Promise<{ chunksCreated: number; chunksWithEmbeddings: number }> {
  try {
    const chunks = chunkText(contentText);
    let chunksWithEmbeddings = 0;

    for (let index = 0; index < chunks.length; index++) {
      const chunkText = chunks[index];
      const keywords = extractKeywords(chunkText);
      const tokenCount = estimateTokenCount(chunkText);

      // Get embedding from OpenAI
      const embedding = await getEmbedding(chunkText);

      if (!embedding) {
        console.warn(`Failed to get embedding for chunk ${index} of document ${documentId}`);
        continue;
      }

      // Store chunk in database
      const { error } = await supabase.from('kb_chunks').insert({
        document_id: documentId,
        chunk_index: index,
        chunk_text: chunkText,
        token_count: tokenCount,
        embedding,
        document_title: documentTitle,
        document_type: documentType,
        category,
        section_title: sectionTitle,
        keywords,
        is_critical: index === 0, // First chunk is usually critical intro
        has_example: chunkText.toLowerCase().includes('example'),
        has_code_example: chunkText.includes('```'),
      });

      if (error) {
        console.error(`Error storing chunk ${index}:`, error);
      } else {
        chunksWithEmbeddings++;
      }

      // Rate limiting: add small delay between OpenAI API calls
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Update document metadata
    await supabase.from('kb_documents').update({
      updated_at: new Date().toISOString(),
    }).eq('id', documentId);

    return { chunksCreated: chunks.length, chunksWithEmbeddings };
  } catch (error) {
    console.error('Error chunking and embedding document:', error);
    return { chunksCreated: 0, chunksWithEmbeddings: 0 };
  }
}

// =====================================================
// SEARCH
// =====================================================

/**
 * Search KB by semantic similarity
 */
export async function searchKBBySimilarity(
  query: string,
  similarityThreshold: number = 0.5,
  limitResults: number = 5,
  category?: string
): Promise<KBChunk[]> {
  try {
    // Get embedding for the query
    const queryEmbedding = await getEmbedding(query);
    if (!queryEmbedding) {
      throw new Error('Failed to generate query embedding');
    }

    // Use the database RPC function for similarity search
    const { data, error } = await supabase.rpc('search_kb_by_similarity', {
      query_embedding: queryEmbedding,
      similarity_threshold: similarityThreshold,
      limit_results: limitResults,
      p_category: category || null,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching KB:', error);
    return [];
  }
}

/**
 * Search KB by keyword (simple text search)
 */
export async function searchKBByKeyword(
  keyword: string,
  limitResults: number = 10
): Promise<KBChunk[]> {
  try {
    const { data, error } = await supabase
      .from('kb_chunks')
      .select('*')
      .textSearch('chunk_text', keyword, {
        type: 'websearch',
      })
      .limit(limitResults);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error keyword searching KB:', error);
    return [];
  }
}

/**
 * Get chunks by document ID
 */
export async function getChunksByDocument(documentId: string): Promise<KBChunk[]> {
  try {
    const { data, error } = await supabase
      .from('kb_chunks')
      .select('*')
      .eq('document_id', documentId)
      .order('chunk_index', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching chunks for document:', error);
    return [];
  }
}

// =====================================================
// COACHING INTEGRATION
// =====================================================

/**
 * Link a KB chunk to coaching/analysis
 */
export async function linkKBToCoaching(
  callId: string,
  kbChunkId: string,
  referenceReason: string,
  relevanceScore: number = 80
): Promise<KBCoachingReference | null> {
  try {
    const { data, error } = await supabase
      .from('kb_coaching_references')
      .insert({
        call_id: callId,
        kb_chunk_id: kbChunkId,
        reference_reason: referenceReason,
        relevance_score: relevanceScore,
        rep_viewed: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error linking KB to coaching:', error);
    return null;
  }
}

/**
 * Get KB references for a specific call
 */
export async function getCoachingReferencesForCall(callId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('kb_coaching_references')
      .select(
        `
        *,
        kb_chunks (
          id,
          chunk_text,
          document_title,
          document_type,
          category
        )
      `
      )
      .eq('call_id', callId)
      .order('relevance_score', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching coaching references:', error);
    return [];
  }
}

/**
 * Log KB search in the search logs table
 */
export async function logKBSearch(
  userId: string,
  queryText: string,
  resultsCount: number,
  selectedChunkId?: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from('kb_search_logs').insert({
      user_id: userId,
      query_text: queryText,
      query_type: 'manual_search',
      results_count: resultsCount,
      selected_chunk_id: selectedChunkId,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error logging KB search:', error);
    return false;
  }
}

// =====================================================
// AI COACH WITH KB INTEGRATION
// =====================================================

/**
 * Generate coaching response with KB context
 * This integrates KB search results into the AI coaching prompt
 */
export async function generateCoachingWithKB(
  prompt: string,
  callContext: any,
  kbCategory?: string
): Promise<string> {
  try {
    // Search KB for relevant content
    const kbResults = await searchKBBySimilarity(prompt, 0.5, 3, kbCategory);

    // Build KB context
    let kbContext = '';
    if (kbResults.length > 0) {
      kbContext = '\n\nRelevant resources from knowledge base:\n';
      kbResults.forEach((chunk, index) => {
        kbContext += `\n${index + 1}. From "${chunk.document_title}":\n${chunk.chunk_text.substring(0, 500)}...\n`;
      });
    }

    // Build enhanced prompt
    const enhancedPrompt = `${prompt}${kbContext}

Provide coaching feedback that references the above knowledge base content where relevant. Be specific about which resources the rep should review.`;

    // Stream the response
    let fullResponse = '';
    const role = callContext?.role === 'manager' ? 'manager' : 'rep';
    const chatMessages = [{ role: 'user' as const, content: enhancedPrompt }];
    for await (const chunk of streamChatMessage(chatMessages, {
      role,
      ...callContext,
    })) {
      fullResponse += chunk;
    }

    return fullResponse;
  } catch (error) {
    console.error('Error generating coaching with KB:', error);
    return 'Error generating coaching response.';
  }
}

/**
 * Get KB statistics
 */
export async function getKBStatistics(): Promise<{
  totalDocuments: number;
  totalChunks: number;
  averageChunksPerDocument: number;
  documentsByType: Record<string, number>;
  documentsByCategory: Record<string, number>;
}> {
  try {
    const { data: docData, error: docError } = await supabase
      .from('kb_documents')
      .select('document_type, category')
      .eq('is_active', true)
      .eq('is_archived', false);

    if (docError) throw docError;

    const { count: chunkCount, error: chunkError } = await supabase
      .from('kb_chunks')
      .select('*', { count: 'exact', head: true });

    if (chunkError) throw chunkError;

    const documentsByType: Record<string, number> = {};
    const documentsByCategory: Record<string, number> = {};

    (docData || []).forEach((doc) => {
      documentsByType[doc.document_type] = (documentsByType[doc.document_type] || 0) + 1;
      documentsByCategory[doc.category] = (documentsByCategory[doc.category] || 0) + 1;
    });

    return {
      totalDocuments: docData?.length || 0,
      totalChunks: chunkCount || 0,
      averageChunksPerDocument:
        ((chunkCount || 0) / (docData?.length || 1)),
      documentsByType,
      documentsByCategory,
    };
  } catch (error) {
    console.error('Error getting KB statistics:', error);
    return {
      totalDocuments: 0,
      totalChunks: 0,
      averageChunksPerDocument: 0,
      documentsByType: {},
      documentsByCategory: {},
    };
  }
}
