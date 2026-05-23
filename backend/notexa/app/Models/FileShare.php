<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FileShare extends Model
{
    protected $fillable = ['file_id', 'shared_by', 'shared_with'];

    public function file() { return $this->belongsTo(File::class); }
    public function sharer() { return $this->belongsTo(User::class, 'shared_by'); }
    public function recipient() { return $this->belongsTo(User::class, 'shared_with'); }
}
