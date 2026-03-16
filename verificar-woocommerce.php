<?php
/**
 * VERIFICAÇÃO COMPLETA DO WOOCOMMERCE
 * MOSTRA STATUS REAL DOS PRODUTOS E PREÇOS
 */

echo "<h1>🔍 DIAGNÓSTICO COMPLETO DO WOOCOMMERCE</h1>";

// Conectar ao WordPress
if (file_exists('./wp-config.php')) {
    require_once('./wp-config.php');
    require_once('./wp-load.php');
    
    echo "<h2>✅ WordPress Conectado</h2>";
} else {
    echo "<h2>❌ WordPress não encontrado</h2>";
    exit;
}

// Verificar se WooCommerce está ativo
if (class_exists('WooCommerce')) {
    echo "<h2>✅ WooCommerce Ativo</h2>";
} else {
    echo "<h2>❌ WooCommerce não está ativo</h2>";
    exit;
}

global $wpdb;

// 1. VERIFICAR PRODUTOS NO BANCO
echo "<h2>📦 Produtos no Banco de Dados</h2>";

$products_count = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = 'product' AND post_status = 'publish'");
echo "<p><strong>Total de produtos publicados:</strong> {$products_count}</p>";

// 2. VERIFICAR PREÇOS RECENTES
echo "<h2>💰 Verificação de Preços</h2>";

$recent_products = $wpdb->get_results("
    SELECT p.ID, p.post_title, 
           pm1.meta_value as regular_price,
           pm2.meta_value as sale_price,
           pm3.meta_value as price,
           p.post_modified
    FROM {$wpdb->posts} p
    LEFT JOIN {$wpdb->postmeta} pm1 ON p.ID = pm1.post_id AND pm1.meta_key = '_regular_price'
    LEFT JOIN {$wpdb->postmeta} pm2 ON p.ID = pm2.post_id AND pm2.meta_key = '_sale_price'
    LEFT JOIN {$wpdb->postmeta} pm3 ON p.ID = pm3.post_id AND pm3.meta_key = '_price'
    WHERE p.post_type = 'product' 
    AND p.post_status = 'publish'
    ORDER BY p.post_modified DESC
    LIMIT 10
");

echo "<table border='1' style='width: 100%; border-collapse: collapse;'>";
echo "<tr style='background: #f0f0f0;'>";
echo "<th>ID</th><th>Produto</th><th>Preço Normal</th><th>Preço Promo</th><th>Preço Atual</th><th>Última Modificação</th>";
echo "</tr>";

foreach ($recent_products as $product) {
    echo "<tr>";
    echo "<td>{$product->ID}</td>";
    echo "<td>" . substr($product->post_title, 0, 30) . "...</td>";
    echo "<td>R$ " . number_format($product->regular_price, 2, ',', '.') . "</td>";
    echo "<td>R$ " . number_format($product->sale_price, 2, ',', '.') . "</td>";
    echo "<td>R$ " . number_format($product->price, 2, ',', '.') . "</td>";
    echo "<td>{$product->post_modified}</td>";
    echo "</tr>";
}
echo "</table>";

// 3. VERIFICAR SE HOUVE IMPORTAÇÃO RECENTE
echo "<h2>📅 Últimas Importações</h2>";

$last_import = $wpdb->get_var("
    SELECT MAX(post_modified) 
    FROM {$wpdb->posts} 
    WHERE post_type = 'product' 
    AND post_modified > DATE_SUB(NOW(), INTERVAL 24 HOUR)
");

if ($last_import) {
    echo "<p style='color: green;'>✅ Última modificação: {$last_import}</p>";
} else {
    echo "<p style='color: red;'>❌ Nenhuma modificação nas últimas 24 horas</p>";
}

// 4. VERIFICAR API REST
echo "<h2>🌐 Status da API REST</h2>";

// Testar API REST do WooCommerce
$api_url = get_rest_url(null, 'wc/v3/products');
echo "<p><strong>URL da API:</strong> {$api_url}</p>";

// Tentar buscar produtos via API
$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'header' => 'User-Agent: WordPress/WooCommerce'
    ]
]);

$api_response = file_get_contents($api_url, false, $context);

