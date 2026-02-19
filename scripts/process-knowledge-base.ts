/**
 * Script to process knowledge base documents
 * Chunks documents and generates embeddings using pgvector
 * 
 * Usage: npx ts-node scripts/process-knowledge-base.ts
 */

import { supabase } from '../src/services/supabase';
import { getEmbedding } from '../src/services/openaiService';

const CHUNK_SIZE = 512; // tokens
const CHUNK_OVERLAP = 100; // tokens

/**
 * Chunk text into smaller pieces for embedding
 * Respects sentence boundaries when possible
 */
function chunkText(
  text: string,
  chunkSize: number = CHUNK_SIZE,
  overlap: number = CHUNK_OVERLAP
): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    const wouldExceed =
      (currentChunk + ' ' + trimmed).split(/\s+/).length > chunkSize;

    if (wouldExceed && currentChunk) {
      chunks.push(currentChunk.trim());
      // Start overlap with last part of previous chunk
      const words = currentChunk.split(/\s+/);
      currentChunk = words.slice(-overlap).join(' ') + ' ' + trimmed;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + trimmed;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter((c) => c.length > 10); // Filter very small chunks
}

async function processKnowledgeBase() {
  try {
    console.log('📚 Processing knowledge base documents...');

    // Get documents that haven't been embedded yet
    const { data: documents, error: docsError } = await supabase
      .from('kb_documents')
      .select('*')
      .eq('is_active', true)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (docsError) throw docsError;

    if (!documents || documents.length === 0) {
      console.log('❌ No active documents found');
      return;
    }

    console.log(`📋 Found ${documents.length} documents to process`);

    let totalChunksCreated = 0;
    let totalDocumentsProcessed = 0;

    for (const doc of documents) {
      try {
        console.log(`\n📄 Processing: "${doc.title}"`);

        // Check if already chunked
        const { data: existingChunks } = await supabase
          .from('kb_chunks')
          .select('id')
          .eq('document_id', doc.id);

        if (existingChunks && existingChunks.length > 0) {
          console.log(`  ⏭️  Already chunked (${existingChunks.length} chunks)`);
          continue;
        }

        // Chunk the document
        const chunks = chunkText(doc.content_text);
        console.log(`  ✂️  Chunked into ${chunks.length} pieces`);

        // Generate embeddings for each chunk
        const chunkRecords: any[] = [];

        for (let i = 0; i < chunks.length; i++) {
          const chunkText = chunks[i];

          try {
            // Get embedding from OpenAI
            const embedding = await getEmbedding(chunkText);

            if (!embedding) {
              console.error(`    ❌ Failed to embed chunk ${i + 1}`);
              continue;
            }

            chunkRecords.push({
              document_id: doc.id,
              chunk_index: i,
              chunk_text: chunkText,
              token_count: chunkText.split(/\s+/).length,
              embedding, // pgvector column
              document_title: doc.title,
              document_type: doc.document_type,
              category: doc.category,
              keywords: extractKeywords(chunkText),
              is_critical: i === 0, // First chunk is critical (usually intro)
            });

            // Rate limit: OpenAI allows ~3500 tokens/min
            if (i % 10 === 0) {
              await new Promise((resolve) => setTimeout(resolve, 200));
            }
          } catch (error) {
            console.error(`    ❌ Error embedding chunk ${i + 1}:`, error);
          }
        }

        // Insert all chunks for this document
        if (chunkRecords.length > 0) {
          const { error: insertError } = await supabase
            .from('kb_chunks')
            .insert(chunkRecords);

          if (insertError) throw insertError;

          console.log(`  ✅ Embedded ${chunkRecords.length} chunks`);
          totalChunksCreated += chunkRecords.length;
          totalDocumentsProcessed++;
        }
      } catch (error) {
        console.error(`  ❌ Error processing document:`, error);
      }
    }

    console.log(
      `\n✅ Processed ${totalDocumentsProcessed} documents with ${totalChunksCreated} total chunks`
    );
    console.log('🔍 Ready for semantic search in Company GPT');
  } catch (error) {
    console.error('❌ Error processing knowledge base:', error);
    process.exit(1);
  }
}

/**
 * Extract keywords from a text chunk
 */
function extractKeywords(text: string, limit: number = 5): string[] {
  // Simple keyword extraction: get longest words that aren't too common
  const commonWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
  ]);

  const words = text
    .toLowerCase()
    .match(/\b\w+\b/g)
    ?.filter(
      (w) => w.length > 4 && !commonWords.has(w) && !/^\d+$/.test(w)
    ) || [];

  // Get most frequent words
  const wordFreq = new Map<string, number>();
  words.forEach((w) => {
    wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
  });

  return Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

processKnowledgeBase();
