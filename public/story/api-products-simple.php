<?php
// api-products.php - Versão simplificada para teste
header('Content-Type: application/json; charset=utf-8');

// Forçar resposta JSON mesmo que dê erro
try {
    $CK = 'ck_c8a3cce21212402dd20f851df6b521195936d9e4';
    $CS = 'cs_3d3339b5c3664cdf4c187bb33ee9a4b89849f9e3';
    $site = 'https://sfimportsdf.com.br';
    $endpoint = $site . '/wp-json/wc/v3/products';
    
    // Teste com apenas 1 produto
    $url = $endpoint . '?consumer_key=' . rawurlencode($CK) . '&consumer_secret=' . rawurlencode(CS) . '&per_page=1';
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_USERAGENT, 'SF-Story-Generator/1.0');
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        echo json_encode(['error' => 'CURL Error', 'message' => $error]);
        exit;
    }
    
    if ($http_code >= 200 && $http_code < 300) {
        $data = json_decode($response, true);
        if (is_array($data)) {
            echo json_encode($data);
        } else {
            echo json_encode(['error' => 'JSON Decode Error', 'response' => substr($response, 0, 500)]);
        }
    } else {
        echo json_encode(['error' => 'HTTP Error', 'code' => $http_code, 'response' => substr($response, 0, 500)]);
    }
    
} catch (Exception $e) {
    echo json_encode(['error' => 'Exception', 'message' => $e->getMessage()]);
}
?>
