<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    protected $fillable = ['user_id','action','subject_type','subject_id','metadata'];
    protected $casts = ['metadata'=>'array'];
    public function user() { return $this->belongsTo(User::class); }

    public static function log(int $userId, string $action, ?string $subjectType = null, ?int $subjectId = null, ?array $metadata = null): void
    {
        static::create(compact('userId','action','subjectType','subjectId','metadata'));
    }
}
