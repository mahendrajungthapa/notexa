<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class NoteVersion extends Model
{
    protected $fillable = ['note_id','user_id','content','version_number'];
    public function note() { return $this->belongsTo(Note::class); }
    public function user() { return $this->belongsTo(User::class); }
}
