<?php
/**
 * ENCONTRAR ONDE ESTÁ O WORDPRESS
 * VERIFICA TODOS OS POSSÍVEIS LOCAIS
 */

echo "<h1>🔍 BUSCANDO WORDPRESS NO SERVIDOR</h1>";

// Possíveis locais do WordPress
$possiveis_caminhos = [
    '../wp-config.php',
    '../../wp-config.php',
    '../../../wp-config.php',
    '../public/wp-config.php',
    '../www/wp-config.php',
    '../html/wp-config.php',
    '../wordpress/wp-config.php',
    '../wp/wp-config.php',
    './wp-config.php',
    './wp-config.php',
    './wp/wp-config.php',
    './wordpress/wp-config.php'
];

echo "<h2>📁 Verificando possíveis locais do WordPress:</h2>";

$encontrado = false;
$caminho_wp = '';

foreach ($possiveis_caminhos as $caminho) {
    if (file_exists($caminho)) {
        echo "<p style='color: green; font-weight: bold;'>✅ ENCONTRADO: {$caminho}</p>";
        $encontrado = true;
        $caminho_wp = $caminho;
        
        // Tentar carregar WordPress
        try {
            require_once($caminho);
            require_once(str_replace('wp-config.php', 'wp-load.php', $caminho));
            
            echo "<p style='color: blue;'>✅ WordPress carregado com sucesso!</p>";
            
            // Verificar WooCommerce
            if (class_exists('WooCommerce')) {
                echo "<p style='color: green;'>✅ WooCommerce está ativo!</p>";
                
                // Contar produtos
                global $wpdb;
                $count = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = 'product' AND post_status = 'publish'");
                echo "<p style='color: green;'>📦 {$count} produtos encontrados!</p>";
                
                // Mostrar alguns produtos
                $produtos = $wpdb->get_results("
                    SELECT p.ID, p.post_title, pm.meta_value as price
                    FROM {$wpdb->posts} p
                    LEFT JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id AND pm.meta_key = '_price'
                    WHERE p.post_type = 'product' AND p.post_status = 'publish'
                    ORDER BY p.post_modified DESC
                    LIMIT 5
                ");
                
                echo "<h3>📋 Exemplos de produtos:</h3>";
                echo "<table border='1' style='width: 100%; border-collapse: collapse;'>";
                echo "<tr style='background: #f0f0f0;'>";
                echo "<th>ID</th><th>Produto</th><th>Preço</th>";
                echo "</tr>";
                
                foreach ($produtos as $produto) {
                    echo "<tr>";
                    echo "<td>{$produto->ID}</td>";
                    echo "<td>" . substr($produto->post_title, 0, 40) . "...</td>";
                    echo "<td>R$ " . number_format($produto->price, 2, ',', '.') . "</td>";
                    echo "</tr>";
                }
                echo "</table>";
                
                break;
            } else {
                echo "<p style='color: red;'>❌ WooCommerce não está ativo!</p>";
            }
        } catch (Exception $e) {
            echo "<p style='color: orange;'>⚠️ Erro ao carregar WordPress: " . $e->getMessage() . "</p>";
        }
    } else {
        echo "<p style='color: #666;'>❌ Não encontrado: {$caminho}</p>";
    }
}

if (!$encontrado) {
    echo "<h2 style='color: red;'>❌ WordPress não encontrado em nenhum local!</h2>";
    echo "<p>Verifique a estrutura do servidor.</p>";
    
    // Mostrar estrutura atual
    echo "<h2>📁 Estrutura atual do diretório:</h2>";
    $diretorios = ['.', '..', '../..', '../../..'];
    
    foreach ($diretorios as $dir) {
        if (is_dir($dir)) {
            echo "<h3>📂 {$dir}:</h3>";
            $arquivos = scandir($dir);
            foreach ($arquivos as $arquivo) {
                if ($arquivo != '.' && $arquivo != '..') {
                    $caminho_completo = $dir . '/' . $arquivo;
                    if (is_dir($caminho_completo)) {
                        echo "<p style='color: blue;'>📁 {$arquivo}/</p>";
                    } else {
                        echo "<p style='color: #666;'>📄 {$arquivo}</p>";
                    }
                }
            }
        }
    }
}

echo "<hr>";
echo "<h2>🔧 Próximos passos:</h2>";

if ($encontrado) {
    echo "<p style='color: green;'><strong>✅ WordPress encontrado em: {$caminho_wp}</strong></p>";
    echo "<p>Atualize os outros scripts para usar este caminho.</p>";
} else {
    echo "<p style='color: red;'><strong>❌ WordPress não encontrado!</strong></p>";
    echo "<p>Verifique se o WordPress está instalado neste servidor.</p>";
}

echo "<div style='margin: 20px 0;'>";
echo "<button onclick='window.location.reload()' style='background: #0073aa; color: white; padding: 15px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold;'>🔄 VERIFICAR NOVAMENTE</button>";
echo "</div>";
?>
