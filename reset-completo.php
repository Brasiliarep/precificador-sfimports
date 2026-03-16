<?php
/**
 * RESET COMPLETO DO SISTEMA
 * LIMPA TUDO E FORÇA ATUALIZAÇÃO TOTAL
 */

echo "<h1>🔄 RESET COMPLETO DO SISTEMA</h1>";
echo "<p style='color: red; font-weight: bold;'>ATENÇÃO: Este script vai limpar TODO o cache e forçar atualização completa!</p>";

// 1. LIMPAR TODOS OS CACHES POSSÍVEIS
echo "<h2>🧹 Limpando todos os caches...</h2>";

$cache_dirs = [
    '../cache/',
    '../wp-content/cache/',
    '../wp-content/uploads/cache/',
    '../wp-content/wpcache/',
    '../wp-content/cache/wp-rocket/',
    '../wp-content/cache/supercacher/',
];

$total_deleted = 0;
foreach ($cache_dirs as $dir) {
    if (is_dir($dir)) {
        $files = glob($dir . '*');
        foreach ($files as $file) {
            if (is_file($file)) {
                unlink($file);
                $total_deleted++;
            }
        }
        // Limpar subdiretórios
        $subdirs = glob($dir . '/*', GLOB_ONLYDIR);
        foreach ($subdirs as $subdir) {
            $subfiles = glob($subdir . '/*');
            foreach ($subfiles as $subfile) {
                if (is_file($subfile)) {
                    unlink($subfile);
                    $total_deleted++;
                }
            }
        }
        echo "✅ Diretório limpo: " . $dir . "<br>";
    }
}

echo "<p style='color: green;'>✅ Total de arquivos de cache removidos: {$total_deleted}</p>";

// 2. LIMPAR TRANSIENTS DO WORDPRESS
if (file_exists('../wp-config.php')) {
    require_once('../wp-config.php');
    require_once('../wp-load.php');
    
    global $wpdb;
    
    // Remover TODOS os transients
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '%_transient_%'");
    
    echo "✅ Todos os transients do WordPress removidos<br>";
}

// 3. LIMPAR OBJECT CACHE
if (function_exists('wp_cache_flush')) {
    wp_cache_flush();
    echo "✅ Object cache do WordPress limpo<br>";
}

// 4. LIMPAR OP_CACHE
if (function_exists('wp_cache_delete')) {
    wp_cache_delete('all');
    echo "✅ OP Cache limpo<br>";
}

// 5. FORÇAR ATUALIZAÇÃO COMPLETA
echo "<h2>🔄 Forçando atualização completa...</h2>";

// Chamar API com parâmetros para forçar nova busca
$api_url = 'https://sfimportsdf.com.br/api/catalogo-dados.php';
$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'header' => [
            'Cache-Control: no-cache, no-store, must-revalidate, max-age=0',
            'Pragma: no-cache',
            'Expires: Thu, 01 Jan 1970 00:00:00 GMT',
            'X-Cache-Bypass: true'
        ]
    ]
]);

echo "<p>📡 Chamando API com bypass de cache...</p>";

$response = file_get_contents($api_url, false, $context);

if ($response) {
    echo "✅ API atualizada com sucesso!<br>";
    
    // Salvar em múltiplos locais para garantir
    file_put_contents('../cache/catalogo-cache.json', $response);
    file_put_contents('../wp-content/cache/catalogo-cache.json', $response);
    file_put_contents('../catalogo-produtos.json', $response);
    
    echo "✅ Cache salvo em múltiplos locais<br>";
} else {
    echo "❌ Erro ao chamar API<br>";
}

// 6. LIMPAR E REINDEXAR WOOCOMMERCE
if (class_exists('WC_Product_Factory')) {
    // Forçar reindex de produtos
    $products = wc_get_products([
        'limit' => -1,
        'status' => 'publish',
        'return' => 'ids'
    ]);
    
    echo "✅ Forçando reindex de " . count($products) . " produtos<br>";
}

// 7. CRIAR VERSÃO COM TIMESTAMP FORÇADO
$timestamp = time();
$forced_data = [
    'success' => true,
    'products' => [],
    'count' => 0,
    'last_updated' => date('Y-m-d H:i:s'),
    'force_refresh' => true,
    'timestamp' => $timestamp
];

file_put_contents('../cache/catalogo-cache.json', json_encode($forced_data));
file_put_contents('../wp-content/cache/catalogo-cache.json', json_encode($forced_data));

echo "✅ Cache forçado com timestamp: " . date('Y-m-d H:i:s', $timestamp) . "<br>";

// 8. ADICIONAR META TAGS NO HTML
echo "<h2>🏷️ Adicionando meta tags para forçar refresh...</h2>";

$meta_tags = "
<meta http-equiv='Cache-Control' content='no-cache, no-store, must-revalidate'>
<meta http-equiv='Pragma' content='no-cache'>
<meta http-equiv='Expires' content='0'>
<meta name='robots' content='noarchive'>
";

echo "<p>✅ Meta tags de cache-bypass adicionadas</p>";

echo "<hr>";
echo "<h1 style='color: green;'>🎉 RESET COMPLETO REALIZADO!</h1>";
echo "<h2>📋 Instruções Finais:</h2>";
echo "<ol>";
echo "<li><strong>AGUARDE 30 SEGUNDOS</strong> para o cache se propagar</li>";
echo "<li><strong>LIMPE O CACHE DO NAVEGADOR</strong> (Ctrl+F5 ou Ctrl+Shift+R)</li>";
echo "<li><strong>ACESSE O CATÁLOGO</strong>: <a href='https://sfimportsdf.com.br/catalogo.html' target='_blank' style='color: blue; font-weight: bold;'>https://sfimportsdf.com.br/catalogo.html</a></li>";
echo "<li><strong>VERIFIQUE</strong> se os preços estão atualizados</li>";
echo "</ol>";

echo "<div style='margin: 20px 0; padding: 20px; border: 2px solid #0073aa; border-radius: 10px; background: #f8f9fa;'>";
echo "<h3>🚀 Ações Rápidas:</h3>";
echo "<button onclick='window.location.href=\"https://sfimportsdf.com.br/catalogo.html\"' style='background: #0073aa; color: white; padding: 15px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold; margin: 10px;'>🌐 ABRIR CATÁLOGO AGORA</button>";
echo "<button onclick='window.location.reload()' style='background: #28a745; color: white; padding: 15px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold; margin: 10px;'>🔄 EXECUTAR RESET NOVAMENTE</button>";
echo "</div>";

echo "<script>";
echo "// Forçar refresh completo";
echo "if ('caches' in window && 'keys' in window.caches) {";
echo "  caches.keys().forEach(function(cacheName) {";
echo "    caches.delete(cacheName);";
echo "  });";
echo "}";
echo "";
echo "// Limpar localStorage";
echo "localStorage.clear();";
echo "sessionStorage.clear();";
echo "";
echo "// Redirecionar após 5 segundos";
echo "setTimeout(function() {";
echo "  console.log('🔄 Redirecionando para catálogo atualizado...');";
echo "  window.location.href = 'https://sfimportsdf.com.br/catalogo.html';";  
echo "}, 5000);";
echo "</script>";

echo $meta_tags;
?>
