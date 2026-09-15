<?php
// ═══════════════════════════════════════════════════════════════
// game-prompts — AI 中繼（移植自 docs/omnicode/api/relay.php）
// ═══════════════════════════════════════════════════════════════
// 為什麼需要這支中繼？前端優先 direct 直連供應商（最快、Key 不離開瀏覽器），
// 但瀏覽器做不到的兩件事走這裡：
//
//  1. CORS —— Gemini / OpenAI / OpenRouter / Anthropic 的端點未必允許
//     從本機 XHR 讀取回應。走本機 PHP 就沒有同源限制（action=chat 走 SSE 直通）。
//  2. 非串流生成 —— action=json 上游 JSON 原樣回傳，給「生成遊戲製作提示詞」用。
//
// 安全（照 OmniCode 原則）：
//  - chat / json 的 url 主機必須落在白名單（四家供應商 + extraApiHosts），
//    避免這支端點變成開放代理。
//  - Key 永遠由瀏覽器放在 headers 送上游，本機不儲存、不記錄。
// ═══════════════════════════════════════════════════════════════

define('GP_RELAY_HOSTS', [
    'api.openai.com',
    'api.anthropic.com',
    'generativelanguage.googleapis.com',
    'openrouter.ai',
    'api.meta.ai',
]);

$action = $_GET['action'] ?? $_POST['action'] ?? '';
if ($action === '') {
    $raw = file_get_contents('php://input');
    $j = json_decode($raw ?: '', true);
    if (is_array($j) && isset($j['action'])) $action = $j['action'];
}

if ($action !== 'chat') header('Content-Type: application/json; charset=utf-8');

switch ($action) {
    case 'chat': gp_act_chat(); break;
    case 'json': gp_act_json(); break;
    default:
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => '未知的 action: ' . $action]);
}

function gp_input() {
    static $cache = null;
    if ($cache !== null) return $cache;
    $cache = array_merge($_GET, $_POST);
    $raw = file_get_contents('php://input');
    $j = json_decode($raw ?: '', true);
    if (is_array($j)) $cache = array_merge($cache, $j);
    return $cache;
}

function gp_arg($key, $default = '') {
    $in = gp_input();
    return $in[$key] ?? $default;
}

function gp_fail($msg, $code = 400, $detail = '') {
    http_response_code($code);
    $out = ['ok' => false, 'error' => $msg];
    if ($detail !== '') $out['detail'] = $detail;
    echo json_encode($out, JSON_UNESCAPED_UNICODE);
    exit;
}

function gp_url() {
    $url = trim((string)gp_arg('url', ''));
    if ($url === '') gp_fail('缺少必要參數 url', 400);
    if (!preg_match('#^https?://#i', $url)) gp_fail('url 必須是 http:// 或 https:// 開頭', 400);
    $host = strtolower((string)parse_url($url, PHP_URL_HOST));
    $allow = array_map('strtolower', GP_RELAY_HOSTS);
    foreach ($allow as $h) {
        if ($host === trim($h)) return $url;
    }
    gp_fail('不允許的 API 網域: ' . $host, 403);
}

function gp_headers($headers, $extra = []) {
    $out = [];
    $seen = [];
    if (is_array($headers)) {
        foreach ($headers as $k => $v) {
            if (!is_string($k) || $k === '') continue;
            if (is_array($v) || is_object($v)) continue;
            $lk = strtolower($k);
            if (in_array($lk, ['host', 'content-length', 'connection', 'transfer-encoding'], true)) continue;
            $seen[$lk] = true;
            $out[] = $k . ': ' . (string)$v;
        }
    }
    foreach ($extra as $k => $v) {
        if (isset($seen[strtolower($k)])) continue;
        $out[] = $k . ': ' . $v;
    }
    return $out;
}

