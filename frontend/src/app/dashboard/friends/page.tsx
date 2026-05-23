'use client';
import { useEffect, useState } from 'react';
import { friendsApi } from '@/services/api';
import toast from 'react-hot-toast';
import { UserPlus, Users, Check, X, Trash2, AtSign, Crown } from 'lucide-react';

const displayText = (value: unknown, fallback = '') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const initial = (value: unknown) => displayText(value, '?').charAt(0).toUpperCase();

const apiMessage = (error: any, fallback: string) => error?.response?.data?.message || error?.message || fallback;

export default function FriendsPage() {
  const [friends, setFriends] = useState<any[]>([]);
  const [received, setReceived] = useState<any[]>([]);
  const [sent, setSent] = useState<any[]>([]);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<'friends' | 'requests' | 'add'>('friends');

  const fetchData = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const [friendsResponse, requestsResponse] = await Promise.all([
        friendsApi.list(),
        friendsApi.pendingRequests(),
      ]);

      setFriends(friendsResponse.data.data || []);
      setReceived(requestsResponse.data.data?.received || []);
      setSent(requestsResponse.data.data?.sent || []);
    } catch (error: any) {
      toast.error(apiMessage(error, 'Could not load friend requests.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanedUsername = username.replaceAll('@', '').trim();
    if (!cleanedUsername || sending) return;

    setSending(true);
    try {
      const response = await friendsApi.sendRequest(cleanedUsername);
      toast.success(response.data?.message || 'Friend request sent.');
      setUsername('');
      await fetchData(true);
      setTab('requests');
    } catch (error: any) {
      toast.error(apiMessage(error, 'Failed to send request.'));
    } finally {
      setSending(false);
    }
  };

  const runFriendAction = async (id: number, action: () => Promise<any>, successMessage: string) => {
    const key = String(id);
    if (busyId) return;

    setBusyId(key);
    try {
      await action();
      toast.success(successMessage);
      await fetchData(true);
    } catch (error: any) {
      toast.error(apiMessage(error, 'Friend request action failed.'));
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = received.length;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Friends</h1>
        {refreshing && <span className="text-xs text-gray-400">Updating...</span>}
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-6">
        {[
          { key: 'friends' as const, label: 'My Friends', count: friends.length },
          { key: 'requests' as const, label: 'Requests', count: pendingCount },
          { key: 'add' as const, label: 'Add Friend', count: 0 },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition ${tab === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
            {t.label} {t.count > 0 && <span className="ml-1 bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded-full">{t.count}</span>}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div> : (
        <>
          {tab === 'friends' && (
            <div className="space-y-2">
              {friends.length === 0 ? (
                <div className="text-center py-16"><Users size={48} className="mx-auto text-gray-300 mb-4" /><p className="text-gray-500">No friends yet</p></div>
              ) : friends.map((friend: any) => {
                const name = displayText(friend.name, 'Unknown user');
                const friendUsername = displayText(friend.username);

                return (
                  <div key={friend.id} className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-sm">{initial(name)}</div>
                      <div>
                        <p className="font-semibold text-sm flex items-center gap-1">{name} {friend.is_premium && <Crown size={12} className="text-amber-500" />}</p>
                        <p className="text-xs text-gray-400">@{friendUsername}</p>
                      </div>
                    </div>
                    <button
                      disabled={busyId !== null}
                      onClick={() => {
                        if (confirm('Remove friend?')) {
                          runFriendAction(friend.id, () => friendsApi.removeFriend(friend.id), 'Removed');
                        }
                      }}
                      className="text-gray-400 hover:text-red-500 transition disabled:opacity-40"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'requests' && (
            <div className="space-y-4">
              {received.length > 0 && <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Received</h3>
                {received.map((request: any) => {
                  const senderName = displayText(request.sender?.name, 'Unknown user');
                  const senderUsername = displayText(request.sender?.username);

                  return (
                    <div key={request.id} className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 p-4 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">{initial(senderName)}</div>
                        <div><p className="font-semibold text-sm">{senderName}</p><p className="text-xs text-gray-400">@{senderUsername}</p></div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          disabled={busyId !== null}
                          onClick={() => runFriendAction(request.id, () => friendsApi.acceptRequest(request.id), 'Accepted!')}
                          className="p-2 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 disabled:opacity-40"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          disabled={busyId !== null}
                          onClick={() => runFriendAction(request.id, () => friendsApi.rejectRequest(request.id), 'Rejected')}
                          className="p-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 disabled:opacity-40"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>}
              {sent.length > 0 && <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Sent (Pending)</h3>
                {sent.map((request: any) => {
                  const receiverName = displayText(request.receiver?.name, 'Unknown user');
                  const receiverUsername = displayText(request.receiver?.username);

                  return (
                    <div key={request.id} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 mb-2 opacity-70">
                      <div className="w-10 h-10 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center font-bold text-sm">{initial(receiverName)}</div>
                      <div><p className="font-medium text-sm">{receiverName}</p><p className="text-xs text-gray-400">@{receiverUsername} - Waiting...</p></div>
                    </div>
                  );
                })}
              </div>}
              {received.length === 0 && sent.length === 0 && <p className="text-center text-gray-400 py-16">No pending requests</p>}
            </div>
          )}

          {tab === 'add' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2"><UserPlus size={18} /> Add Friend by Username</h3>
              <form onSubmit={handleSend} className="flex gap-3">
                <div className="relative flex-1">
                  <AtSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="Enter username"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition disabled:opacity-60"
                >
                  {sending ? 'Sending...' : 'Send Request'}
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
