<?php
/**
 * SCRIPT PARA FORÇAR ATUALIZAÇÃO DO CATÁLOGO
 * LIMPA CACHE E FORÇA NOVA BUSCA
 */

// Headers
header('Content-Type: text/html; charset=utf-8');

// Limpar cache do catálogo
$cache_file = '../cache/catalogo-cache.json';
if (file_exists($cache_file)) {
    unlink($cache_file);
    echo "✅ Cache do catálogo limpo!<br>";
}

// Limpar cache do WordPress (se existir)
$wp_cache_dir = '../wp-content/cache/';
if (is_dir($wp_cache_dir)) {
    $files = glob($wp_cache_dir . '*');
    foreach ($files as $file) {
        if (is_file($file)) {
            unlink($file);
        }
    }
    echo "✅ Cache do WordPress limpo!<br>";
}

// Forçar atualização da API
echo "🔄 Forçando atualização da API...<br>";

// Chamar API para forçar atualização
$api_url = 'https://sfimportsdf.com.br/api/catalogo-dados.php';
$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'header' => 'Cache-Control: no-cache, no-store, must-revalidate',
        'header' => 'Pragma: no-cache',
        'header' => 'Expires: 0'
    ]
]);

$response = file_get_contents($api_url, false, $context);

if ($response) {
    echo "✅ API atualizada com sucesso!<br>";
    
    // Salvar resposta forçada
    file_put_contents('../cache/catalogo-cache.json', $response);
    echo "✅ Cache forçado atualizado!<br>";
} else {
    echo "❌ Erro ao atualizar API!<br>";
}

// Limpar transients do WooCommerce
echo "🔄 Limpando transients do WooCommerce...<br>";

// Conectar ao WordPress
require_once('../wp-config.php');
require_once('../wp-load.php');

// Limpar transients relacionados a produtos
global $wpdb;
$transients = $wpdb->get_results(
    "SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE '%_transient_%wc_product%' OR option_name LIKE '%_transient_timeout_%wc_product%'"
);

foreach ($transients as $transient) {
    delete_option($transient->option_name);
}

echo "✅ Transients do WooCommerce limpos!<br>";

// Forçar regenerate de preços
echo "🔄 Forçando regenerate de preços...<br>";

// Disparar hook para atualizar preços
do_action('woocommerce_before_product_object_save', null, null);

echo "<h2>✅ ATUALIZAÇÃO FORÇADA CONCLUÍDA!</h2>";
echo "<p><strong>Próximos passos:</strong></p>";
echo "<ol>";
echo "<li>Aguarde 2-3 minutos</li>";
echo "<li>Acesse o catálogo: <a href='https://sfimportsdf.com.br/catalogo.html' target='_blank'>https://sfimportsdf.com.br/catalogo.html</a></li>";
echo "<li>Verifique se os preços estão atualizados</li>";
echo "</ol>";
echo "<p><button onclick='window.location.reload()' style='background: #0073aa; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;'>🔄 Recarregar Página</button></p>";
?>
