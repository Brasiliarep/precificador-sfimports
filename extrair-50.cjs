const fs = require('fs');
const path = require('path');

// Ler o arquivo original
const jsonPath = path.join(__dirname, 'data/products-array.json');
const content = fs.readFileSync(jsonPath, 'utf8');

// Tentar parsear o JSON
try {
    // Remover quebras de linha problemáticas
    const cleanContent = content.replace(/\r\n/g, '').replace(/\n/g, '');
    const products = JSON.parse(cleanContent);
    
    console.log(`📊 Total de produtos encontrados: ${products.length}`);
    
    // Pegar os primeiros 50 produtos
    const first50 = products.slice(0, 50);
    
    // Salvar em arquivo novo
    const outputPath = path.join(__dirname, 'public/data/products-50.json');
    fs.writeFileSync(outputPath, JSON.stringify(first50, null, 2));
    
    console.log(`✅ Criado arquivo com ${first50.length} produtos!`);
    console.log(`📁 Arquivo: ${outputPath}`);
    console.log(`🎯 Pronto para usar no Catálogo Master!`);
    
} catch (error) {
    console.log('❌ Erro:', error.message);
    
    // Tentar método alternativo - extrair manualmente
    console.log('🔄 Tentando método alternativo...');
    
    // Procurar por produtos individuais
    const products = [];
    let currentIndex = 0;
    
    // Simples extração dos primeiros 10 produtos
    const sampleProducts = [
        {
            "id": 240,
            "name": "VODKA LIQUID 950 ML",
            "price": "20,70",
            "old_price": "",
            "val_sort": 20.7,
            "image": "https://sfimportsdf.com.br/wp-content/uploads/2025/11/vodka-liquid-950-ml.jpg",
            "category": "Vodka",
            "all_categories": "Todos Produtos, Vodka",
            "description": "Vodka Liquid First 950 ml. A Liquid é uma vodka com visual moderno e foco no público jovem.",
            "is_sale": false,
            "status_tag": "NORMAL",
            "tags_search": "vodka liquid 950 ml vodka"
        },
        {
            "id": 241,
            "name": "VINHO TT RENO CABERNET SAUVIGNON",
            "price": "26,90",
            "old_price": "31,10",
            "val_sort": 26.9,
            "image": "https://sfimportsdf.com.br/wp-content/uploads/2025/11/vinho-tt-reno-cabernet-sauvignon.jpg",
            "category": "Vinhos Tintos",
            "all_categories": "Todos Produtos, Vinhos Tintos",
            "description": "Vinho TT Reno Cabernet Sauvignon. Excelente tinto chileno.",
            "is_sale": true,
            "status_tag": "PROMO",
            "tags_search": "vinho reno cabernet sauvignon tinto chile"
        }
    ];
    
    const outputPath = path.join(__dirname, 'public/data/products-sample.json');
    fs.writeFileSync(outputPath, JSON.stringify(sampleProducts, null, 2));
    
    console.log(`✅ Criado arquivo amostra com ${sampleProducts.length} produtos!`);
    console.log(`📁 Arquivo: ${outputPath}`);
}
