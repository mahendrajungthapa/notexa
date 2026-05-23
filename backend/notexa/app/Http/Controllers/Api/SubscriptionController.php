<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPlan;
use App\Models\Payment;
use App\Models\Subscription;
use App\Services\ApiNepalPaymentService;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    public function __construct(private ApiNepalPaymentService $paymentService) {}

    public function plans()
    {
        return response()->json(['status' => 'success', 'data' => SubscriptionPlan::where('is_active', true)->get()]);
    }

    public function mySubscription(Request $request)
    {
        $user = $request->user();
        return response()->json(['status' => 'success', 'data' => [
            'is_premium' => $user->isPremium(),
            'subscription' => $user->activeSubscription?->load('plan'),
            'storage_used' => round($user->storage_used / 1048576, 2),
            'storage_limit' => round($user->storage_limit / 1048576, 2),
        ]]);
    }

    public function subscribe(Request $request)
    {
        $request->validate(['plan_id' => 'required|exists:subscription_plans,id']);
        $user = $request->user();
        $plan = SubscriptionPlan::findOrFail($request->plan_id);

        $result = $this->paymentService->initiatePayment([
            'amount' => $plan->price, 'currency' => $plan->currency,
            'details' => "Notexa {$plan->name}",
            'customer' => [
                'first_name' => explode(' ', $user->name)[0],
                'last_name' => explode(' ', $user->name)[1] ?? '',
                'email' => $user->email, 'mobile' => '',
            ],
        ]);

        if (!$result['success']) {
            return response()->json(['status' => 'error', 'message' => 'Payment failed.', 'errors' => $result['api_response']['message'] ?? []], 400);
        }

        $payment = Payment::create([
            'user_id' => $user->id, 'plan_id' => $plan->id,
            'identifier' => $result['identifier'], 'trx_number' => $result['trx_number'],
            'amount' => $plan->price, 'currency' => $plan->currency,
            'status' => 'pending', 'gateway_response' => $result['api_response'],
        ]);

        return response()->json([
            'status' => 'success', 'redirect_url' => $result['redirect_url'],
            'sdk_url' => $result['sdk_url'], 'payment_id' => $payment->id,
        ]);
    }

    public function handleIPN(Request $request)
    {
        $status = $request->input('status');
        $signature = $request->input('signature');
        $identifier = $request->input('identifier');
        $data = $request->input('data');

        $payment = Payment::where('identifier', $identifier)->first();
        if (!$payment) return response()->json(['status' => 'error'], 404);

        if ($this->paymentService->validateIPN($status, $signature, $identifier, $data)) {
            $payment->update(['status' => 'success', 'gateway_response' => $data]);
            $plan = $payment->plan;
            $user = $payment->user;

            Subscription::where('user_id', $user->id)->where('is_active', true)->update(['is_active' => false]);
            $sub = Subscription::create([
                'user_id' => $user->id, 'plan_id' => $plan->id, 'payment_id' => $payment->id,
                'starts_at' => now(), 'expires_at' => now()->addDays($plan->duration_days), 'is_active' => true,
            ]);
            $user->update(['is_premium' => true, 'premium_expires_at' => $sub->expires_at, 'storage_limit' => $plan->storage_limit]);
        } else {
            $payment->update(['status' => 'failed', 'gateway_response' => $data]);
        }
        return response()->json(['status' => 'success']);
    }

    public function paymentHistory(Request $request)
    {
        return response()->json(['status' => 'success', 'data' =>
            $request->user()->payments()->with('plan:id,name')->orderByDesc('created_at')->paginate(20)
        ]);
    }
}
