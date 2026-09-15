<?php
// Saves an LLM-generated prompt entry: writes prompts/<slug>.txt, appends one
// record to _gen/custom.json, then rebuilds index.html from the merged catalogue.
header('Content-Type: application/json; charset=utf-8');

function fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

$raw = file_get_contents('php://input');
$in = json_decode($raw ?: '', true);
if (!is_array($in)) fail('請求本文不是合法 JSON');

$slug = trim($in['slug'] ?? '');
$item = $in['item'] ?? null;
if (!is_array($item)) fail('缺少 item');
if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) fail('slug 格式不合法：' . $slug);

$need = ['name', 'cat', 'core', 'hero', 'concept', 'atmo', 'sys', 'system', 'world', 'prompt'];
foreach ($need as $k) {
    if (!isset($item[$k]) || trim((string)$item[$k]) === '') fail('item 缺少欄位：' . $k);
}
if ($item['slug'] !== $slug) fail('slug 與 item.slug 不一致');

$root = dirname(__DIR__);
$txtPath = $root . '/prompts/' . $slug . '.txt';
$customPath = $root . '/_gen/custom.json';

if (is_file($txtPath)) fail('同名檔案已存在：prompts/' . $slug . '.txt');
if (file_put_contents($txtPath, $item['prompt']) === false) fail('寫入 prompts 失敗', 500);

$custom = [];
if (is_file($customPath)) {
    $custom = json_decode(file_get_contents($customPath) ?: '', true);
    if (!is_array($custom)) $custom = [];
}
foreach ($custom as $c) {
    if (($c['slug'] ?? '') === $slug) { @unlink($txtPath); fail('custom.json 已有相同 slug'); }
}
$custom[] = [
    'slug' => $slug,
    'name' => $item['name'], 'cat' => $item['cat'],
    'core' => $item['core'], 'hero' => $item['hero'], 'concept' => $item['concept'],
    'atmo' => $item['atmo'], 'sys' => $item['sys'], 'system' => $item['system'],
    'world' => $item['world'], 'prompt' => $item['prompt'],
];
if (file_put_contents($customPath, json_encode($custom, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT)) === false) {
    @unlink($txtPath);
    fail('寫入 custom.json 失敗', 500);
}

// Rebuild index.html with the merged catalogue (100 built-ins + customs).
require __DIR__ . '/../_gen/lib_catalog.php';
try {
    $r = gp_rebuild_index();
} catch (Throwable $e) {
    fail('重建 index.html 失敗：' . $e->getMessage(), 500);
}

echo json_encode(['ok' => true, 'slug' => $slug, 'total' => $r['total'], 'file' => 'prompts/' . $slug . '.txt'], JSON_UNESCAPED_UNICODE);
