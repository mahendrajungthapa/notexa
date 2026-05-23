<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;

class IsPremium
{
    public function handle(Request $request, Closure $next)
    {
        if (!$request->user() || !$request->user()->isPremium()) {
            return response()->json(['status' => 'error', 'message' => 'Premium required.'], 403);
        }
        return $next($request);
    }
}
