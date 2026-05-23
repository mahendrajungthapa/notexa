'use client';

import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { friendsApi } from '@/services/api';
import toast from 'react-hot-toast';
import { AtSign, Check, Clock, Search, Trash2, UserCheck, UserPlus, Users, X } from 'lucide-react';

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
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState('');
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
      toast.error(apiMessage(error, 'Could not load friends.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const cleaned = query.replaceAll('@', '').trim();
    if (tab !== 'add' || cleaned.length < 2) {
      setResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await friendsApi.searchUsers(cleaned);
        setResults(response.data.data || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query, tab]);

  const sendRequest = async (rawUsername: string) => {
    const cleanedUsername = rawUsername.replaceAll('@', '').trim();
    if (!cleanedUsername || sending) return;

    setSending(cleanedUsername);
    try {
      const response = await friendsApi.sendRequest(cleanedUsername);
      toast.success(response.data?.message || 'Friend request sent.');
      setUsername('');
      setQuery(cleanedUsername);
      await fetchData(true);
      setTab('requests');
    } catch (error: any) {
      toast.error(apiMessage(error, 'Failed to send request.'));
    } finally {
      setSending('');
    }
  };

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    await sendRequest(username);
  };

  const runFriendAction = async (key: string, action: () => Promise<any>, successMessage: string) => {
    if (busyId) return;

    setBusyId(key);
    try {
      await action();
      toast.success(successMessage);
      await fetchData(true);
    } catch (error: any) {
      toast.error(apiMessage(error, 'Friend action failed.'));
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = received.length;
  const sentUsernames = useMemo(() => new Set(sent.map((item) => item.receiver?.username)), [sent]);

  const personRow = (
    key: string,
    name: string,
    usernameText: string,
    tone: 'indigo' | 'blue' | 'gray',
    action?: ReactNode,
    subtitle?: string,
  ) => {
    const toneClass = tone === 'blue'
      ? 'bg-blue-100 text-blue-700'
      : tone === 'gray'
        ? 'bg-gray-100 text-gray-500'
        : 'bg-indigo-100 text-indigo-700';

    return (
      <div key={key} className="flex items-center justify-between gap-3 bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${toneClass}`}>{initial(name)}</div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{name}</p>
            <p className="text-xs text-gray-400 truncate">{subtitle || `@${usernameText}`}</p>
          </div>
        </div>
        {action}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Friends</h1>
        {refreshing && <span className="text-xs text-gray-400">Updating...</span>}
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {[
          { key: 'friends' as const, label: 'My Friends', count: friends.length },
          { key: 'requests' as const, label: 'Requests', count: pendingCount },
          { key: 'add' as const, label: 'Add Friend', count: 0 },
        ].map((item) => (
          <button key={item.key} onClick={() => setTab(item.key)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition ${tab === item.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
            {item.label} {item.count > 0 && <span className="ml-1 bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded-full">{item.count}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>
      ) : (
        <>
          {tab === 'friends' && (
            <div className="space-y-2">
              {friends.length === 0 ? (
                <div className="text-center py-16"><Users size={48} className="mx-auto text-gray-300 mb-4" /><p className="text-gray-500">No friends yet</p></div>
              ) : friends.map((friend: any) => personRow(
                `friend-${friend.id}`,
                displayText(friend.name, 'Unknown user'),
                displayText(friend.username),
                'indigo',
                <button
                  disabled={busyId !== null}
                  onClick={() => {
                    if (confirm('Remove friend?')) {
                      runFriendAction(`remove-${friend.id}`, () => friendsApi.removeFriend(friend.id), 'Removed.');
                    }
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 transition disabled:opacity-40"
                  title="Remove friend"
                >
                  <Trash2 size={16} />
                </button>,
              ))}
            </div>
          )}

          {tab === 'requests' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Received</h3>
                <div className="space-y-2">
                  {received.length === 0 ? (
                    <p className="text-sm text-gray-400 py-5 text-center">No received requests.</p>
                  ) : received.map((request: any) => {
                    const senderName = displayText(request.sender?.name, 'Unknown user');
                    const senderUsername = displayText(request.sender?.username);

                    return personRow(
                      `received-${request.id}`,
                      senderName,
                      senderUsername,
                      'blue',
                      <div className="flex gap-2">
                        <button disabled={busyId !== null} onClick={() => runFriendAction(`accept-${request.id}`, () => friendsApi.acceptRequest(request.id), 'Accepted.')} className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 disabled:opacity-40" title="Accept">
                          <Check size={16} />
                        </button>
                        <button disabled={busyId !== null} onClick={() => runFriendAction(`reject-${request.id}`, () => friendsApi.rejectRequest(request.id), 'Rejected.')} className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-40" title="Reject">
                          <X size={16} />
                        </button>
                      </div>,
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Sent</h3>
                <div className="space-y-2">
                  {sent.length === 0 ? (
                    <p className="text-sm text-gray-400 py-5 text-center">No sent requests.</p>
                  ) : sent.map((request: any) => {
                    const receiverName = displayText(request.receiver?.name, 'Unknown user');
                    const receiverUsername = displayText(request.receiver?.username);

                    return personRow(
                      `sent-${request.id}`,
                      receiverName,
                      receiverUsername,
                      'gray',
                      <button disabled={busyId !== null} onClick={() => runFriendAction(`cancel-${request.id}`, () => friendsApi.cancelRequest(request.id), 'Request cancelled.')} className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-40" title="Cancel request">
                        <X size={16} />
                      </button>,
                      `@${receiverUsername} - waiting`,
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'add' && (
            <div className="space-y-5">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-bold mb-4 flex items-center gap-2"><UserPlus size={18} /> Add by Username</h3>
                <form onSubmit={handleSend} className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <AtSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      placeholder="username"
                    />
                  </div>
                  <button type="submit" disabled={sending !== ''} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition disabled:opacity-60">
                    {sending ? 'Sending...' : 'Send Request'}
                  </button>
                </form>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Search size={18} /> Search Users</h3>
                <div className="relative mb-4">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value.toLowerCase().replace(/[^a-z0-9_@]/g, ''))}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="Search name or username"
                  />
                </div>

                {searching ? (
                  <p className="text-sm text-gray-400 py-6 text-center">Searching...</p>
                ) : results.length === 0 ? (
                  <p className="text-sm text-gray-400 py-6 text-center">{query.trim().length < 2 ? 'Type at least 2 characters.' : 'No users found.'}</p>
                ) : (
                  <div className="space-y-2">
                    {results.map((result) => {
                      const status = sentUsernames.has(result.username) ? 'sent' : result.relationship;
                      const disabled = status !== 'none' || sending !== '';
                      const label = status === 'friend'
                        ? 'Friend'
                        : status === 'sent'
                          ? 'Sent'
                          : status === 'received'
                            ? 'Requested you'
                            : 'Add';

                      return personRow(
                        `result-${result.id}`,
                        displayText(result.name, 'Unknown user'),
                        displayText(result.username),
                        'indigo',
                        <button disabled={disabled} onClick={() => sendRequest(result.username)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:bg-gray-100 disabled:text-gray-500">
                          {status === 'friend' ? <UserCheck size={15} /> : status === 'sent' ? <Clock size={15} /> : <UserPlus size={15} />}
                          {label}
                        </button>,
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
