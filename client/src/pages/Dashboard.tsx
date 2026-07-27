import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { apiFetch } from '../api';
import { ArrowUpRight, ArrowDownLeft, TrendingUp, TrendingDown, Users, Award } from 'lucide-react';

interface FriendBreakdown {
  user: {
    _id: string;
    fullName: string;
    email: string;
    avatar: string;
  };
  netBalance: number;
}

interface DashboardData {
  totalYouOwe: number;
  totalOwedToYou: number;
  netBalance: number;
  friendsBreakdown: FriendBreakdown[];
}

export const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await apiFetch('/dashboard');
        setStats(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-100">
        <Navbar />
        <div className="flex h-[70vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans relative">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10 z-10 relative">

        {error && (
          <div className="mb-8 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* User Card */}
        <div className="mb-10 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-2xl font-black uppercase shadow-inner">
              {user?.fullName.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white">{user?.fullName}</h2>
              <p className="text-slate-400 text-sm">{user?.email} • @{user?.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-400">
            <Award className="h-4 w-4" />
            Verified Core Backend Integration
          </div>
        </div>

        {/* Financial Aggregates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Card: Total You Owe */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-lg relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total You Owe</span>
              <span className="p-2 rounded-xl bg-red-500/10 text-red-400"><ArrowDownLeft className="h-5 w-5" /></span>
            </div>
            <h3 className="text-3xl font-extrabold text-white flex items-center gap-0.5">
              <span className="text-xl font-medium text-slate-500">₹</span>
              {stats?.totalYouOwe.toFixed(2)}
            </h3>
            <p className="text-xs text-slate-400 mt-2">Outstanding debt splits to friends</p>
          </div>

          {/* Card: Total Owed to You */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-lg relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Owed To You</span>
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400"><ArrowUpRight className="h-5 w-5" /></span>
            </div>
            <h3 className="text-3xl font-extrabold text-white flex items-center gap-0.5">
              <span className="text-xl font-medium text-slate-500">₹</span>
              {stats?.totalOwedToYou.toFixed(2)}
            </h3>
            <p className="text-xs text-slate-400 mt-2">Credits others owe you for paid bills</p>
          </div>

          {/* Card: Net Balance */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-lg relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Net Balance</span>
              <span className={`p-2 rounded-xl ${stats && stats.netBalance >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {stats && stats.netBalance >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              </span>
            </div>
            <h3 className={`text-3xl font-extrabold flex items-center gap-0.5 ${stats && stats.netBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              <span className="text-xl font-medium opacity-60">₹</span>
              {stats && stats.netBalance >= 0 ? `+${stats.netBalance.toFixed(2)}` : stats?.netBalance.toFixed(2)}
            </h3>
            <p className="text-xs text-slate-400 mt-2">Overall financial status</p>
          </div>
        </div>

        {/* Friends Balances Section */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-6">
            <Users className="h-5 w-5 text-emerald-400" />
            <h3 className="text-xl font-bold text-white">Friend Balances Breakdown</h3>
          </div>

          {!stats || stats.friendsBreakdown.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-white/10 rounded-xl bg-white/2">
              <p className="text-slate-400 text-sm">No active balances. You are completely settled!</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {stats.friendsBreakdown.map((item) => (
                <div key={item.user._id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                      {item.user.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white">{item.user.fullName}</p>
                      <p className="text-xs text-slate-400">{item.user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${item.netBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {item.netBalance >= 0 ? `owes you ₹${item.netBalance.toFixed(2)}` : `you owe ₹${Math.abs(item.netBalance).toFixed(2)}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