if ($api_response) {
    $products = json_decode($api_response, true);
    if (is_array($products)) {
        echo "<p style='color: green;'>✅ API REST funcionando - " . count($products) . " produtos encontrados</p>";
        
        // Mostrar alguns produtos da API
        echo "<h3>Exemplos de produtos da API:</h3>";
        echo "<table border='1' style='width: 100%; border-collapse: collapse;'>";
        echo "<tr style='background: #f0f0f0;'>";
        echo "<th>ID</th><th>Nome</th><th>Preço</th><th>Status</th>";
        echo "</tr>";
        
        for ($i = 0; $i < min(5, count($products)); $i++) {
            $product = $products[$i];
            echo "<tr>";
            echo "<td>{$product['id']}</td>";
            echo "<td>" . substr($product['name'], 0, 30) . "...</td>";
            echo "<td>R$ " . number_format($product['price'], 2, ',', '.') . "</td>";
            echo "<td>{$product['status']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
} else {
    echo "<p style='color: red;'>❌ API REST não está respondendo</p>";
}

// 5. VERIFICAR CACHE ATUAL
echo "<h2>🗄️ Status do Cache</h2>";

$cache_files = [
    '../cache/catalogo-cache.json',
    '../wp-content/cache/catalogo-cache.json',
    '../catalogo-produtos.json'
];

foreach ($cache_files as $file) {
    if (file_exists($file)) {
        $size = filesize($file);
        $modified = date('Y-m-d H:i:s', filemtime($file));
        echo "<p style='color: orange;'>⚠️ Cache encontrado: " . basename($file) . " ({$size} bytes, modificado: {$modified})</p>";
        
        // Mostrar conteúdo do cache
        $content = file_get_contents($file);
        $data = json_decode($content, true);
        if ($data && isset($data['count'])) {
            echo "<p>→ Produtos no cache: {$data['count']}</p>";
            if (isset($data['last_updated'])) {
                echo "<p>→ Última atualização: {$data['last_updated']}</p>";
            }
        }
    } else {
        echo "<p style='color: green;'>✅ Cache limpo: " . basename($file) . "</p>";
    }
}

// 6. AÇÕES RECOMENDADAS
echo "<h2>🔧 Ações Recomendadas</h2>";

echo "<div style='background: #f8f9fa; padding: 15px; border-left: 4px solid #0073aa; margin: 20px 0;'>";

if ($last_import) {
    echo "<h3 style='color: green;'>✅ PRODUTOS FORAM ATUALIZADOS RECENTEMENTE</h3>";
    echo "<p>Se os preços ainda estão antigos, o problema pode ser:</p>";
    echo "<ul>";
    echo "<li>Cache do navegador (limpe com Ctrl+F5)</li>";
    echo "<li>Cache do servidor/proxy</li>";
    echo "<li>CDN se estiver usando</li>";
    echo "</ul>";
} else {
    echo "<h3 style='color: red;'>❌ NENHUMA IMPORTAÇÃO RECENTE</h3>";
    echo "<p><strong>PROBLEMA IDENTIFICADO:</strong> Os produtos no WooCommerce não foram atualizados!</p>";
    echo "<p><strong>SOLUÇÃO:</strong></p>";
    echo "<ol>";
    echo "<li>Use o botão '🛒 WooCommerce' no precificador</li>";
    echo "<li>Faça download do CSV gerado</li>";
    echo "<li>Importe o CSV no WooCommerce manualmente</li>";
    echo "<li>Execute este script novamente para verificar</li>";
    echo "</ol>";
}

echo "</div>";

// 7. BOTÕES DE AÇÃO
echo "<h2>🚀 Ações Rápidas</h2>";

echo "<div style='margin: 20px 0;'>";
echo "<button onclick='window.location.href=\"https://sfimportsdf.com.br/catalogo.html\"' style='background: #0073aa; color: white; padding: 15px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold; margin: 10px;'>🌐 ABRIR CATÁLOGO</button>";
echo "<button onclick='window.location.reload()' style='background: #28a745; color: white; padding: 15px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold; margin: 10px;'>🔄 VERIFICAR NOVAMENTE</button>";
echo "<button onclick='window.location.href=\"../wp-admin\"' style='background: #dc3545; color: white; padding: 15px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold; margin: 10px;'>⚙️ PAINEL WOOCOMMERCE</button>";
echo "</div>";

echo "<hr>";
echo "<p><strong>Conclusão:</strong> Este diagnóstico mostra exatamente o status dos produtos no WooCommerce e possíveis causas dos preços antigos.</p>";
?>
