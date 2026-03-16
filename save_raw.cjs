async function saveRaw(searchTerm) {
    const query = encodeURIComponent(searchTerm);
    const url = `https://www.superadega.com.br/search/?q=${query}`;
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
        }
    });
    const html = await response.text();
    const fs = require('fs');
    fs.writeFileSync('angelica_raw.html', html);
    console.log(`Saved raw HTML for ${searchTerm} to angelica_raw.html`);
}

saveRaw('Angelica Zapata');
