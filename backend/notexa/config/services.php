<?php

return [
    'tesseract' => [
        'binary' => env('TESSERACT_BINARY'),
        'lang' => env('TESSERACT_LANG', 'eng'),
        'psm' => env('TESSERACT_PSM', '6'),
    ],
];
