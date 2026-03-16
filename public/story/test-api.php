<?php
// Teste API WooCommerce
header('Content-Type: application/json; charset=utf-8');

$CK = 'ck_c8a3cce21212402dd20f851df6b521195936d9e4';
$CS = 'cs_3d3339b5c3664cdf4c187bb33ee9a4b89849f9e3';
$site = 'https://sfimportsdf.com.br';
$endpoint = $site . '/wp-json/wc/v3/products';

// Teste básico
$url = $endpoint . '?consumer_key=' . rawurlencode($CK) . '&consumer_secret=' . rawurlencode(CS) . '&per_page=5';

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_USERAGENT, 'SF-Story-Generator/1.0');
curl_setopt($ch, CURLOPT_USERPWD, $CK . ':' . $CS);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($response === false) {
    echo json_encode(['error' => 'CURL Error', 'message' => $error]);
} elseif ($http_code >= 200 && $http_code < 300) {
    echo json_encode(['success' => true, 'http_code' => $http_code, 'data' => json_decode($response, true)]);
} else {
    echo json_encode(['error' => 'HTTP Error', 'http_code' => $http_code, 'response' => $response]);
}
?>
