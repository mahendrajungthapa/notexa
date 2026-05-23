<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class SiteSetting extends Model
{
    protected $fillable = ['key', 'value', 'type', 'group'];
    protected $guarded = [];

    public static function get(string $key, $default = null)
    {
        $s = static::where('key', $key)->first();
        if (!$s || $s->value === null || $s->value === '') return $default;
        return match ($s->type) {
            'boolean' => in_array(strtolower($s->value), ['true', '1', 'yes']),
            'json' => json_decode($s->value, true) ?? $default,
            'integer' => (int) $s->value,
            default => $s->value,
        };
    }

    public static function set(string $key, $value, string $type = 'string', string $group = 'general'): void
    {
        if (is_array($value)) $value = json_encode($value);
        if (is_bool($value)) $value = $value ? 'true' : 'false';
        static::updateOrCreate(['key' => $key], ['value' => (string) $value, 'type' => $type, 'group' => $group]);
    }
}
