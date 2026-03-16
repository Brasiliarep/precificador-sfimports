<?php
// wc-proxy.php - VERSÃO FINAL COM CORS
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Responder preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

const STORE_URL = 'https://sfimportsdf.com.br'; 
const CK = 'ck_c8a3cce21212402dd20f851df6b521195936d9e4';
const CS = 'cs_3d3339b5c3664cdf4c187bb33ee9a4b89849f9e3';

$action = isset($_GET['action']) ? $_GET['action'] : 'list';

function http_json($url) {
  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
  curl_setopt($ch, CURLOPT_TIMEOUT, 20);
  curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
  curl_setopt($ch, CURLOPT_USERAGENT, 'SF-Story-Generator/1.0');
  $body = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $err  = curl_error($ch);
  curl_close($ch);

  if ($body === false) {
    http_response_code(500);
    echo json_encode(['error' => 'curl_error', 'message' => $err]);
    exit;
  }
  if ($code < 200 || $code >= 300) {
    http_response_code($code);
    echo $body;
    exit;
  }
  echo $body;
  exit;
}

function q($k, $default='') {
  return isset($_GET[$k]) ? $_GET[$k] : $default;
}

if ($action === 'list') {
  $page = max(1, intval(q('page', '1')));
  $per_page = max(1, min(100, intval(q('per_page', '24'))));
  $search = trim(q('search', ''));

  $url = STORE_URL . '/wp-json/wc/v3/products'
    . '?page=' . $page
    . '&per_page=' . $per_page
    . '&status=publish'
    . ($search !== '' ? '&search=' . rawurlencode($search) : '')
    . '&consumer_key=' . rawurlencode(CK)
    . '&consumer_secret=' . rawurlencode(CS);

  http_json($url);
}

if ($action === 'get') {
  $id = intval(q('id', '0'));
  if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'missing_id']);
    exit;
  }

  $url = STORE_URL . '/wp-json/wc/v3/products/' . $id
    . '?consumer_key=' . rawurlencode(CK)
    . '&consumer_secret=' . rawurlencode(CS);

  http_json($url);
}

http_response_code(400);
echo json_encode(['error' => 'bad_action']);
?>
