<?php
/**
 * API para atualizar catálogo automaticamente
 * URL: https://sfimportsdf.com.br/api/atualizar-catalogo.php
 */

// Headers CORS
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Se for OPTIONS, retornar 200
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Função para buscar produtos do WooCommerce
function buscarProdutosWooCommerce() {
    // Configurar credenciais WooCommerce
    $consumer_key = 'ck_XXXXXXXXXXXXXXXX'; // TROCAR PELAS SUAS CHAVES
    $consumer_secret = 'cs_XXXXXXXXXXXXXXXX';
    $store_url = 'https://sfimportsdf.com.br';
    
    // URL da API WooCommerce
    $url = $store_url . '/wp-json/wc/v3/products?per_page=100';
    
    // Fazer requisição
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERPWD, $consumer_key . ':' . $consumer_secret);
    curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

// Se for GET, buscar do WooCommerce e atualizar catálogo
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    
    $produtos = buscarProdutosWooCommerce();
    
    if ($produtos && is_array($produtos)) {
        // Formatar para o catálogo
        $catalogoProdutos = array_map(function($produto) {
            return [
                'id' => $produto['id'],
                'nome' => $produto['name'],
                'preco' => floatval($produto['price']),
                'preco_de' => floatval($produto['regular_price']),
                'imagem' => $produto['images'][0]['src'] ?? '',
                'link' => $produto['permalink']
            ];
        }, $produtos);
        
        // Salvar no arquivo JSON
        $arquivo = '../catalogo-produtos.json';
        file_put_contents($arquivo, json_encode($catalogoProdutos, JSON_PRETTY_PRINT));
        
        echo json_encode([
            'success' => true,
            'message' => 'Catálogo atualizado do WooCommerce',
            'produtos' => count($catalogoProdutos)
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Erro ao buscar produtos do WooCommerce'
        ]);
    }
    exit();
}

// Se for POST, receber dados do precificador
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    
    $json = file_get_contents('php://input');
    $produtos = json_decode($json, true);
    
    if ($produtos && is_array($produtos)) {
        // Salvar no arquivo JSON
        $arquivo = '../catalogo-produtos.json';
        file_put_contents($arquivo, json_encode($produtos, JSON_PRETTY_PRINT));
        
        echo json_encode([
            'success' => true,
            'message' => 'Catálogo atualizado',
            'produtos' => count($produtos)
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Dados inválidos'
        ]);
    }
    exit();
}

// Método não permitido
http_response_code(405);
echo json_encode([
    'success' => false,
    'message' => 'Método não permitido'
]);
?>
