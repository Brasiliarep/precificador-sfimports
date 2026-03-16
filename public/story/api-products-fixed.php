<?php
// api-products.php - VERSÃO FINAL COM CORS E DEBUG
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

$CK = 'ck_c8a3cce21212402dd20f851df6b521195936d9e4';
$CS = 'cs_3d3339b5c3664cdf4c187bb33ee9a4b89849f9e3';
$site = 'https://sfimportsdf.com.br';
$endpoint = $site . '/wp-json/wc/v3/products';

$search = isset($_GET['search']) ? trim($_GET['search']) : '';
$per_page = isset($_GET['per_page']) ? intval($_GET['per_page']) : 20;
$per_page = min($per_page, 100); // Limite máximo

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
  curl_setopt($ch, CURLOPT_HEADER, false); // Não incluir headers na resposta
  curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
  curl_setopt($ch, CURLOPT_TIMEOUT, 30);
  curl_setopt($ch, CURLOPT_USERAGENT, 'SF-Story-Generator/1.0');
  curl_setopt($ch, CURLOPT_USERPWD, $ck . ':' . $cs);
  
  $resp = curl_exec($ch);
  $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $error = curl_error($ch);
  curl_close($ch);

  return [$http, $resp, $error];
}

// Montar URL com autenticação
$url = $endpoint . '?' . http_build_query($params);
$url .= '&consumer_key=' . rawurlencode($CK) . '&consumer_secret=' . rawurlencode($CS);

$log .= "Final URL: " . $url . "\n";

list($http, $resp, $error) = wc_get($url, $CK, $CS);

$log .= "HTTP: $http\n";
$log .= "Error: $error\n";
$log .= "Response length: " . strlen($resp) . "\n";

if ($error) {
  $log .= "CURL Error: $error\n";
  file_put_contents('api-debug.log', $log, FILE_APPEND);
  echo json_encode(['error' => 'CURL Error', 'message' => $error, 'debug_log' => 'api-debug.log']);
  exit;
}

if ($http < 200 || $http >= 300) {
  $log .= "HTTP Error Response: $resp\n";
  file_put_contents('api-debug.log', $log, FILE_APPEND);
  http_response_code($http);
  echo json_encode(['error' => 'HTTP Error', 'code' => $http, 'response' => substr($resp, 0, 1000), 'debug_log' => 'api-debug.log']);
  exit;
}

$data = json_decode($resp, true);
if (!is_array($data)) {
  $log .= "JSON Decode Error: $resp\n";
  file_put_contents('api-debug.log', $log, FILE_APPEND);
  http_response_code(500);
  echo json_encode(['error' => 'JSON Decode Error', 'raw' => substr($resp, 0, 1000), 'debug_log' => 'api-debug.log']);
  exit;
}

// Processar imagens para garantir URLs absolutas
foreach ($data as &$product) {
  if (isset($product['images']) && is_array($product['images'])) {
    foreach ($product['images'] as &$image) {
      if (isset($image['src']) && !empty($image['src'])) {
        // Garantir URL absoluta
        if (strpos($image['src'], 'http') !== 0) {
          $image['src'] = $site . $image['src'];
        }
      }
    }
  }
}

$log .= "Success: " . count($data) . " products processed\n";
file_put_contents('api-debug.log', $log, FILE_APPEND);

echo json_encode($data);
?>
