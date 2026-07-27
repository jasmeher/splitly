import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { AddMemberModal } from '../components/AddMemberModal';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, UserPlus, Users, Shield, Trash2, Tag, AlertCircle } from 'lucide-react';

interface GroupMember {
  _id: string;
  user: {
    _id: string;
    fullName: string;
    email: string;
    username: string;
    avatar?: string;
  };
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: string;
}

interface GroupDetails {
  _id: string;
  name: string;
  category: string;
  description: string;
  currency: string;
  createdBy: string;
  createdAt: string;
}

export const GroupDetail = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user: currentUser } = useAuth();

  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

  useEffect(() => {
    if (groupId) {
      fetchGroupAndMembers();
    }
  }, [groupId]);

  const fetchGroupAndMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      const [groupRes, membersRes] = await Promise.all([
        apiFetch(`/groups/${groupId}`),
        apiFetch(`/groups/${groupId}/members`)
      ]);

      setGroup(groupRes.data);
      setMembers(membersRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  const handleMemberAdded = (newMember: GroupMember) => {
    setMembers((prev) => {
      const filtered = prev.filter((m) => m._id !== newMember._id);
      return [...filtered, newMember];
    });
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this group?`)) {
      return;
    }

    setActionError(null);

    try {
      await apiFetch(`/groups/${groupId}/members/${userId}`, {
        method: 'DELETE'
      });

      setMembers((prev) => prev.filter((m) => m.user._id !== userId));
    } catch (err: any) {
      setActionError(err.message || 'Failed to remove member');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'OWNER':
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold flex items-center gap-1">
            <Shield className="h-3 w-3" /> Owner
          </span>
        );
      case 'ADMIN':
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold flex items-center gap-1">
            <Shield className="h-3 w-3" /> Admin
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-slate-500/10 text-slate-400 border border-slate-500/20 text-xs font-semibold">
            Member
          </span>
        );
    }
  };

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

  if (error || !group) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-100">
        <Navbar />
        <div className="max-w-4xl mx-auto px-6 py-12 text-center">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 mb-6">
            {error || 'Group not found'}
          </div>
          <Link to="/groups" className="text-emerald-400 hover:underline font-bold text-sm">
            &larr; Back to Groups
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans relative">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-10 relative z-10">
        {/* Back navigation */}
        <Link
          to="/groups"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Groups</span>
        </Link>

        {actionError && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400 flex items-start gap-3 animate-pulse">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Member Removal Blocked</p>
              <p className="text-xs opacity-90">{actionError}</p>
            </div>
          </div>
        )}

        {/* Group Header Frame */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl mb-10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                {group.category}
              </span>
              <span className="text-xs text-slate-400">
                Created {new Date(group.createdAt).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">{group.name}</h1>
            <p className="text-slate-400 text-sm mt-2 max-w-xl">
              {group.description || 'No description provided for this group.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddMemberModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:opacity-95 transition-all cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Member</span>
            </button>
          </div>
        </div>

        {/* Members Roster Section */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-emerald-400" />
              <h3 className="text-xl font-bold text-white">Group Members ({members.length})</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {members.map((m) => (
              <div
                key={m._id}
                className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-slate-200">
                    {m.user.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-white">{m.user.fullName}</p>
                      {getRoleBadge(m.role)}
                    </div>
                    <p className="text-xs text-slate-400">@{m.user.username} • {m.user.email}</p>
                  </div>
                </div>

                {/* Remove button (allowed if user is not self) */}
                {currentUser?.id !== m.user._id && (
                  <button
                    onClick={() => handleRemoveMember(m.user._id, m.user.fullName)}
                    title="Remove Member"
                    className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Add Member Modal */}
      {groupId && (
        <AddMemberModal
          groupId={groupId}
          isOpen={isAddMemberModalOpen}
          onClose={() => setIsAddMemberModalOpen(false)}
          onMemberAdded={handleMemberAdded}
        />
      )}
    </div>
  );
};

export default GroupDetail;
