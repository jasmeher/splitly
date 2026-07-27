import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { CreateGroupModal } from '../components/CreateGroupModal';
import { apiFetch } from '../api';
import { Plus, Users, Compass, Home, Plane, Tag, ChevronRight } from 'lucide-react';

interface Group {
  _id: string;
  name: string;
  category: string;
  description: string;
  currency: string;
  memberCount?: number;
  createdBy: string;
  createdAt: string;
}

export const Groups = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/groups');
      setGroups(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch groups');
    } finally {
      setLoading(false);
    }
  };

  const handleGroupCreated = (newGroup: Group) => {
    setGroups((prev) => [newGroup, ...prev]);
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'apartment':
        return <Home className="h-5 w-5 text-indigo-400" />;
      case 'trip':
        return <Plane className="h-5 w-5 text-amber-400" />;
      case 'home':
        return <Home className="h-5 w-5 text-emerald-400" />;
      default:
        return <Tag className="h-5 w-5 text-teal-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans relative">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-10 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Your Groups</h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage shared bills, trips, and household expense spaces
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:opacity-95 transition-all cursor-pointer"
          >
            <Plus className="h-5 w-5" />
            <span>Create Group</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-44 rounded-2xl border border-white/5 bg-white/5 animate-pulse"></div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl bg-white/2 max-w-lg mx-auto">
            <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Compass className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-white">No Groups Found</h3>
            <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto mb-6">
              You haven't created or joined any expense groups yet.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-sm font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Create Your First Group
            </button>
          </div>
        ) : (
          /* Groups Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <Link
                key={group._id}
                to={`/groups/${group._id}`}
                className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl hover:border-emerald-500/30 hover:bg-white/10 transition-all duration-300 flex flex-col justify-between shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="p-2.5 rounded-xl bg-white/5 border border-white/10 group-hover:border-emerald-500/30 transition-colors">
                      {getCategoryIcon(group.category)}
                    </span>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400">
                      {group.category}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {group.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 min-h-[2rem]">
                    {group.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-6 border-t border-white/10 mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                    <Users className="h-4 w-4 text-emerald-400" />
                    <span>{group.memberCount || 1} Members</span>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                    View Details
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onGroupCreated={handleGroupCreated}
      />
    </div>
  );
};

export default Groups;
