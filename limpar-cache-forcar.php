<?php
/**
 * SCRIPT PARA LIMPAR CACHE E FORÇAR ATUALIZAÇÃO
 * EXECUTAR VIA BROWSER
 */

echo "<h1>🧹 LIMPANDO CACHE E FORÇANDO ATUALIZAÇÃO</h1>";

// 1. Limpar cache do catálogo
$cache_files = [
    '../cache/catalogo-cache.json',
    '../wp-content/cache/catalogo-cache.json'
];

foreach ($cache_files as $file) {
    if (file_exists($file)) {
        unlink($file);
        echo "✅ Cache removido: " . basename($file) . "<br>";
    }
}

// 2. Limpar cache do WordPress
$wp_cache_dir = '../wp-content/cache/';
if (is_dir($wp_cache_dir)) {
    $files = glob($wp_cache_dir . '*');
    $count = 0;
    foreach ($files as $file) {
        if (is_file($file) && strpos($file, '.php') === false) {
            unlink($file);
            $count++;
        }
    }
    echo "✅ {$count} arquivos de cache do WordPress removidos<br>";
}

// 3. Limpar transients do WooCommerce
if (file_exists('../wp-config.php')) {
    require_once('../wp-config.php');
    require_once('../wp-load.php');
    
    global $wpdb;
    
    // Remover transients de produtos
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '%_transient_%wc_product%'");
    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '%_transient_timeout_%wc_product%'");
    
    echo "✅ Transients do WooCommerce removidos<br>";
}

// 4. Forçar regenerate de produtos
echo "<h2>🔄 Forçando atualização de produtos...</h2>";

// Chamar API diretamente
$api_url = 'https://sfimportsdf.com.br/api/catalogo-dados.php';
$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'header' => [
            'Cache-Control: no-cache, no-store, must-revalidate',
            'Pragma: no-cache',
            'Expires: 0'
        ]
    ]
]);

echo "<p>📡 Chamando API: {$api_url}</p>";

$response = file_get_contents($api_url, false, $context);

if ($response) {
    echo "✅ API atualizada com sucesso!<br>";
    
    // Salvar nova resposta
    file_put_contents('../cache/catalogo-cache.json', $response);
    echo "✅ Novo cache salvo<br>";
} else {
    echo "❌ Erro ao chamar API<br>";
}

// 5. Limpar object cache do WordPress
if (function_exists('wp_cache_flush')) {
    wp_cache_flush();
    echo "✅ Object cache do WordPress limpo<br>";
}

echo "<hr>";
echo "<h2>🎉 PROCESSO CONCLUÍDO!</h2>";
echo "<p><strong>Próximos passos:</strong></p>";
echo "<ol>";
echo "<li>Aguarde 1-2 minutos</li>";
echo "<li>Acesse o catálogo: <a href='https://sfimportsdf.com.br/catalogo.html' target='_blank'>https://sfimportsdf.com.br/catalogo.html</a></li>";
echo "<li>Verifique se os preços estão atualizados</li>";
echo "</ol>";

echo "<p><button onclick='window.location.href=\"https://sfimportsdf.com.br/catalogo.html\"' style='background: #0073aa; color: white; padding: 15px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold;'>🌐 ABRIR CATÁLOGO</button></p>";

echo "<script>";
echo "setTimeout(function() {";
echo "  console.log('🔄 Redirecionando para o catálogo...');";
echo "  window.location.href = 'https://sfimportsdf.com.br/catalogo.html';";
echo "}, 3000);"; // 3 segundos
echo "</script>";
?>
