const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG = {
    host: 'ftp.sfimportsdf.com.br',
    user: 'u855614676',
    pass: '@16052620Df@@',
    remoteBase: '/public_html/gestaosf'
};

const curlConfigPath = path.join(__dirname, 'curl_config.txt');
fs.writeFileSync(curlConfigPath, `user = "${CONFIG.user}:${CONFIG.pass}"\n`);

function getFiles(dir, allFiles = []) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const name = path.join(dir, f);
        if (fs.statSync(name).isDirectory()) {
            getFiles(name, allFiles);
        } else {
            allFiles.push(name);
        }
    }
    return allFiles;
}

const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
    console.error("Dist folder not found!");
    process.exit(1);
}

const files = getFiles(distDir);
console.log(`🚀 Starting autonomous upload of ${files.length} files via CURL config...`);

files.forEach((file, index) => {
    const relativePath = path.relative(distDir, file).replace(/\\/g, '/');
    // NOTE: Use ftp://host/path format. Credentials are in config file.
    const remoteUrl = `ftp://${CONFIG.host}${CONFIG.remoteBase}/${relativePath}`;

    console.log(`[${index + 1}/${files.length}] Uploading: ${relativePath}...`);

    try {
        execSync(`curl.exe --config "${curlConfigPath}" --ftp-create-dirs -T "${file}" "${remoteUrl}" --silent --show-error`, { stdio: 'inherit' });
    } catch (err) {
        console.error(`❌ Failed to upload ${relativePath}`);
    }
});

// Clean up
try { fs.unlinkSync(curlConfigPath); } catch (e) { }

console.log("✅ DEPLOY FINISHED!");
