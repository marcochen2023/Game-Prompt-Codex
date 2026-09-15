<?php
// Deletes ONE custom prompt entry: removes prompts/<slug>.txt, drops the record
// from _gen/custom.json, then rebuilds index.html. Built-in entries (the 100
// rows in _gen/data_*.php) are never deletable here — only slugs present in
// custom.json qualify, so a stray request cannot remove catalogue files.
header('Content-Type: application/json; charset=utf-8');

function fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

$raw = file_get_contents('php://input');
$in = json_decode($raw ?: '', true);
if (!is_array($in)) fail('請求本文不是合法 JSON');

$slug = trim((string)($in['slug'] ?? ''));
if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) fail('slug 格式不合法：' . $slug);

$root = dirname(__DIR__);
$customPath = $root . '/_gen/custom.json';
$txtPath = $root . '/prompts/' . $slug . '.txt';

$custom = [];
if (is_file($customPath)) {
    $custom = json_decode(file_get_contents($customPath) ?: '', true);
    if (!is_array($custom)) $custom = [];
}
$idx = -1;
foreach ($custom as $i => $c) {
    if (is_array($c) && ($c['slug'] ?? '') === $slug) { $idx = $i; break; }
}
if ($idx < 0) fail('這不是自訂條目（custom.json 裡沒有 ' . $slug . '），內建條目不能刪除', 403);

array_splice($custom, $idx, 1);
if (file_put_contents($customPath, json_encode($custom, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT)) === false) {
    fail('寫入 custom.json 失敗', 500);
}
if (is_file($txtPath) && !@unlink($txtPath)) fail('刪除 prompts/' . $slug . '.txt 失敗（檔案可能被佔用）', 500);

require __DIR__ . '/../_gen/lib_catalog.php';
try {
    $r = gp_rebuild_index();
} catch (Throwable $e) {
    fail('重建 index.html 失敗：' . $e->getMessage(), 500);
}

echo json_encode(['ok' => true, 'slug' => $slug, 'total' => $r['total']], JSON_UNESCAPED_UNICODE);
