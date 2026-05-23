<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class SubscriptionPlan extends Model
{
    protected $fillable = ['name','description','price','currency','duration_days','storage_limit','file_sharing_enabled','is_active'];
    protected $casts = ['price'=>'decimal:2','file_sharing_enabled'=>'boolean','is_active'=>'boolean'];
}
