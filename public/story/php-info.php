<?php
// Verificação do ambiente PHP
echo "PHP Version: " . phpversion() . "\n";
echo "cURL enabled: " . (extension_loaded('curl') ? 'Yes' : 'No') . "\n";
echo "JSON enabled: " . (extension_loaded('json') ? 'Yes' : 'No') . "\n";
echo "allow_url_fopen: " . (ini_get('allow_url_fopen') ? 'Yes' : 'No') . "\n";

// Teste de conexão básica
$test_url = 'https://sfimportsdf.com.br';
$ch = curl_init($test_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "Connection test to $test_url:\n";
echo "HTTP Code: $http_code\n";
echo "Error: $error\n";
echo "Response length: " . strlen($response) . "\n";

// Teste da API WooCommerce
$CK = 'ck_c8a3cce21212402dd20f851df6b521195936d9e4';
$CS = 'cs_3d3339b5c3664cdf4c187bb33ee9a4b89849f9e3';
$api_url = 'https://sfimportsdf.com.br/wp-json/wc/v3/products?consumer_key=' . rawurlencode($CK) . '&consumer_secret=' . rawurlencode(CS) . '&per_page=1';

echo "\nAPI Test:\n";
echo "URL: $api_url\n";

$ch = curl_init($api_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_USERAGENT, 'SF-Story-Generator/1.0');
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "HTTP Code: $http_code\n";
echo "Error: $error\n";
echo "Response (first 200 chars): " . substr($response, 0, 200) . "\n";
?>
