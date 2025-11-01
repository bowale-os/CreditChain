'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
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
   Dynamic Categories (names fixed, counts computed from insights)
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

// ---- Put this at the top, after imports ----
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
  return safeUpvotes / Math.pow(ageDays + 2, 1.5);
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
   Components
------------------------------------------------- */
const InsightCard: React.FC<{
  insight: Insight;
  onUpvote: (id: string) => void;
  hasUpvoted: boolean;
  isPending:boolean
}> = ({ insight, onUpvote, hasUpvoted, isPending}) => {
  const cat = CATEGORY_DEFS.find(c => c.id === insight.category);
  const score = calculatePopularityScore(insight.upvotes, insight.createdAt);

  return (
    <article className="group relative p-5 bg-white border border-gray-200 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all">
      <div className="flex gap-4">
        {/* Upvote */}
        <div className="flex flex-col items-center gap-1 pt-1">
          <button
              onClick={() => onUpvote(insight.id)}
              disabled={hasUpvoted || isPending}
              className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-all ${
                hasUpvoted
                  ? 'bg-blue-50 border-blue-200 text-blue-600 cursor-not-allowed'
                  : isPending
                  ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-wait animate-pulse'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              <ChevronUp className="w-5 h-5" />
          </button>
          <span className={`text-sm font-semibold ${hasUpvoted ? 'text-blue-600' : 'text-gray-700'}`}>
            {insight.upvotes}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
              <Tag className="w-3 h-3" />
              {cat?.name ?? 'Unknown'}
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {insight.createdAt ? formatTimeAgo(insight.createdAt) : 'just now'}
            </span>
            {insight.synced && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="w-3 h-3" />
                <span className="hidden sm:inline">Synced</span>
              </span>
            )}
          </div>

          <h3 className="text-base font-semibold text-gray-900 mb-2 leading-snug">
            {insight.tip}
          </h3>

          {insight.body && (
            <p className="text-sm text-gray-600 leading-relaxed mb-3">{insight.body}</p>
          )}

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="font-mono">
              {(insight.hashedId || 'anon').slice(0, 12)}...
            </span>
            <span className="text-gray-300">•</span>
            <span>Score: {score.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </article>
  );
};

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

    // Simulate API delay
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
            rows={3}
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
          placeholder="Search insights by keyword..."
          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => onCategory(null)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
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
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
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
      {/* Stats */}
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

      {/* Charts */}
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

  const hashedId = generateHashedId();

  /* -------------------------------------------------
     Load insights – never blocks the UI
  ------------------------------------------------- */
  useEffect(() => {
    setLoading(true);
    setError(null);
    setInsights([]);

    getAllInsights()
      .then(data => {
        const withDates = data
        .map(i => ({
          ...i,
          createdAt: new Date(i.createdAt || Date.now()),
        }));
        const sorted = sortByScore(withDates);
        setInsights(sorted);
        setFiltered(sorted);
      })
      .catch(err => {
        console.error('API error → fallback to mock', err);
        const warning = 'Live data unavailable – showing demo insights';
        setError(warning);

        const mock: Insight[] = [
          {
            id: '1',
            tip: 'Request credit limit increases every 6 months',
            body: 'Soft-pull increases dropped my utilization from 45% to 12%.',
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
            body: 'Score jumped from 620 to 720 in one cycle.',
            category: 'credit-building',
            hashedId: 'hashed_def456',
            createdAt: new Date(Date.now() - 7_200_000),
            upvotes: 892,
            onChainIndex: 1002,
            synced: true,
          },
        ];

        const sorted = mock.sort(
          (a, b) =>
            calculatePopularityScore(b.upvotes, b.createdAt) -
            calculatePopularityScore(a.upvotes, a.createdAt)
        );

        setInsights(sorted);
        setFiltered(sorted);
        setError(null);
      })
      .finally(() => setLoading(false));
  }, []);


  /* -------------------------------------------------
     Compute real category counts
  ------------------------------------------------- */
  const categoryStats = useMemo(() => {
    return CATEGORY_DEFS.map(cat => ({
      ...cat,
      count: insights.filter(i => i.category === cat.id).length,
    }));
  }, [insights]);

  /* -------------------------------------------------
     Load up-voted IDs from localStorage
  ------------------------------------------------- */
  useEffect(() => {
    const stored = localStorage.getItem('creditchain_upvoted');
    if (stored) setUpvotedIds(new Set(JSON.parse(stored)));
  }, []);

  /* -------------------------------------------------
     Client-side filtering
  ------------------------------------------------- */
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

  /* -------------------------------------------------
     Upvote (API + local)
  ------------------------------------------------- */
  // 3. Your handleUpvote (paste exactly as-is)
const handleUpvote = useCallback(
  async (id: string) => {
    if (upvotedIds.has(id)) return;

    setInsights(prev => {
      const idx = prev.findIndex(i => i.id === id);
      if (idx === -1) return prev;
      const copy = [...prev];
      copy[idx] = { ...copy[idx], upvotes: (copy[idx].upvotes || 0) + 1 };
      return copy;
    });

    const newSet = new Set(upvotedIds).add(id);
    setUpvotedIds(newSet);
    localStorage.setItem('creditchain_upvoted', JSON.stringify([...newSet]));
    setPendingUpvote(id);

    try {
      const { upvotes } = await addUpvote(id);
      setInsights(prev => {
        const updated = prev.map(i =>
          i.id === id ? { ...i, upvotes: upvotes ?? 0 } : i
        );
        return sortByScore(updated);
      });
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      alert(`Failed to upvote: ${e.message}`);
      const reverted = new Set(upvotedIds);
      reverted.delete(id);
      setUpvotedIds(reverted);
      localStorage.setItem('creditchain_upvoted', JSON.stringify([...reverted]));

      setInsights(prev => {
        const idx = prev.findIndex(i => i.id === id);
        if (idx === -1) return prev;
        const copy = [...prev];
        copy[idx] = { ...copy[idx], upvotes: Math.max(0, (copy[idx].upvotes || 0) - 1) };
        return sortByScore(copy);
      });
    } finally {
      setPendingUpvote(null);
    }
  },
  [upvotedIds]
);

  /* -------------------------------------------------
     Submit new insight (API + optimistic UI)
  ------------------------------------------------- */
  const handleSubmit = useCallback(
  async (payload: CreateInsightPayload) => {
    try {
      const created = await postInsight(payload);
      
      // Normalize createdAt here!
      const normalizedInsight: Insight = {
        ...created,
        createdAt: new Date(created.createdAt || Date.now()),
      };

      setInsights(prev => {
        const updated = [normalizedInsight, ...prev];
        return updated.sort(
          (a, b) =>
            calculatePopularityScore(b.upvotes, b.createdAt) -
            calculatePopularityScore(a.upvotes, a.createdAt)
        );
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
        <div className="text-lg text-gray-600">Loading insights…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">CreditChain</h1>
              <p className="text-xs text-gray-500">Anonymous Financial Intelligence</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200">
            <CheckCircle2 className="w-4 h-4 text-green-700" />
            <span className="text-xs font-medium text-green-700">Blockchain Secured</span>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-1">
          {(['feed', 'submit', 'dashboard'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                view === v
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {v === 'feed' && <TrendingUp className="w-4 h-4" />}
                {v === 'submit' && <Plus className="w-4 h-4" />}
                {v === 'dashboard' && <BarChart3 className="w-4 h-4" />}
                <span>
                  {v === 'feed' ? 'Feed' : v === 'submit' ? 'Share Insight' : 'Analytics'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* ----- FEED ----- */}
        {view === 'feed' && (
          <div className="space-y-6">
            <SearchBar
              onSearch={setSearchQuery}
              onCategory={setSelectedCategory}
              selectedCategory={selectedCategory}
              categories={categoryStats}
            />

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedCategory
                  ? `${CATEGORY_DEFS.find(c => c.id === selectedCategory)?.name ?? 'Unknown'} Insights`
                  : 'Trending Insights'}
              </h2>
              <span className="text-sm text-gray-500">{filtered.length} insights</span>
            </div>

            {filtered.length === 0 ? (
              <div className="py-12 text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No insights found</h3>
                <p className="text-gray-600">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map(i => (
                  <InsightCard
                    key={i.id}
                    insight={i}
                    onUpvote={handleUpvote}
                    hasUpvoted={upvotedIds.has(i.id)}
                    isPending={pendingUpvote === i.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ----- SUBMIT ----- */}
        {view === 'submit' && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Share Your Insight</h2>
              <p className="text-gray-600">
                Help others improve their credit and financial health. All submissions are
                anonymous and secured on the blockchain.
              </p>
            </div>

            <InsightForm onSubmit={handleSubmit} categories={CATEGORY_DEFS} />

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Your Privacy is Protected</p>
                  <p className="text-blue-700">
                    Your identity is protected with a hashed ID:{' '}
                    <span className="font-mono text-xs">{hashedId}</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----- DASHBOARD ----- */}
        {view === 'dashboard' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Analytics Dashboard</h2>
            <Dashboard insights={insights} categoryStats={categoryStats} />
          </div>
        )}
      </main>
    </div>
  );
}