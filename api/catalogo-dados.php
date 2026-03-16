<?php
/**
 * API para fornecer dados no formato do catálogo SF Imports
 * URL: https://sfimportsdf.com.br/api/catalogo-dados.php
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

// Função para buscar produtos do WooCommerce
function buscarProdutosWooCommerce() {
    // Configurar credenciais WooCommerce
    $consumer_key = 'ck_XXXXXXXXXXXXXXXX'; // TROCAR PELAS SUAS CHAVES
    $consumer_secret = 'cs_XXXXXXXXXXXXXXXX';
    $store_url = 'https://sfimportsdf.com.br';
    
    // URL da API WooCommerce
    $url = $store_url . '/wp-json/wc/v3/products?per_page=100&status=publish';
    
    // Fazer requisição
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERPWD, $consumer_key . ':' . $consumer_secret);
    curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
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

// Se for GET, retornar produtos no formato do catálogo
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    
    // Tentar buscar do cache primeiro
    $cache_file = '../cache/catalogo-cache.json';
    $cache_time = 3600; // 1 hora em segundos
    
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
            'products' => []
        ]);
        exit();
    }
    
    // Formatar produtos no formato que o catálogo atual usa
    $catalogoFormatado = array_map(function($produto) {
        
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
        
        return [
            'id' => $produto['id'],
            'name' => $produto['name'],
            'slug' => $produto['slug'],
            'price' => $preco_regular,
            'regular_price' => $preco_original,
            'sale_price' => $preco_regular < $preco_original ? $preco_regular : 0,
            'image' => $imagem,
            'categories' => $categorias,
            'description' => $descricao,
            'permalink' => $produto['permalink'],
            'stock_status' => $produto['stock_status'],
            'on_sale' => $preco_regular < $preco_original,
            'featured' => $produto['featured'] ?? false,
            'rating_count' => $produto['rating_count'] ?? 0,
            'average_rating' => $produto['average_rating'] ?? 0,
            'date_created' => $produto['date_created'],
            'date_modified' => $produto['date_modified']
        ];
    }, $produtos);
    
    // Criar diretório cache se não existir
    if (!file_exists('../cache')) {
        mkdir('../cache', 0755, true);
    }
    
    // Salvar no cache
    file_put_contents($cache_file, json_encode([
        'success' => true,
        'products' => $catalogoFormatado,
        'count' => count($catalogoFormatado),
        'last_updated' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT));
    
    // Retornar dados formatados
    echo json_encode([
        'success' => true,
        'products' => $catalogoFormatado,
        'count' => count($catalogoFormatado),
        'last_updated' => date('Y-m-d H:i:s')
    ]);
    
    exit();
}

// Método não permitido
http_response_code(405);
echo json_encode([
    'success' => false,
    'error' => 'Método não permitido'
]);
?>
