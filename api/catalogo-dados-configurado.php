<?php
/**
 * API PARA CATÁLOGO SF IMPORTS - CONFIGURADO COM CHAVES REAIS
 * URL: https://sfimportsdf.com.br/api/catalogo-dados.php
 * VERSÃO: Completa com cache e tratamento de erros
 */

// Headers CORS
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Se for OPTIONS, retornar 200
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuração das chaves do WooCommerce (JÁ CONFIGURADO)
$consumer_key = 'ck_c8a3cce21212402dd20f851df6b521195936d9e4';
$consumer_secret = 'cs_3d3339b5c3664cdf4c187bb33ee9a4b89849f9e3';
$store_url = 'https://sfimportsdf.com.br';

// Função para buscar produtos do WooCommerce
function buscarProdutosWooCommerce() {
    global $consumer_key, $consumer_secret, $store_url;
    
    // URL da API WooCommerce
    $url = $store_url . '/wp-json/wc/v3/products?per_page=100&status=publish';
    
    // Fazer requisição
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERPWD, $consumer_key . ':' . $consumer_secret);
    curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($http_code !== 200) {
        return ['error' => 'Erro ao buscar produtos: HTTP ' . $http_code];
    }
    
    $produtos = json_decode($response, true);
    
    if (!$produtos || !is_array($produtos)) {
        return ['error' => 'Resposta inválida da API WooCommerce'];
    }
    
    return $produtos;
}

// Função para formatar produtos no formato do catálogo
function formatarProdutosCatalogo($produtos) {
    return array_map(function($produto) {
        
        // Obter preços
        $preco_regular = floatval($produto['price']);
        $preco_original = floatval($produto['regular_price']);
        
        // Se não tiver preço original, criar um 15% acima
        if ($preco_original <= $preco_regular) {
            $preco_original = $preco_regular * 1.15;
        }
        
        // Obter imagem principal
        $imagem = '';
        if (!empty($produto['images']) && isset($produto['images'][0])) {
            $imagem = $produto['images'][0]['src'];
        }
        
        // Obter categorias
        $categorias = [];
        if (!empty($produto['categories'])) {
            foreach ($produto['categories'] as $categoria) {
                $categorias[] = $categoria['name'];
            }
        }
        
        // Obter descrição curta
        $descricao = '';
        if (!empty($produto['short_description'])) {
            $descricao = strip_tags($produto['short_description']);
            $descricao = trim($descricao);
            if (strlen($descricao) > 200) {
                $descricao = substr($descricao, 0, 200) . '...';
            }
        }
        
        // Obter atributos
        $atributos = [];
        if (!empty($produto['attributes'])) {
            foreach ($produto['attributes'] as $attr) {
                $atributos[] = [
                    'name' => $attr['name'],
                    'options' => $attr['options'] ?? []
                ];
            }
        }
        
        return [
            'id' => $produto['id'],
            'name' => $produto['name'],
            'slug' => $produto['slug'],
            'price' => $preco_regular,
            'regular_price' => $preco_original,
            'sale_price' => $preco_regular < $preco_original ? $preco_regular : 0,
            'image' => $imagem,
            'images' => $produto['images'] ?? [],
            'categories' => $categorias,
            'description' => $descricao,
            'short_description' => $produto['short_description'] ?? '',
            'permalink' => $produto['permalink'],
            'stock_status' => $produto['stock_status'],
            'stock_quantity' => $produto['stock_quantity'] ?? 0,
            'on_sale' => $preco_regular < $preco_original,
            'featured' => $produto['featured'] ?? false,
            'attributes' => $atributos,
            'rating_count' => $produto['rating_count'] ?? 0,
            'average_rating' => $produto['average_rating'] ?? 0,
            'date_created' => $produto['date_created'],
            'date_modified' => $produto['date_modified'],
            'sku' => $produto['sku'] ?? '',
            'weight' => $produto['weight'] ?? '',
            'dimensions' => $produto['dimensions'] ?? [],
            'tags' => !empty($produto['tags']) ? array_map(function($tag) { return $tag['name']; }, $produto['tags']) : []
        ];
    }, $produtos);
}

// Se for GET, retornar produtos no formato do catálogo
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    
    // Tentar buscar do cache primeiro
    $cache_file = '../cache/catalogo-cache.json';
    $cache_time = 3600; // 1 hora em segundos
    
    // Criar diretório cache se não existir
    if (!file_exists('../cache')) {
        mkdir('../cache', 0755, true);
    }
    
    if (file_exists($cache_file) && (time() - filemtime($cache_file)) < $cache_time) {
        // Retornar do cache se ainda for válido
        $cached_data = file_get_contents($cache_file);
        echo $cached_data;
        exit();
    }
    
    $produtos = buscarProdutosWooCommerce();
    
    if (isset($produtos['error'])) {
        // Se der erro, tentar usar cache antigo
        if (file_exists($cache_file)) {
            $cached_data = file_get_contents($cache_file);
            echo $cached_data;
            exit();
        }
        
        echo json_encode([
            'success' => false,
            'error' => $produtos['error'],
            'products' => [],
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit();
    }
    
    // Formatar produtos no formato que o catálogo usa
    $catalogoFormatado = formatarProdutosCatalogo($produtos);
    
    // Preparar resposta completa
    $resposta = [
        'success' => true,
        'products' => $catalogoFormatado,
        'count' => count($catalogoFormatado),
        'last_updated' => date('Y-m-d H:i:s'),
        'cache_info' => [
            'file' => $cache_file,
            'expires_in' => $cache_time,
            'next_update' => date('Y-m-d H:i:s', time() + $cache_time)
        ],
        'api_info' => [
            'woo_url' => $store_url,
            'products_count' => count($produtos),
            'api_version' => 'v3'
        ]
    ];
    
    // Salvar no cache
    file_put_contents($cache_file, json_encode($resposta, JSON_PRETTY_PRINT));
    
    // Retornar dados formatados
    echo json_encode($resposta);
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
            'message' => 'Catálogo atualizado com dados do precificador',
            'products' => count($produtos),
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => 'Dados inválidos ou formato JSON incorreto',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
    exit();
}

// Endpoint para limpar cache
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $cache_file = '../cache/catalogo-cache.json';
    if (file_exists($cache_file)) {
        unlink($cache_file);
        echo json_encode([
            'success' => true,
            'message' => 'Cache limpo com sucesso',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Arquivo de cache não encontrado',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
    exit();
}

// Endpoint para status da API
if ($_SERVER['REQUEST_METHOD'] === 'HEAD') {
    $cache_file = '../cache/catalogo-cache.json';
    $cache_exists = file_exists($cache_file);
    $cache_valid = $cache_exists && (time() - filemtime($cache_file)) < 3600;
    
    header('X-API-Status: OK');
    header('X-Cache-Exists: ' . ($cache_exists ? 'true' : 'false'));
    header('X-Cache-Valid: ' . ($cache_valid ? 'true' : 'false'));
    header('X-Timestamp: ' . date('Y-m-d H:i:s'));
    
    http_response_code(200);
    exit();
}

// Método não permitido
http_response_code(405);
echo json_encode([
    'success' => false,
    'error' => 'Método não permitido',
    'allowed_methods' => ['GET', 'POST', 'DELETE', 'HEAD'],
    'timestamp' => date('Y-m-d H:i:s')
]);
?>
