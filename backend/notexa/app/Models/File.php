<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class File extends Model
{
    protected $fillable = [
        'user_id', 'note_id', 'original_name', 'stored_name',
        'path', 'mime_type', 'size', 'r2_key', 'r2_url',
    ];
    public function user() { return $this->belongsTo(User::class); }
    public function note() { return $this->belongsTo(Note::class); }
}
