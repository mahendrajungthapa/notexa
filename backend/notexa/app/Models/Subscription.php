<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Subscription extends Model
{
    protected $fillable = ['user_id','plan_id','payment_id','starts_at','expires_at','is_active'];
    protected $casts = ['starts_at'=>'datetime','expires_at'=>'datetime','is_active'=>'boolean'];
    public function user() { return $this->belongsTo(User::class); }
    public function plan() { return $this->belongsTo(SubscriptionPlan::class, 'plan_id'); }
    public function payment() { return $this->belongsTo(Payment::class); }
}