// ─── action=chat —— SSE 直通 ───
function gp_act_chat() {
    $url = gp_url();
    $body = gp_arg('body', []);
    $headers = gp_arg('headers', []);

    header('Content-Type: text/event-stream; charset=utf-8');
    header('Cache-Control: no-cache, no-transform');
    header('X-Accel-Buffering: no');
    header('Connection: keep-alive');
    @ini_set('output_buffering', '0');
    @ini_set('zlib.output_compression', '0');
    @ini_set('implicit_flush', '1');
    ob_implicit_flush(true);
    while (ob_get_level() > 0) @ob_end_flush();
    ignore_user_abort(false);

    $status = 0;
    $errBuf = '';

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER => gp_headers($headers, [
            'Content-Type' => 'application/json',
            'Accept' => 'text/event-stream',
        ]),
        CURLOPT_TIMEOUT => 0,
        CURLOPT_CONNECTTIMEOUT => 20,
        // XAMPP 預設常缺 CA bundle，故關閉憑證驗證（僅接受白名單網域）。
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
        CURLOPT_HEADERFUNCTION => function ($ch, $line) use (&$status) {
            if (preg_match('#^HTTP/\S+\s+(\d{3})#', $line, $m)) $status = (int)$m[1];
            return strlen($line);
        },
        CURLOPT_WRITEFUNCTION => function ($ch, $chunk) use (&$status, &$errBuf) {
            if ($status >= 400) { $errBuf .= $chunk; return strlen($chunk); }
            echo $chunk;
            @flush();
            return strlen($chunk);
        },
    ]);

    $okExec = curl_exec($ch);
    $errNo = curl_errno($ch);
    $errMsg = curl_error($ch);
    curl_close($ch);

    if ($okExec === false && $errNo !== 0) {
        gp_sse_error('連線 AI 供應商失敗：' . $errMsg, $status, 'curl errno ' . $errNo);
    } elseif ($status >= 400) {
        gp_sse_error(
            'AI 供應商回應錯誤（HTTP ' . $status . '）：' . gp_provider_msg($errBuf),
            $status,
            mb_substr($errBuf, 0, 4000)
        );
    }
    exit;
}

function gp_sse_error($msg, $status = 0, $detail = null) {
    $payload = ['error' => $msg];
    if ($status) $payload['status'] = $status;
    if ($detail !== null && $detail !== '') $payload['detail'] = $detail;
    echo "event: oc_error\n";
    echo 'data: ' . json_encode($payload, JSON_UNESCAPED_UNICODE) . "\n\n";
    @flush();
}

function gp_provider_msg($raw) {
    $raw = trim((string)$raw);
    if ($raw === '') return '（上游未提供內容）';
    $j = json_decode($raw, true);
    if (is_array($j)) {
        $m = $j['error']['message'] ?? $j['error'] ?? $j['message'] ?? null;
        if (is_string($m) && $m !== '') return $m;
        if (is_array($m)) return json_encode($m, JSON_UNESCAPED_UNICODE);
    }
    return mb_substr($raw, 0, 500);
}

// ─── action=json —— 非串流，上游 JSON 原樣回傳 ───
function gp_act_json() {
    $url = gp_url();
    $body = gp_arg('body', []);
    $headers = gp_arg('headers', []);

    $status = 0;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER => gp_headers($headers, [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 300,
        CURLOPT_CONNECTTIMEOUT => 20,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
        CURLOPT_HEADERFUNCTION => function ($ch, $line) use (&$status) {
            if (preg_match('#^HTTP/\S+\s+(\d{3})#', $line, $m)) $status = (int)$m[1];
            return strlen($line);
        },
    ]);
    $out = curl_exec($ch);
    $errNo = curl_errno($ch);
    $errMsg = curl_error($ch);
    curl_close($ch);

    if ($out === false || $errNo !== 0) {
        gp_fail('連線 AI 供應商失敗：' . $errMsg, 502, 'curl errno ' . $errNo);
    }
    http_response_code($status > 0 ? $status : 200);
    echo $out;
    exit;
}
