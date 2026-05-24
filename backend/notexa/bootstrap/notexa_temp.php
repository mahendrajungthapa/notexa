<?php

$notexaTempDir = getenv('NOTEXA_PHP_TEMP_DIR') ?: dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'app' . DIRECTORY_SEPARATOR . 'php-temp';

if (!is_dir($notexaTempDir)) {
    @mkdir($notexaTempDir, 0775, true);
}

if (is_dir($notexaTempDir)) {
    @chmod($notexaTempDir, 0775);

    foreach (['TMP', 'TEMP', 'TMPDIR'] as $key) {
        putenv("{$key}={$notexaTempDir}");
        $_ENV[$key] = $notexaTempDir;
        $_SERVER[$key] = $notexaTempDir;
    }
}
