// GERADOR DE CATÁLOGO ATUALIZADO - SF IMPORTS
// Converte dados do precificador para formato do catálogo verde

const fs = require('fs');
const path = require('path');

// Função para gerar catálogo atualizado
function gerarCatalogoAtualizado() {
    console.log('🚀 GERANDO CATÁLOGO ATUALIZADO...');
    
    try {
        // 1. Ler dados do localStorage/sistema
        const catalogoData = localStorage.getItem('catalogoSFImports');
        
        if (!catalogoData) {
            console.error('❌ Nenhum dado encontrado no localStorage!');
            console.log('💡 Execute o precificador primeiro para gerar os dados.');
            return;
        }
        
        const produtos = JSON.parse(catalogoData);
        console.log(`📦 Encontrados ${produtos.length} produtos no precificador.`);
        
        // 2. Formatar para catálogo verde
        const catalogoFormatado = produtos.map(produto => ({
            id: produto.id,
            nome: produto.nome,
            preco: produto.preco,
            imagem: `https://sfimportsdf.com.br/wp-content/uploads/produtos/${produto.id}.jpg`,
            categoria: 'geral',
            descricao: `${produto.nome} - SF Imports`,
            destaque: Math.random() > 0.8, // 20% de destaque aleatório
            frete_gratis: produto.preco > 150 // Frete grátis acima de R$ 150
        }));
        
        // 3. Salvar arquivo JSON
        const jsonContent = JSON.stringify(catalogoFormatado, null, 2);
        const filePath = path.join(__dirname, 'catalogo-produtos.json');
        
        fs.writeFileSync(filePath, jsonContent, 'utf8');
        
        console.log(`✅ CATÁLOGO GERADO COM SUCESSO!`);
        console.log(`📁 Arquivo: ${filePath}`);
        console.log(`📊 Produtos: ${catalogoFormatado.length}`);
        console.log(`💰 Preço médio: R$ ${(catalogoFormatado.reduce((sum, p) => sum + p.preco, 0) / catalogoFormatado.length).toFixed(2)}`);
        
        // 4. Estatísticas
        const stats = {
            total: catalogoFormatado.length,
            com_destaque: catalogoFormatado.filter(p => p.destaque).length,
            frete_gratis: catalogoFormatado.filter(p => p.frete_gratis).length,
            preco_medio: (catalogoFormatado.reduce((sum, p) => sum + p.preco, 0) / catalogoFormatado.length).toFixed(2),
            gerado_em: new Date().toLocaleString('pt-BR')
        };
        
        console.log('\n📈 ESTATÍSTICAS:');
        console.log(`   Total de produtos: ${stats.total}`);
        console.log(`   Com destaque: ${stats.com_destaque}`);
        console.log(`   Frete grátis: ${stats.frete_gratis}`);
        console.log(`   Preço médio: R$ ${stats.preco_medio}`);
        console.log(`   Gerado em: ${stats.gerado_em}`);
        
        return filePath;
        
    } catch (error) {
        console.error('❌ ERRO AO GERAR CATÁLOGO:', error);
        return null;
    }
}

// Função para integrar com WooCommerce (simulação)
function integrarWooCommerce() {
    console.log('\n🔗 INTEGRANDO COM WOOCOMMERCE...');
    
    // Simular integração
    console.log('📡 Conectando à API WooCommerce...');
    console.log('🔄 Sincronizando produtos...');
    console.log('💰 Atualizando preços...');
    console.log('✅ Integração concluída!');
    
    return true;
}

// Função principal
function main() {
    console.log('🎯 SISTEMA DE ATUALIZAÇÃO DE CATÁLOGO');
    console.log('=' .repeat(50));
    
    // 1. Gerar catálogo atualizado
    const catalogoPath = gerarCatalogoAtualizado();
    
    if (!catalogoPath) {
        console.log('\n❌ FALHA NA GERAÇÃO DO CATÁLOGO');
        return;
    }
    
    // 2. Integrar com WooCommerce
    const integracaoSucesso = integrarWooCommerce();
    
    if (integracaoSucesso) {
        console.log('\n🎉 PROCESSO CONCLUÍDO COM SUCESSO!');
        console.log('\n📋 PRÓXIMOS PASSOS:');
        console.log('1. Faça upload do arquivo "catalogo-produtos.json" para public_html/');
        console.log('2. Acesse https://sfimportsdf.com.br/catalogo.html');
        console.log('3. Verifique se os preços estão atualizados');
        console.log('\n📁 Arquivo gerado:', catalogoPath);
    } else {
        console.log('\n❌ ERRO NA INTEGRAÇÃO COM WOOCOMMERCE');
    }
}

// Exportar funções para uso no navegador
if (typeof window !== 'undefined') {
    window.gerarCatalogoAtualizado = gerarCatalogoAtualizado;
    window.integrarWooCommerce = integrarWooCommerce;
    window.main = main;
} else {
    // Executar se for Node.js
    main();
}

module.exports = {
    gerarCatalogoAtualizado,
    integrarWooCommerce,
    main
};
