<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $fillable = ['user_id','plan_id','identifier','trx_number','amount','currency','status','gateway_response','payment_method'];
    protected $casts = ['amount'=>'decimal:2','gateway_response'=>'array'];
    public function user() { return $this->belongsTo(User::class); }
    public function plan() { return $this->belongsTo(SubscriptionPlan::class, 'plan_id'); }
}
