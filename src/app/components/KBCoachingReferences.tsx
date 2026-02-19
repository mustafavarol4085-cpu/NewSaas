import React, { useState, useCallback } from 'react';
import { Search, BookOpen, Sparkles } from 'lucide-react';
import type { KBChunk } from '../services/types';
import { searchKnowledgeBase } from '../services/kbService';

interface KBCoachingReferencesProps {
  query?: string;
  category?: string;
  onChunkSelected?: (chunk: KBChunk) => void;
  compact?: boolean;
}

export function KBCoachingReferences({
  query = '',
  category,
  onChunkSelected,
  compact = false,
}: KBCoachingReferencesProps) {
  const [searchQuery, setSearchQuery] = useState(query);
  const [results, setResults] = useState<KBChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(!compact);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const chunks = await searchKnowledgeBase(
        searchQuery,
        {
          limit: compact ? 3 : 5,
          categoryFilter: category,
        }
      );
      setResults(chunks);
    } catch (error) {
      console.error('Error searching KB:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, category]);

  React.useEffect(() => {
    if (query && query !== searchQuery) {
      setSearchQuery(query);
    }
  }, [query]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-cyan-500/30 overflow-hidden">
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-4 cursor-pointer hover:bg-slate-700/50 transition flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-white">Knowledge Base References</h3>
          {results.length > 0 && (
            <span className="text-xs bg-cyan-500/30 text-cyan-300 px-2 py-1 rounded">
              {results.length} match
              {results.length !== 1 ? 'es' : ''}
            </span>
          )}
        </div>
        <span className="text-cyan-400 text-xl">
          {expanded ? '−' : '+'}
        </span>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-4 border-t border-slate-700 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search playbooks, SOPs, FAQs..."
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-cyan-600 text-white rounded text-sm hover:bg-cyan-500 disabled:opacity-50 transition"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Results */}
          {results.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {results.map((chunk) => (
                <div
                  key={chunk.id}
                  onClick={() => onChunkSelected?.(chunk)}
                  className="p-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg cursor-pointer transition group"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-block px-2 py-0.5 bg-purple-600/50 text-purple-200 text-xs rounded">
                          {chunk.document_type}
                        </span>
                        {chunk.category && (
                          <span className="inline-block px-2 py-0.5 bg-slate-600/50 text-slate-300 text-xs rounded">
                            {chunk.category}
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-sm text-white group-hover:text-cyan-300 transition">
                        {chunk.document_title}
                      </h4>
                    </div>
                    {chunk.is_critical && (
                      <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    )}
                  </div>

                  {/* Content Preview */}
                  <p className="text-sm text-slate-300 line-clamp-2 mb-2">
                    {chunk.chunk_text.substring(0, 200)}
                    {chunk.chunk_text.length > 200 ? '...' : ''}
                  </p>

                  {/* Keywords */}
                  {chunk.keywords && chunk.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {chunk.keywords.slice(0, 3).map((keyword) => (
                        <span
                          key={keyword}
                          className="text-xs px-2 py-0.5 bg-cyan-900/40 text-cyan-300 rounded"
                        >
                          #{keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : searchQuery.trim() ? (
            <div className="p-4 text-center text-slate-400">
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
                  <span>Searching knowledge base...</span>
                </div>
              ) : (
                <p>No matching documents found</p>
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-slate-400 text-sm">
              💡 Enter a search term to find relevant playbooks and guides
            </div>
          )}

          {/* Auto-suggestions (with KB integration) */}
          {!searchQuery && (
            <div className="pt-3 border-t border-slate-600">
              <p className="text-xs text-slate-400 mb-2">🔍 Quick access:</p>
              <div className="space-y-1">
                {[
                  'Objection handling templates',
                  'Discovery questions',
                  'Closing techniques',
                  'Price objection responses',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setSearchQuery(suggestion);
                      // Auto-search for suggestions
                      setTimeout(() => {
                        setSearchQuery(suggestion);
                      }, 0);
                    }}
                    className="w-full text-left text-sm px-3 py-1 rounded hover:bg-slate-600 text-slate-300 transition"
                  >
                    → {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Inline KB reference - shows a single chunk in response
 */
export function KBReference({ chunk }: { chunk: KBChunk }) {
  return (
    <div className="my-4 p-4 bg-cyan-900/20 border-l-4 border-cyan-500 rounded">
      <div className="flex items-start gap-3">
        <BookOpen className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
              📖 From Knowledge Base
            </span>
            <span className="text-xs text-cyan-400">
              {chunk.document_type} → {chunk.document_title}
            </span>
          </div>
          <p className="text-sm text-cyan-100 mb-2">{chunk.chunk_text}</p>
          {chunk.keywords && chunk.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {chunk.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="text-xs px-2 py-0.5 bg-cyan-800/40 text-cyan-300 rounded"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
