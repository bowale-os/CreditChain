'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  TrendingUp,
  Shield,
  Plus,
  ChevronUp,
  Clock,
  Tag,
  BarChart3,
  PieChart,
  Activity,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import {
  getAllInsights,
  postInsight,
  addUpvote,
} from '../src/lib/api';
import type { Insight } from '../src/types/insight';
import type { CreateInsightPayload } from './types/CreateInsightPayload';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

/* -------------------------------------------------
   Dynamic Categories
------------------------------------------------- */
const CATEGORY_DEFS = [
  { id: 'credit-building', name: 'Credit Building' },
  { id: 'credit-cards', name: 'Credit Cards' },
  { id: 'debt-payoff', name: 'Debt Payoff' },
  { id: 'loans', name: 'Loans & Lending' },
  { id: 'investments', name: 'Investments' },
  { id: 'savings', name: 'Savings & Budgeting' },
  { id: 'identity-theft', name: 'Identity Theft' },
  { id: 'credit-monitoring', name: 'Credit Monitoring' },
] as const;

type CategoryId = (typeof CATEGORY_DEFS)[number]['id'];

/* -------------------------------------------------
   Helpers
------------------------------------------------- */
const generateHashedId = (): string => {
  const stored = localStorage.getItem('creditchain_session');
  if (stored) return stored;
  const id = 'hashed_' + Math.random().toString(36).substring(2, 15);
  localStorage.setItem('creditchain_session', id);
  return id;
};

const sortByScore = (list: Insight[]): Insight[] =>
  [...list].sort(
    (a, b) =>
      calculatePopularityScore(b.upvotes, b.createdAt) -
      calculatePopularityScore(a.upvotes, a.createdAt)
  );

const calculatePopularityScore = (upvotes: number, createdAt: Date | string): number => {
  const safeUpvotes = typeof upvotes === 'number' ? upvotes : 0;
  const date = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  if (isNaN(date.getTime())) return 0;
  const ageDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  return safeUpvotes / Math.pow(ageDays + 2, 1.8);
};

