const fs = require('fs');
const path = require('path');
const https = require('https');

// Ler o JSON linha por linha para evitar erros
const jsonPath = path.join(__dirname, 'public/data/products-array.json');
let jsonContent = fs.readFileSync(jsonPath, 'utf8');

// Remover quebras de linha problemáticas
jsonContent = jsonContent.replace(/\r\n/g, '').replace(/\n/g, '');

try {
    const products = JSON.parse(jsonContent);
    console.log(`📊 Encontrados ${products.length} produtos`);
    
    // Criar pasta de imagens
    const imagesDir = path.join(__dirname, 'public/images/produtos');
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }
    
    // Baixar apenas as primeiras 5 imagens para teste
    const sampleProducts = products.slice(0, 5);
    
    function downloadImage(url, filename) {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(filename);
            https.get(url, (response) => {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log(`✅ Baixado: ${path.basename(filename)}`);
                    resolve();
                });
            }).on('error', (err) => {
                console.log(`❌ Erro ao baixar: ${url}`);
                resolve(); // Continuar mesmo com erro
            });
        });
    }
    
    async function downloadAll() {
        for (const product of sampleProducts) {
            const url = product.image;
            const filename = path.join(imagesDir, `${product.id}.jpg`);
            await downloadImage(url, filename);
        }
        console.log('🎉 Download das imagens de teste concluído!');
    }
    
    downloadAll();
    
} catch (error) {
    console.log('❌ Erro ao parsear JSON:', error.message);
}
