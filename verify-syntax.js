const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('c:\\\\app precificador\\\\deploy-gestaosf\\\\catalogo.html', 'utf8');
const $ = cheerio.load(html);
let valid = true;
$('script').each((i, el) => {
    const script = $(el).html();
    if (script && script.trim()) {
        try {
            new Function(script);
        } catch (e) {
            console.error('Syntax error in script ' + i + ':', e.toString());
            valid = false;
        }
    }
});
if (valid) console.log('All scripts are syntactically valid.');
