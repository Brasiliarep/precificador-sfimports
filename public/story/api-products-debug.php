<?php
// api-products.php - Versão Debug
header('Content-Type: application/json; charset=utf-8');

// Habilitar todos os erros para debug
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Log de requisição
$log = "Request: " . date('Y-m-d H:i:s') . "\n";
$log .= "GET: " . json_encode($_GET) . "\n";
$log .= "POST: " . json_encode($_POST) . "\n";

$CK = 'ck_c8a3cce21212402dd20f851df6b521195936d9e4';
$CS = 'cs_3d3339b5c3664cdf4c187bb33ee9a4b89849f9e3';
$site = 'https://sfimportsdf.com.br';
$endpoint = $site . '/wp-json/wc/v3/products';

$search = isset($_GET['search']) ? trim($_GET['search']) : '';
$per_page = 100;

$params = [
  'status' => 'publish',
  'orderby' => 'title',
  'order' => 'asc',
  'per_page' => $per_page,
];

if ($search !== '')
  $params['search'] = $search;

function wc_get($url, $ck, $cs)
{
  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_HEADER, true);
  curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
  curl_setopt($ch, CURLOPT_USERAGENT, 'SF-Story-Generator/1.0');
  curl_setopt($ch, CURLOPT_USERPWD, $ck . ':' . $cs);

  $resp = curl_exec($ch);
  $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
  $error = curl_error($ch);
  curl_close($ch);

  return [$http, $resp, $headerSize, $error];
}

$url1 = $endpoint . '?' . http_build_query($params);
list($http, $resp, $headerSize, $error) = wc_get($url1, $CK, $CS);

$log .= "URL: $url1\n";
$log .= "HTTP: $http\n";
$log .= "Error: $error\n";

if ($error) {
  $log .= "CURL Error: $error\n";
  file_put_contents('api-debug.log', $log);
  echo json_encode(['error' => 'CURL Error', 'message' => $error]);
  exit;
}

if ($http < 200 || $http >= 300) {
  $log .= "HTTP Error Response: $resp\n";
  file_put_contents('api-debug.log', $log);
  http_response_code($http);
  echo $resp;
  exit;
}

$headers = substr($resp, 0, $headerSize);
$body = substr($resp, $headerSize);

$data1 = json_decode($body, true);
if (!is_array($data1)) {
  $log .= "JSON Decode Error: $body\n";
  file_put_contents('api-debug.log', $log);
  http_response_code(500);
  echo json_encode(['error' => 'Resposta não é array', 'raw' => $body]);
  exit;
}

$totalPages = 1;
if (preg_match('/^X-WP-TotalPages:\s*(.+)$/mi', $headers, $m)) {
  $totalPages = (int) trim($m[1]);
}

$all = $data1;

for ($page = 2; $page <= $totalPages; $page++) {
  $params['page'] = $page;
  $urlN = $endpoint . '?' . http_build_query($params);
  list($hN, $respN, $headerSizeN, $errorN) = wc_get($urlN, $CK, $CS);

  if ($errorN)
    break;
  if ($hN < 200 || $hN >= 300)
    break;

  $headersN = substr($respN, 0, $headerSizeN);
  $bodyN = substr($respN, $headerSizeN);

  $arr = json_decode($bodyN, true);
  if (is_array($arr))
    $all = array_merge($all, $arr);
}

$log .= "Success: " . count($all) . " products\n";
file_put_contents('api-debug.log', $log);

echo json_encode($all);
?>