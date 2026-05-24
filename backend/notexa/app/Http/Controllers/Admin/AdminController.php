<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Note;
use App\Models\NoteShare;
use App\Models\Friendship;
use App\Models\File;
use App\Models\SiteSetting;
use App\Models\ActivityLog;
use App\Services\MailSettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class AdminController extends Controller
{
    // ═══ DASHBOARD ═══
    public function dashboard()
    {
        $today = now()->toDateString();
        $thisMonth = now()->startOfMonth();
        $last30Days = now()->subDays(30);
        $storageUsed = (int) User::sum('storage_used');

        return response()->json(['status' => 'success', 'data' => [
            'total_users' => User::count(),
            'active_users' => User::where('is_active', true)->count(),
            'total_notes' => Note::count(),
            'total_shared_notes' => NoteShare::count(),
            'total_friendships' => Friendship::where('status', 'accepted')->count(),
            'total_files' => File::count(),
            'total_storage_gb' => round($storageUsed / 1073741824, 2),
            'total_storage_used' => $this->formatBytes($storageUsed),
            'new_users_today' => User::whereDate('created_at', $today)->count(),
            'new_users_month' => User::where('created_at', '>=', $thisMonth)->count(),
            'recent_signups' => User::where('created_at', '>=', $last30Days)->count(),
            'notes_today' => Note::whereDate('created_at', $today)->count(),
            'users_chart' => User::where('created_at', '>=', now()->subDays(30))
                ->select(DB::raw('DATE(created_at) as date'), DB::raw('COUNT(*) as count'))
                ->groupBy('date')->orderBy('date')->get(),
        ]]);
    }

    // ═══ USERS ═══
    public function users(Request $request)
    {
        $query = User::withCount(['notes', 'files']);

        if ($s = $request->get('search')) {
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")->orWhere('username', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%");
            });
        }
        if ($r = $request->get('role')) $query->where('role', $r);

        return response()->json(['status' => 'success', 'data' =>
            $query->orderByDesc('created_at')->paginate($request->get('per_page', 20))
        ]);
    }

    // Full user detail with ALL data
    public function userDetail(User $user)
    {
        $user->load(['notes' => function ($q) { $q->select('id','user_id','title','color','is_pinned','is_trashed','created_at','updated_at'); },
            'files']);

        $friendsList = $user->friends();
        $sharedByUser = NoteShare::where('shared_by', $user->id)->with('note:id,title', 'recipient:id,name,username')->get();
        $sharedWithUser = NoteShare::where('shared_with', $user->id)->with('note:id,title', 'sharer:id,name,username')->get();

        return response()->json(['status' => 'success', 'data' => [
            'user' => $user,
            'friends' => $friendsList->map(fn($f) => ['id'=>$f->id,'name'=>$f->name,'username'=>$f->username,'email'=>$f->email]),
            'friends_count' => count($friendsList),
            'shared_by_user' => $sharedByUser,
            'shared_with_user' => $sharedWithUser,
            'storage_used_mb' => round($user->storage_used / 1048576, 2),
            'storage_limit_mb' => round($user->storage_limit / 1048576, 2),
            'activity' => ActivityLog::where('user_id', $user->id)->latest()->limit(50)->get(),
        ]]);
    }

    public function updateUser(Request $request, User $user)
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'username' => 'sometimes|string|max:30|alpha_dash|unique:users,username,' . $user->id,
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'role' => 'sometimes|in:user,admin',
            'is_active' => 'sometimes|boolean',
            'storage_limit' => 'sometimes|integer',
        ]);
        $user->update($request->only(['name','username','email','role','is_active','storage_limit']));
        return response()->json(['status' => 'success', 'data' => $user->fresh()]);
    }

    public function deleteUser(User $user)
    {
        if ($user->role === 'admin') return response()->json(['status'=>'error','message'=>'Cannot delete admin.'], 400);
        $user->delete();
        return response()->json(['status' => 'success']);
    }

    // ═══ NOTES ═══
    public function notes(Request $request)
    {
        $query = Note::with('user:id,name,username');
        if ($s = $request->get('search')) $query->where('title', 'like', "%{$s}%");
        if ($uid = $request->get('user_id')) $query->where('user_id', $uid);
        return response()->json(['status' => 'success', 'data' => $query->orderByDesc('created_at')->paginate(20)]);
    }

    public function deleteNote(Note $note) { $note->delete(); return response()->json(['status' => 'success']); }

    // ═══ SETTINGS (includes SMTP, R2, and AI keys) ═══
    public function getSettings(Request $request)
    {
        $group = $request->get('group');
        $query = SiteSetting::query();
        if ($group) $query->where('group', $group);
        return response()->json(['status' => 'success', 'data' => $query->get()]);
    }

    public function updateSettings(Request $request)
    {
        $request->validate(['settings' => 'required|array']);

        foreach ($request->settings as $s) {
            $key = $s['key'] ?? null;
            if (!$key) continue;
            $value = $s['value'] ?? '';
            $type = $s['type'] ?? 'string';
            $group = $s['group'] ?? 'general';

            SiteSetting::set($key, $value, $type, $group);
        }

        return response()->json(['status' => 'success', 'message' => 'Settings updated successfully.', 'data' => SiteSetting::all()]);
    }

    public function testSmtp(Request $request)
    {
        $request->validate(['email' => 'required|email']);
        try {
            if (!MailSettingsService::hasSmtpConfig()) {
                return response()->json(['status' => 'error', 'message' => 'SMTP host is required before sending a test email.'], 422);
            }

            MailSettingsService::apply();
            Mail::raw('Test email from Notexa admin panel.', function ($m) use ($request) {
                $m->to($request->email)->subject('SMTP Test - Notexa');
            });
            return response()->json(['status' => 'success', 'message' => 'Email sent.']);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'SMTP Error: ' . $e->getMessage()], 500);
        }
    }

    // ═══ SHARED NOTES & FRIENDSHIPS ═══
    public function sharedNotes(Request $request)
    {
        return response()->json(['status' => 'success', 'data' =>
            NoteShare::with(['note:id,title', 'sharer:id,name,username', 'recipient:id,name,username'])
                ->orderByDesc('created_at')->paginate(20)
        ]);
    }

    public function friendships(Request $request)
    {
        $query = Friendship::with(['sender:id,name,username', 'receiver:id,name,username']);
        if ($st = $request->get('status')) $query->where('status', $st);
        return response()->json(['status' => 'success', 'data' => $query->orderByDesc('created_at')->paginate(20)]);
    }

    public function activityLogs(Request $request)
    {
        return response()->json(['status' => 'success', 'data' =>
            ActivityLog::with('user:id,name,username')->orderByDesc('created_at')->paginate(50)
        ]);
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes >= 1073741824) {
            return round($bytes / 1073741824, 2) . ' GB';
        }

        if ($bytes >= 1048576) {
            return round($bytes / 1048576, 2) . ' MB';
        }

        return round($bytes / 1024, 2) . ' KB';
    }
}