const formatTimeAgo = (createdAt: Date): string => {
  const seconds = Math.floor((Date.now() - createdAt.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

/* -------------------------------------------------
   Insight Detail Modal
------------------------------------------------- */
const InsightModal: React.FC<{
  insight: Insight;
  onClose: () => void;
  onUpvote: (id: string) => void;
  hasUpvoted: boolean;
  isPending: boolean;
}> = ({ insight, onClose, onUpvote, hasUpvoted, isPending }) => {
  const cat = CATEGORY_DEFS.find(c => c.id === insight.category);
  const score = calculatePopularityScore(insight.upvotes, insight.createdAt);

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
              <Tag className="w-3.5 h-3.5" />
              {cat?.name ?? 'Unknown'}
            </span>
            {insight.synced && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>On-chain</span>
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Tip */}
          <h2 className="text-2xl font-bold text-gray-900 leading-tight">
            {insight.tip}
          </h2>

          {/* Body */}
          {insight.body && (
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {insight.body}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{formatTimeAgo(insight.createdAt)}</span>
            </div>
            <span className="text-gray-300">•</span>
            <span className="font-mono text-xs">
              {(insight.hashedId || 'anon').slice(0, 16)}...
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-xs">Score: {score.toFixed(2)}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => onUpvote(insight.id)}
              disabled={hasUpvoted || isPending}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                hasUpvoted
                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                  : isPending
                  ? 'bg-gray-100 text-gray-500 animate-pulse'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <ChevronUp className="w-5 h-5" />
              <span>{hasUpvoted ? 'Upvoted' : 'Upvote'}</span>
              <span className="text-gray-500">({insight.upvotes})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------
   Compact Insight Card (Feed Style)
------------------------------------------------- */
const InsightCard: React.FC<{
  insight: Insight;
  onUpvote: (id: string) => void;
  hasUpvoted: boolean;
  isPending: boolean;
  onClick: () => void;
}> = ({ insight, onUpvote, hasUpvoted, isPending, onClick }) => {
  const cat = CATEGORY_DEFS.find(c => c.id === insight.category);
  const score = calculatePopularityScore(insight.upvotes, insight.createdAt);

  return (
    <article 
      className="group relative px-4 py-4 bg-white border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex gap-3">
        {/* Upvote Button */}
        <div className="flex flex-col items-center gap-0.5 pt-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpvote(insight.id);
            }}
            disabled={hasUpvoted || isPending}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
              hasUpvoted
                ? 'bg-blue-100 text-blue-600'
                : isPending
                ? 'bg-gray-100 text-gray-400 animate-pulse'
                : 'text-gray-400 hover:bg-gray-100 hover:text-blue-600'
            }`}
            aria-label={`Upvote. Current: ${insight.upvotes}`}
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <span className={`text-xs font-semibold ${hasUpvoted ? 'text-blue-600' : 'text-gray-600'}`}>
            {insight.upvotes}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs font-medium">
              {cat?.name ?? 'Unknown'}
            </span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-500">
              {formatTimeAgo(insight.createdAt)}
            </span>
            {insight.synced && (
              <>
                <span className="text-xs text-gray-300">•</span>
                <CheckCircle2 className="w-3 h-3 text-green-600" />
              </>
            )}
          </div>

          {/* Tip */}
          <h3 className="text-[15px] font-semibold text-gray-900 mb-1 leading-snug group-hover:text-blue-600 transition-colors">
            {insight.tip}
          </h3>

          {/* Preview if body exists */}
          {insight.body && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
              {insight.body}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-mono">{(insight.hashedId || 'anon').slice(0, 8)}...</span>
            <span className="text-gray-300">•</span>
            <span>Score: {score.toFixed(2)}</span>
            {insight.body && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-blue-600 font-medium group-hover:underline flex items-center gap-0.5">
                  Read more <ExternalLink className="w-3 h-3" />
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

/* -------------------------------------------------
   Other Components (Form, Search, Dashboard)
------------------------------------------------- */
const InsightForm: React.FC<{
  onSubmit: (payload: CreateInsightPayload) => void;
  categories: typeof CATEGORY_DEFS;
}> = ({ onSubmit, categories }) => {
  const [tip, setTip] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<CategoryId>('credit-building');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tip.trim()) return;
    setSubmitting(true);
    const hashedId = generateHashedId();

    setTimeout(() => {
      onSubmit({ tip, body: body || null, category, hashedId });
      setTip('');
      setBody('');
      setSubmitting(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 500);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          Insight shared! Syncing to blockchain...
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your Insight (Tip) <span className="text-red-500">*</span>
          </label>
          <input
            value={tip}
            onChange={e => setTip(e.target.value)}
            placeholder="e.g., Request credit limit increases every 6 months"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={200}
            required
          />
          <div className="mt-1 text-xs text-gray-500">{tip.length}/200</div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Details (Optional)
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Share your experience..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={4}
            maxLength={500}
          />
          <div className="mt-1 text-xs text-gray-500">{body.length}/500</div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value as CategoryId)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={submitting || !tip.trim()}
          className="w-full px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
        >
          {submitting ? 'Sharing...' : 'Share Insight'}
        </button>
      </form>
    </div>
  );
};

const SearchBar: React.FC<{
  onSearch: (q: string) => void;
  onCategory: (c: string | null) => void;
  selectedCategory: string | null;
  categories: { id: string; name: string; count: number }[];
}> = ({ onSearch, onCategory, selectedCategory, categories }) => {
  const [query, setQuery] = useState('');
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            onSearch(e.target.value);
          }}
          placeholder="Search insights..."
          className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => onCategory(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            selectedCategory === null
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => onCategory(c.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === c.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {c.name} ({c.count})
          </button>
        ))}
      </div>
    </div>
  );
};

const Dashboard: React.FC<{
  insights: Insight[];
  categoryStats: { id: string; name: string; count: number }[];
}> = ({ insights, categoryStats }) => {
  const categoryData = useMemo(() => {
    return {
      labels: categoryStats.map(c => c.name),
      datasets: [
        {
          data: categoryStats.map(c => c.count),
          backgroundColor: [
            '#3b82f6',
            '#8b5cf6',
            '#10b981',
            '#f59e0b',
            '#ef4444',
            '#06b6d4',
            '#ec4899',
            '#6366f1',
          ],
          borderWidth: 0,
        },
      ],
    };
  }, [categoryStats]);

  const activityData = useMemo(() => {
    const labels = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    });
    return {
      labels,
      datasets: [
        {
          label: 'Insights Posted',
          data: [12, 19, 15, 25, 22, 30, 28],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.1)',
          tension: 0.4,
          fill: true,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        },
      ],
    };
  }, []);

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Insights</span>
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{insights.length}</div>
          <div className="mt-1 text-sm text-green-600 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            +12% this week
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Upvotes</span>
            <ChevronUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {insights.reduce((s, i) => s + i.upvotes, 0)}
          </div>
          <div className="mt-1 text-sm text-green-600 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            +18% this week
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Blockchain Synced</span>
            <Shield className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {insights.filter(i => i.synced).length}
          </div>
          <div className="mt-1 text-sm text-gray-600">
            {insights.length
              ? ((insights.filter(i => i.synced).length / insights.length) * 100).toFixed(0)
              : 0}
            % synced
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Category Distribution</h3>
          </div>
          <div style={{ height: '280px' }}>
            <Doughnut data={categoryData} options={chartOpts} />
          </div>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Weekly Activity</h3>
          </div>
          <div style={{ height: '280px' }}>
            <Line data={activityData} options={chartOpts} />
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------
   MAIN APP
------------------------------------------------- */
export default function CreditChain() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [filtered, setFiltered] = useState<Insight[]>([]);
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [view, setView] = useState<'feed' | 'submit' | 'dashboard'>('feed');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingUpvote, setPendingUpvote] = useState<string | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);

  const hashedId = generateHashedId();

  useEffect(() => {
    setLoading(true);
    setError(null);
    setInsights([]);

    getAllInsights()
      .then(data => {
        const withDates = data.map(i => ({
          ...i,
          createdAt: new Date(i.createdAt || Date.now()),
        }));
        const sorted = sortByScore(withDates);
        setInsights(sorted);
        setFiltered(sorted);
      })
      .catch(err => {
        console.error('API error → fallback to mock', err);
        
        const mock: Insight[] = [
          {
            id: '1',
            tip: 'Request credit limit increases every 6 months',
            body: 'Most issuers allow soft-pull increases online. This dropped my utilization from 45% to 12% without opening new accounts. Credit score jumped 67 points in 2 months. The key is to do it consistently and track your progress.',
            category: 'credit-building',
            hashedId: 'hashed_abc123',
            createdAt: new Date(Date.now() - 3_600_000),
            upvotes: 234,
            onChainIndex: 1001,
            synced: true,
          },
          {
            id: '2',
            tip: "Become an authorized user on a family member's old card",
            body: 'Added to my parent\'s 15-year-old card with perfect payment history. Their history instantly reflected on my report. Score went from 620 to 720 in one reporting cycle. Make sure the card has low utilization and no late payments.',
            category: 'credit-building',
            hashedId: 'hashed_def456',
            createdAt: new Date(Date.now() - 7_200_000),
            upvotes: 892,
            onChainIndex: 1002,
            synced: true,
          },
          {
            id: '3',
            tip: 'Use the avalanche method for credit card debt',
            body: 'Pay minimums on all cards, then attack highest APR first. Saved $3,400 in interest over 18 months compared to snowball method. Math doesn\'t lie - tackle the expensive debt first.',
            category: 'debt-payoff',
            hashedId: 'hashed_ghi789',
            createdAt: new Date(Date.now() - 10_800_000),
            upvotes: 567,
            onChainIndex: 1003,
            synced: true,
          },
          {
            id: '4',
            tip: 'Set up automatic payments 48 hours before due date',
            body: '',
            category: 'credit-building',
            hashedId: 'hashed_jkl012',
            createdAt: new Date(Date.now() - 14_400_000),
            upvotes: 423,
            onChainIndex: 1004,
            synced: true,
          },
          {
            id: '5',
            tip: 'Chase 5/24 rule - wait until under 5 new accounts before applying',
            body: '',
            category: 'credit-cards',
            hashedId: 'hashed_mno345',
            createdAt: new Date(Date.now() - 18_000_000),
            upvotes: 321,
            onChainIndex: 1005,
            synced: false,
          },
        ];

        const sorted = sortByScore(mock);
        setInsights(sorted);
        setFiltered(sorted);
        setError(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const categoryStats = useMemo(() => {
    return CATEGORY_DEFS.map(cat => ({
      ...cat,
      count: insights.filter(i => i.category === cat.id).length,
    }));
  }, [insights]);

  useEffect(() => {
    const stored = localStorage.getItem('creditchain_upvoted');
    if (stored) setUpvotedIds(new Set(JSON.parse(stored)));
  }, []);

  useEffect(() => {
    let list = insights;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        i =>
          i.tip.toLowerCase().includes(q) ||
          (i.body && i.body.toLowerCase().includes(q))
      );
    }

    if (selectedCategory) {
      list = list.filter(i => i.category === selectedCategory);
    }

    setFiltered(list);
  }, [insights, searchQuery, selectedCategory]);

  const handleUpvote = useCallback(
    async (id: string) => {
      if (upvotedIds.has(id)) return;

      // Optimistically update the UI immediately
      setInsights(prev => {
        const updated = prev.map(insight =>
          insight.id === id 
            ? { ...insight, upvotes: (insight.upvotes || 0) + 1 }
            : insight
        );
        return sortByScore(updated);
      });

      const newSet = new Set(upvotedIds).add(id);
      setUpvotedIds(newSet);
      localStorage.setItem('creditchain_upvoted', JSON.stringify([...newSet]));
      setPendingUpvote(id);

      try {
        const response = await addUpvote(id);
        // Update with server response to ensure consistency
        setInsights(prev => {
          const updated = prev.map(insight =>
            insight.id === id 
              ? { ...insight, upvotes: response.upvotes }
              : insight
          );
          return sortByScore(updated);
        });
      } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        setError(`Failed to upvote: ${e.message}`);
        
        // Revert optimistic update on error
        const reverted = new Set(upvotedIds);
        reverted.delete(id);
        setUpvotedIds(reverted);
        localStorage.setItem('creditchain_upvoted', JSON.stringify([...reverted]));

        setInsights(prev => {
          const updated = prev.map(insight =>
            insight.id === id
              ? { ...insight, upvotes: Math.max(0, (insight.upvotes || 0) - 1) }
              : insight
          );
          return sortByScore(updated);
        });
      } finally {
        setPendingUpvote(null);
      }
    },
    [upvotedIds]
  );

  const handleSubmit = useCallback(
    async (payload: CreateInsightPayload) => {
      try {
        const created = await postInsight(payload);
        
        const normalizedInsight: Insight = {
          ...created,
          createdAt: new Date(created.createdAt || Date.now()),
        };

        setInsights(prev => {
          const updated = [normalizedInsight, ...prev];
          return sortByScore(updated);
        });
        setView('feed');
      } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        alert(e.message);
      }
    },
    []
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Loading insights…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modal */}
      {selectedInsight && (
        <InsightModal
          insight={selectedInsight}
          onClose={() => setSelectedInsight(null)}
          onUpvote={handleUpvote}
          hasUpvoted={upvotedIds.has(selectedInsight.id)}
          isPending={pendingUpvote === selectedInsight.id}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">CreditChain</h1>
              <p className="text-xs text-gray-500 hidden sm:block">Anonymous Financial Intelligence</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-green-50 border border-green-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-700" />
            <span className="text-xs font-medium text-green-700">Blockchain</span>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-[61px] z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex gap-1">
          {(['feed', 'submit', 'dashboard'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                view === v
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {v === 'feed' && <TrendingUp className="w-4 h-4" />}
                {v === 'submit' && <Plus className="w-4 h-4" />}
                {v === 'dashboard' && <BarChart3 className="w-4 h-4" />}
                <span className="hidden sm:inline">
                  {v === 'feed' ? 'Feed' : v === 'submit' ? 'Share' : 'Analytics'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p>{error}</p>
          <button 
            onClick={() => setError(null)}
            className="mt-2 px-3 py-1 bg-red-200 hover:bg-red-300 rounded text-sm"
          >
            Dismiss
          </button>
        </div>
      )}
      <main className="max-w-4xl mx-auto">
        {/* FEED */}
        {view === 'feed' && (
          <div>
            {/* Search/Filter - Sticky */}
            <div className="sticky top-[109px] z-30 bg-gray-50 border-b border-gray-200 px-4 sm:px-6 py-3">
              <SearchBar
                onSearch={setSearchQuery}
                onCategory={setSelectedCategory}
                selectedCategory={selectedCategory}
                categories={categoryStats}
              />
            </div>

            {/* Feed Header */}
            <div className="px-4 sm:px-6 py-3 bg-white border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                {selectedCategory
                  ? `${CATEGORY_DEFS.find(c => c.id === selectedCategory)?.name ?? 'Unknown'}`
                  : 'Trending Insights'}
              </h2>
              <span className="text-xs text-gray-500">{filtered.length}</span>
            </div>

            {/* Feed List */}
            {filtered.length === 0 ? (
              <div className="py-16 text-center px-4">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No insights found</h3>
                <p className="text-gray-600 text-sm">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="bg-white">
                {filtered.map(i => (
                  <InsightCard
                    key={i.id}
                    insight={i}
                    onUpvote={handleUpvote}
                    hasUpvoted={upvotedIds.has(i.id)}
                    isPending={pendingUpvote === i.id}
                    onClick={() => setSelectedInsight(i)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUBMIT */}
        {view === 'submit' && (
          <div className="px-4 sm:px-6 py-8 max-w-2xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Share Your Insight</h2>
              <p className="text-gray-600 text-sm">
                Help others improve their credit. All submissions are anonymous and blockchain-secured.
              </p>
            </div>

            <InsightForm onSubmit={handleSubmit} categories={CATEGORY_DEFS} />

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Your Privacy is Protected</p>
                  <p className="text-blue-700 text-xs">
                    Your identity: <span className="font-mono">{hashedId}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DASHBOARD */}
        {view === 'dashboard' && (
          <div className="px-4 sm:px-6 py-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Analytics Dashboard</h2>
            <Dashboard insights={insights} categoryStats={categoryStats} />
          </div>
        )}
      </main>
    </div>
  );
}