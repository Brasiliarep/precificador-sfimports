<?php
/**
 * DIAGNÓSTICO COMPLETO E DETALHADO
 * VERIFICA TUDO: PRODUTOS, PREÇOS, STATUS, IMPORTAÇÕES
 */

echo "<h1>🔍 DIAGNÓSTICO COMPLETO E DETALHADO</h1>";

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

// 1. CONTAGEM REAL DE PRODUTOS
echo "<h2>📊 CONTAGEM DETALHADA DE PRODUTOS</h2>";

// Contar todos os produtos
$total_produtos = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = 'product'");
echo "<p><strong>Total de produtos (todos os status):</strong> {$total_produtos}</p>";

// Contar produtos publicados
$publicados = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = 'product' AND post_status = 'publish'");
echo "<p><strong>Produtos publicados:</strong> {$publicados}</p>";

// Contar por status
$status_counts = $wpdb->get_results("
    SELECT post_status, COUNT(*) as count 
    FROM {$wpdb->posts} 
    WHERE post_type = 'product' 
    GROUP BY post_status
");

echo "<h3>Produtos por status:</h3>";
echo "<table border='1' style='width: 300px; border-collapse: collapse;'>";
echo "<tr style='background: #f0f0f0;'><th>Status</th><th>Quantidade</th></tr>";
foreach ($status_counts as $status) {
    echo "<tr><td>{$status->post_status}</td><td>{$status->count}</td></tr>";
}
echo "</table>";

// 2. VERIFICAR PRODUTOS COM PREÇOS
echo "<h2>💰 PRODUTOS COM PREÇOS</h2>";

$com_preco = $wpdb->get_var("
    SELECT COUNT(DISTINCT p.ID) 
    FROM {$wpdb->posts} p 
    INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id 
    WHERE p.post_type = 'product' 
    AND p.post_status = 'publish' 
    AND pm.meta_key = '_price' 
    AND pm.meta_value > 0
");

echo "<p><strong>Produtos publicados com preço > 0:</strong> {$com_preco}</p>";

$sem_preco = $wpdb->get_var("
    SELECT COUNT(DISTINCT p.ID) 
    FROM {$wpdb->posts} p 
    WHERE p.post_type = 'product' 
    AND p.post_status = 'publish' 
    AND p.ID NOT IN (
        SELECT post_id FROM {$wpdb->postmeta} 
        WHERE meta_key = '_price' 
        AND meta_value > 0
    )
");

echo "<p><strong>Produtos publicados sem preço:</strong> {$sem_preco}</p>";

// 3. VERIFICAR IMPORTAÇÕES RECENTES
echo "<h2>📅 IMPORTAÇÕES RECENTES</h2>";

$hoje = date('Y-m-d');
$ontem = date('Y-m-d', strtotime('-1 day'));
$ultima_semana = date('Y-m-d', strtotime('-7 days'));

$modificados_hoje = $wpdb->get_var("
    SELECT COUNT(*) FROM {$wpdb->posts} 
    WHERE post_type = 'product' 
    AND DATE(post_modified) = '{$hoje}'
");

$modificados_ontem = $wpdb->get_var("
    SELECT COUNT(*) FROM {$wpdb->posts} 
    WHERE post_type = 'product' 
    AND DATE(post_modified) = '{$ontem}'
");

$modificados_semana = $wpdb->get_var("
    SELECT COUNT(*) FROM {$wpdb->posts} 
    WHERE post_type = 'product' 
    AND DATE(post_modified) >= '{$ultima_semana}'
");

echo "<p><strong>Modificados hoje:</strong> {$modificados_hoje}</p>";
echo "<p><strong>Modificados ontem:</strong> {$modificados_ontem}</p>";
echo "<p><strong>Modificados na última semana:</strong> {$modificados_semana}</p>";

// 4. VERIFICAR PREÇOS RECENTES
echo "<h2>💸 ANÁLISE DE PREÇOS</h2>";

$precos_stats = $wpdb->get_row("
    SELECT 
        COUNT(*) as total_com_preco,
        AVG(CAST(pm.meta_value AS DECIMAL(10,2))) as preco_medio,
        MIN(CAST(pm.meta_value AS DECIMAL(10,2))) as preco_minimo,
        MAX(CAST(pm.meta_value AS DECIMAL(10,2))) as preco_maximo
    FROM {$wpdb->posts} p 
    INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id 
    WHERE p.post_type = 'product' 
    AND p.post_status = 'publish' 
    AND pm.meta_key = '_price' 
    AND pm.meta_value > 0
");

echo "<p><strong>Total com preço:</strong> {$precos_stats->total_com_preco}</p>";
echo "<p><strong>Preço médio:</strong> R$ " . number_format($precos_stats->preco_medio, 2, ',', '.') . "</p>";
echo "<p><strong>Preço mínimo:</strong> R$ " . number_format($precos_stats->preco_minimo, 2, ',', '.') . "</p>";
echo "<p><strong>Preço máximo:</strong> R$ " . number_format($precos_stats->preco_maximo, 2, ',', '.') . "</p>";

// 5. VERIFICAR PRODUTOS EXEMPLOS
echo "<h2>📦 EXEMPLOS DE PRODUTOS RECENTES</h2>";

$exemplos = $wpdb->get_results("
    SELECT 
        p.ID,
        p.post_title,
        p.post_status,
        p.post_date,
        p.post_modified,
        pm1.meta_value as regular_price,
        pm2.meta_value as sale_price,
        pm3.meta_value as price
    FROM {$wpdb->posts} p
    LEFT JOIN {$wpdb->postmeta} pm1 ON p.ID = pm1.post_id AND pm1.meta_key = '_regular_price'
    LEFT JOIN {$wpdb->postmeta} pm2 ON p.ID = pm2.post_id AND pm2.meta_key = '_sale_price'
    LEFT JOIN {$wpdb->postmeta} pm3 ON p.ID = pm3.post_id AND pm3.meta_key = '_price'
    WHERE p.post_type = 'product'
    ORDER BY p.post_modified DESC
    LIMIT 10
");

echo "<table border='1' style='width: 100%; border-collapse: collapse; font-size: 12px;'>";
echo "<tr style='background: #f0f0f0;'>";
echo "<th>ID</th><th>Produto</th><th>Status</th><th>Data Criação</th><th>Última Modificação</th><th>Preço Normal</th><th>Preço Promo</th><th>Preço Atual</th>";
echo "</tr>";

foreach ($exemplos as $exemplo) {
    echo "<tr>";
    echo "<td>{$exemplo->ID}</td>";
    echo "<td>" . substr($exemplo->post_title, 0, 30) . "...</td>";
    echo "<td>{$exemplo->post_status}</td>";
    echo "<td>{$exemplo->post_date}</td>";
    echo "<td>{$exemplo->post_modified}</td>";
    echo "<td>R$ " . number_format($exemplo->regular_price, 2, ',', '.') . "</td>";
    echo "<td>R$ " . number_format($exemplo->sale_price, 2, ',', '.') . "</td>";
    echo "<td>R$ " . number_format($exemplo->price, 2, ',', '.') . "</td>";
    echo "</tr>";
}
echo "</table>";

// 6. VERIFICAR API REST
echo "<h2>🌐 TESTE DA API REST</h2>";

$api_url = get_rest_url(null, 'wc/v3/products');
echo "<p><strong>URL da API:</strong> {$api_url}</p>";

$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'header' => 'User-Agent: WordPress/WooCommerce'
    ]
]);

$api_response = @file_get_contents($api_url, false, $context);

if ($api_response) {
    $products = json_decode($api_response, true);
    if (is_array($products)) {
        echo "<p style='color: green;'>✅ API REST funcionando - " . count($products) . " produtos encontrados</p>";
        
        // Comparar com banco
        if (count($products) != $publicados) {
            echo "<p style='color: orange;'>⚠️ ATENÇÃO: API retorna " . count($products) . " produtos, mas o banco tem {$publicados} produtos publicados!</p>";
        }
    }
} else {
    echo "<p style='color: red;'>❌ API REST não está respondendo</p>";
}

// 7. VERIFICAR CACHE ATUAL
echo "<h2>🗄️ STATUS DO CACHE</h2>";

$cache_files = [
    './cache/catalogo-cache.json',
    './wp-content/cache/catalogo-cache.json',
    './catalogo-produtos.json'
];

foreach ($cache_files as $file) {
    if (file_exists($file)) {
        $size = filesize($file);
        $modified = date('Y-m-d H:i:s', filemtime($file));
        echo "<p style='color: orange;'>⚠️ Cache encontrado: " . basename($file) . " ({$size} bytes, modificado: {$modified})</p>";
        
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

// 8. CONCLUSÕES E RECOMENDAÇÕES
echo "<h2>🎯 CONCLUSÕES E RECOMENDAÇÕES</h2>";

echo "<div style='background: #f8f9fa; padding: 15px; border-left: 4px solid #0073aa; margin: 20px 0;'>";

if ($publicados < 1000) {
    echo "<h3 style='color: red;'>❌ PROBLEMA IDENTIFICADO: POUCOS PRODUTOS</h3>";
    echo "<p><strong>Situação:</strong> Apenas {$publicados} produtos publicados é muito pouco.</p>";
    echo "<p><strong>Possíveis causas:</strong></p>";
    echo "<ul>";
    echo "<li>CSV não foi importado corretamente</li>";
    echo "<li>Produtos foram desativados</li>";
    echo "<li>Importação falhou parcialmente</li>";
    echo "</ul>";
    echo "<p><strong>Solução:</strong></p>";
    echo "<ol>";
    echo "<li>Verifique se o CSV foi importado completamente</li>";
    echo "<li>Ative produtos desativados</li>";
    echo "<li>Importe o CSV novamente</li>";
    echo "</ol>";
} elseif ($modificados_semana == 0) {
    echo "<h3 style='color: orange;'>⚠️ ATENÇÃO: NENHUMA ATUALIZAÇÃO RECENTE</h3>";
    echo "<p><strong>Situação:</strong> Nenhum produto foi modificado na última semana.</p>";
    echo "<p><strong>Causa:</strong> O CSV com preços atualizados não foi importado.</p>";
    echo "<p><strong>Solução:</strong> Importe o CSV gerado pelo precificador.</p>";
} else {
    echo "<h3 style='color: green;'>✅ SISTEMA APARENTEMENTE OK</h3>";
    echo "<p><strong>Situação:</strong> {$publicados} produtos publicados e atualizados recentemente.</p>";
    echo "<p><strong>Se os preços ainda estão antigos:</strong></p>";
    echo "<ul>";
    echo "<li>Limpe o cache do navegador (Ctrl+F5)</li>";
    echo "<li>Desative plugins de cache temporariamente</li>";
    echo "<li>Verifique se está usando CDN</li>";
    echo "</ul>";
}

echo "</div>";

// 9. BOTÕES DE AÇÃO
echo "<h2>🚀 AÇÕES RÁPIDAS</h2>";

echo "<div style='margin: 20px 0;'>";
echo "<button onclick='window.location.href=\"https://sfimportsdf.com.br/catalogo.html\"' style='background: #0073aa; color: white; padding: 15px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold; margin: 10px;'>🌐 ABRIR CATÁLOGO</button>";
echo "<button onclick='window.location.href=\"../wp-admin/edit.php?post_type=product\"' style='background: #28a745; color: white; padding: 15px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold; margin: 10px;'>📦 GERENCIAR PRODUTOS</button>";
echo "<button onclick='window.location.href=\"../wp-admin/admin.php?page=wc-importer\"' style='background: #dc3545; color: white; padding: 15px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold; margin: 10px;'>📥 IMPORTAR CSV</button>";
echo "</div>";

echo "<hr>";
echo "<p><strong>Conclusão final:</strong> Este diagnóstico completo mostra exatamente o status do seu WooCommerce e o que precisa ser feito.</p>";
?>
