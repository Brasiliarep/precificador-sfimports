<?php
// public_html/story/api-products.php
header('Content-Type: application/json; charset=utf-8');

// CORS Headers - ESSENCIAL PARA FUNCIONAR!
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Responder preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Habilitar todos os erros para debug
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Log de requisição
$log = "[" . date('Y-m-d H:i:s') . "] Request from: " . $_SERVER['REMOTE_ADDR'] . "\n";
$log .= "Method: " . $_SERVER['REQUEST_METHOD'] . "\n";
$log .= "URI: " . $_SERVER['REQUEST_URI'] . "\n";
$log .= "GET: " . json_encode($_GET) . "\n";

// Cole suas chaves AQUI (no servidor). Não coloque no index.html.
$CK = 'ck_c8a3cce21212402dd20f851df6b521195936d9e4';
$CS = 'cs_3d3339b5c3664cdf4c187bb33ee9a4b89849f9e3';

$site = 'https://sfimportsdf.com.br';
$endpoint = $site . '/wp-json/wc/v3/products';

$search = isset($_GET['search']) ? trim($_GET['search']) : '';
$per_page = 100;

// Monta query
$params = [
  'status'   => 'publish',
  'orderby'  => 'title',
  'order'    => 'asc',
  'per_page' => $per_page,
];
if ($search !== '') $params['search'] = $search;

function wc_get($url, $ck, $cs) {
  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_HEADER, true);
  curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
  curl_setopt($ch, CURLOPT_USERAGENT, 'SF-Story-Generator/1.0');
  // Basic Auth sobre HTTPS (recomendado na doc) [page:0][page:1]
  curl_setopt($ch, CURLOPT_USERPWD, $ck . ':' . $cs);
  $resp = curl_exec($ch);
  $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
  curl_close($ch);

  $headers = substr($resp, 0, $headerSize);
  $body = substr($resp, $headerSize);

  return [$http, $headers, $body];
}

function header_value($headers, $name) {
  if (preg_match('/^' . preg_quote($name, '/') . ':\s*(.+)$/mi', $headers, $m)) {
    return trim($m[1]);
  }
  return null;
}

// 1ª página
$url1 = $endpoint . '?' . http_build_query($params);
list($http, $headers, $body) = wc_get($url1, $CK, $CS);

if ($http < 200 || $http >= 300) {
  header('Content-Type: application/json', true, $http);
  $log .= "Error HTTP $http: $body\n";
  file_put_contents('api-debug.log', $log, FILE_APPEND);
  echo json_encode(['error' => "WooCommerce API error ($http)", 'details' => json_decode($body) ?: $body]);
  exit;
}

$data1 = json_decode($body, true);
if (json_last_error() !== JSON_ERROR_NONE) {
  header('Content-Type: application/json', true, 500);
  $jsonError = json_last_error_msg();
  $log .= "JSON Parse Error: $jsonError. Body: $body\n";
  file_put_contents('api-debug.log', $log, FILE_APPEND);
  echo json_encode(['error' => 'Erro ao processar JSON do WooCommerce', 'msg' => $jsonError]);
  exit;
}

if (!is_array($data1)) {
  header('Content-Type: application/json', true, 500);
  echo json_encode(['error' => 'Resposta do WooCommerce não é um array', 'raw' => $body]);
  exit;
}

$totalPages = (int)(header_value($headers, 'X-WP-TotalPages') ?? 1);

$all = $data1;

// páginas seguintes (se tiver)
for ($page = 2; $page <= min($totalPages, 3); $page++) { // Limitar a 3 páginas para evitar timeout
  $params['page'] = $page;
  $urlN = $endpoint . '?' . http_build_query($params);
  list($hN, $headersN, $bodyN) = wc_get($urlN, $CK, $CS);

  if ($hN < 200 || $hN >= 300) break;

  $arr = json_decode($bodyN, true);
  if (is_array($arr)) $all = array_merge($all, $arr);
}

$log .= "Success: " . count($all) . " products processed\n";
file_put_contents('api-debug.log', $log, FILE_APPEND);

echo json_encode($all);
?>
