const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Global CORS Configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));

app.use(express.json());

// Configuração do Multer para uploads
const upload = multer({ dest: 'uploads/' });

// Garantir que o diretório uploads exista
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Database connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sfimports',
  charset: 'utf8mb4'
};

let db;

async function initDatabase() {
  try {
    db = await mysql.createConnection(dbConfig);
    console.log('Conectado ao banco de dados MySQL');

    // Criar tabela de clientes se não existir
    await createTables();
  } catch (error) {
    console.error('Erro ao conectar ao banco de dados:', error);
    process.exit(1);
  }
}

async function createTables() {
  const createClientesTable = `
    CREATE TABLE IF NOT EXISTS clientes (
      id VARCHAR(255) PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      nomeFantasia VARCHAR(255),
      cnpj VARCHAR(20),
      inscricaoEstadual VARCHAR(50),
      inscricaoMunicipal VARCHAR(50),
      dataFundacao DATE,
      telefone VARCHAR(20),
      telefone2 VARCHAR(20),
      email VARCHAR(255),
      email2 VARCHAR(255),
      whatsapp VARCHAR(20),
      contato VARCHAR(255),
      cargoContato VARCHAR(255),
      enderecoRua VARCHAR(255),
      enderecoNumero VARCHAR(50),
      enderecoComplemento VARCHAR(255),
      enderecoBairro VARCHAR(255),
      enderecoCidade VARCHAR(255),
      enderecoEstado VARCHAR(10),
      enderecoCep VARCHAR(10),
      enderecoLatitude DECIMAL(10, 8),
      enderecoLongitude DECIMAL(11, 8),
      enderecoCobrancaRua VARCHAR(255),
      enderecoCobrancaNumero VARCHAR(50),
      enderecoCobrancaComplemento VARCHAR(255),
      enderecoCobrancaBairro VARCHAR(255),
      enderecoCobrancaCidade VARCHAR(255),
      enderecoCobrancaEstado VARCHAR(10),
      enderecoCobrancaCep VARCHAR(10),
      tipo ENUM('prospect', 'ativo', 'inativo') DEFAULT 'prospect',
      segmento VARCHAR(255),
      categoria VARCHAR(100),
      potencial ENUM('A', 'B', 'C') DEFAULT 'C',
      representacoes JSON,
      vendedorResponsavel VARCHAR(255),
      limiteCredito DECIMAL(15, 2) DEFAULT 0,
      statusCredito ENUM('liberado', 'bloqueado', 'analise', 'sem_limite') DEFAULT 'sem_limite',
      condicoesPagamento TEXT,
      diaCompraPreferido VARCHAR(50),
      frequenciaCompra VARCHAR(50),
      regiaoVendas VARCHAR(100),
      observacoes TEXT,
      origem VARCHAR(100),
      statusCliente ENUM('regular', 'atrasado', 'inadimplente', 'cancelado') DEFAULT 'regular',
      criadoEm TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      atualizadoEm TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      dataUltimaVisita DATE,
      valorUltimaCompra DECIMAL(15, 2),
      dataUltimaCompra DATE,
      mediaCompraMensal DECIMAL(15, 2)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await db.execute(createClientesTable);
    console.log('Tabela clientes verificada/criada com sucesso');
  } catch (error) {
    console.error('Erro ao criar tabela:', error);
  }
}

// API Routes

// GET - Listar todos os clientes
app.get('/api/clientes', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT *,
        JSON_OBJECT(
          'rua', enderecoRua,
          'numero', enderecoNumero,
          'complemento', enderecoComplemento,
          'bairro', enderecoBairro,
          'cidade', enderecoCidade,
          'estado', enderecoEstado,
          'cep', enderecoCep,
          'latitude', enderecoLatitude,
          'longitude', enderecoLongitude
        ) as endereco,
        JSON_OBJECT(
          'rua', enderecoCobrancaRua,
          'numero', enderecoCobrancaNumero,
          'complemento', enderecoCobrancaComplemento,
          'bairro', enderecoCobrancaBairro,
          'cidade', enderecoCobrancaCidade,
          'estado', enderecoCobrancaEstado,
          'cep', enderecoCobrancaCep
        ) as enderecoCobranca
      FROM clientes 
      ORDER BY nome
    `);

    // Transformar os dados para o formato esperado pelo frontend
    const clientes = rows.map(cliente => ({
      ...cliente,
      endereco: JSON.parse(cliente.endereco),
      enderecoCobranca: JSON.parse(cliente.enderecoCobranca),
      representacoes: cliente.representacoes ? JSON.parse(cliente.representacoes) : []
    }));

    res.json(clientes);
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
});

// POST - Criar novo cliente
app.post('/api/clientes', async (req, res) => {
  try {
    const cliente = req.body;

    const sql = `
      INSERT INTO clientes (
        id, nome, nomeFantasia, cnpj, inscricaoEstadual, inscricaoMunicipal,
        dataFundacao, telefone, telefone2, email, email2, whatsapp, contato,
        cargoContato, enderecoRua, enderecoNumero, enderecoComplemento,
        enderecoBairro, enderecoCidade, enderecoEstado, enderecoCep,
        enderecoLatitude, enderecoLongitude, enderecoCobrancaRua,
        enderecoCobrancaNumero, enderecoCobrancaComplemento, enderecoCobrancaBairro,
        enderecoCobrancaCidade, enderecoCobrancaEstado, enderecoCobrancaCep,
        tipo, segmento, categoria, potencial, representacoes, vendedorResponsavel,
        limiteCredito, statusCredito, condicoesPagamento, diaCompraPreferido,
        frequenciaCompra, regiaoVendas, observacoes, origem, statusCliente,
        dataUltimaVisita, valorUltimaCompra, dataUltimaCompra, mediaCompraMensal
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      cliente.id,
      cliente.nome,
      cliente.nomeFantasia || '',
      cliente.cnpj || '',
      cliente.inscricaoEstadual || '',
      cliente.inscricaoMunicipal || '',
      cliente.dataFundacao || null,
      cliente.telefone || '',
      cliente.telefone2 || '',
      cliente.email || '',
      cliente.email2 || '',
      cliente.whatsapp || '',
      cliente.contato || '',
      cliente.cargoContato || '',
      cliente.endereco?.rua || '',
      cliente.endereco?.numero || '',
      cliente.endereco?.complemento || '',
      cliente.endereco?.bairro || '',
      cliente.endereco?.cidade || '',
      cliente.endereco?.estado || '',
      cliente.endereco?.cep || '',
      cliente.endereco?.latitude || 0,
      cliente.endereco?.longitude || 0,
      cliente.enderecoCobranca?.rua || '',
      cliente.enderecoCobranca?.numero || '',
      cliente.enderecoCobranca?.complemento || '',
      cliente.enderecoCobranca?.bairro || '',
      cliente.enderecoCobranca?.cidade || '',
      cliente.enderecoCobranca?.estado || '',
      cliente.enderecoCobranca?.cep || '',
      cliente.tipo || 'prospect',
      cliente.segmento || '',
      cliente.categoria || '',
      cliente.potencial || 'C',
      JSON.stringify(cliente.representacoes || []),
      cliente.vendedorResponsavel || '',
      cliente.limiteCredito || 0,
      cliente.statusCredito || 'sem_limite',
      cliente.condicoesPagamento || '',
      cliente.diaCompraPreferido || '',
      cliente.frequenciaCompra || '',
      cliente.regiaoVendas || '',
      cliente.observacoes || '',
      cliente.origem || '',
      cliente.statusCliente || 'regular',
      cliente.dataUltimaVisita || null,
      cliente.valorUltimaCompra || null,
      cliente.dataUltimaCompra || null,
      cliente.mediaCompraMensal || null
    ];

    await db.execute(sql, values);
    res.status(201).json(cliente);
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ error: 'Erro ao criar cliente' });
  }
});

// PUT - Atualizar cliente
app.put('/api/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cliente = req.body;

    const sql = `
      UPDATE clientes SET
        nome = ?, nomeFantasia = ?, cnpj = ?, inscricaoEstadual = ?,
        inscricaoMunicipal = ?, dataFundacao = ?, telefone = ?, telefone2 = ?,
        email = ?, email2 = ?, whatsapp = ?, contato = ?, cargoContato = ?,
        enderecoRua = ?, enderecoNumero = ?, enderecoComplemento = ?,
        enderecoBairro = ?, enderecoCidade = ?, enderecoEstado = ?, enderecoCep = ?,
        enderecoLatitude = ?, enderecoLongitude = ?, enderecoCobrancaRua = ?,
        enderecoCobrancaNumero = ?, enderecoCobrancaComplemento = ?, enderecoCobrancaBairro = ?,
        enderecoCobrancaCidade = ?, enderecoCobrancaEstado = ?, enderecoCobrancaCep = ?,
        tipo = ?, segmento = ?, categoria = ?, potencial = ?, representacoes = ?,
        vendedorResponsavel = ?, limiteCredito = ?, statusCredito = ?,
        condicoesPagamento = ?, diaCompraPreferido = ?, frequenciaCompra = ?,
        regiaoVendas = ?, observacoes = ?, origem = ?, statusCliente = ?,
        dataUltimaVisita = ?, valorUltimaCompra = ?, dataUltimaCompra = ?, mediaCompraMensal = ?
      WHERE id = ?
    `;

    const values = [
      cliente.nome,
      cliente.nomeFantasia || '',
      cliente.cnpj || '',
      cliente.inscricaoEstadual || '',
      cliente.inscricaoMunicipal || '',
      cliente.dataFundacao || null,
      cliente.telefone || '',
      cliente.telefone2 || '',
      cliente.email || '',
      cliente.email2 || '',
      cliente.whatsapp || '',
      cliente.contato || '',
      cliente.cargoContato || '',
      cliente.endereco?.rua || '',
      cliente.endereco?.numero || '',
      cliente.endereco?.complemento || '',
      cliente.endereco?.bairro || '',
      cliente.endereco?.cidade || '',
      cliente.endereco?.estado || '',
      cliente.endereco?.cep || '',
      cliente.endereco?.latitude || 0,
      cliente.endereco?.longitude || 0,
      cliente.enderecoCobranca?.rua || '',
      cliente.enderecoCobranca?.numero || '',
      cliente.enderecoCobranca?.complemento || '',
      cliente.enderecoCobranca?.bairro || '',
      cliente.enderecoCobranca?.cidade || '',
      cliente.enderecoCobranca?.estado || '',
      cliente.enderecoCobranca?.cep || '',
      cliente.tipo || 'prospect',
      cliente.segmento || '',
      cliente.categoria || '',
      cliente.potencial || 'C',
      JSON.stringify(cliente.representacoes || []),
      cliente.vendedorResponsavel || '',
      cliente.limiteCredito || 0,
      cliente.statusCredito || 'sem_limite',
      cliente.condicoesPagamento || '',
      cliente.diaCompraPreferido || '',
      cliente.frequenciaCompra || '',
      cliente.regiaoVendas || '',
      cliente.observacoes || '',
      cliente.origem || '',
      cliente.statusCliente || 'regular',
      cliente.dataUltimaVisita || null,
      cliente.valorUltimaCompra || null,
      cliente.dataUltimaCompra || null,
      cliente.mediaCompraMensal || null,
      id
    ];

    await db.execute(sql, values);
    res.json(cliente);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ error: 'Erro ao atualizar cliente' });
  }
});

// DELETE - Excluir cliente
app.delete('/api/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM clientes WHERE id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    res.status(500).json({ error: 'Erro ao excluir cliente' });
  }
});

// POST - Importar múltiplos clientes
app.post('/api/clientes/import', async (req, res) => {
  try {
    const clientes = req.body;

    for (const cliente of clientes) {
      const sql = `
        INSERT INTO clientes (
          id, nome, nomeFantasia, cnpj, inscricaoEstadual, inscricaoMunicipal,
          dataFundacao, telefone, telefone2, email, email2, whatsapp, contato,
          cargoContato, enderecoRua, enderecoNumero, enderecoComplemento,
          enderecoBairro, enderecoCidade, enderecoEstado, enderecoCep,
          enderecoLatitude, enderecoLongitude, enderecoCobrancaRua,
          enderecoCobrancaNumero, enderecoCobrancaComplemento, enderecoCobrancaBairro,
          enderecoCobrancaCidade, enderecoCobrancaEstado, enderecoCobrancaCep,
          tipo, segmento, categoria, potencial, representacoes, vendedorResponsavel,
          limiteCredito, statusCredito, condicoesPagamento, diaCompraPreferido,
          frequenciaCompra, regiaoVendas, observacoes, origem, statusCliente,
          dataUltimaVisita, valorUltimaCompra, dataUltimaCompra, mediaCompraMensal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          nome = VALUES(nome),
          nomeFantasia = VALUES(nomeFantasia),
          cnpj = VALUES(cnpj),
          telefone = VALUES(telefone),
          email = VALUES(email),
          atualizadoEm = CURRENT_TIMESTAMP
      `;

      const values = [
        cliente.id,
        cliente.nome,
        cliente.nomeFantasia || '',
        cliente.cnpj || '',
        cliente.inscricaoEstadual || '',
        cliente.inscricaoMunicipal || '',
        cliente.dataFundacao || null,
        cliente.telefone || '',
        cliente.telefone2 || '',
        cliente.email || '',
        cliente.email2 || '',
        cliente.whatsapp || '',
        cliente.contato || '',
        cliente.cargoContato || '',
        cliente.endereco?.rua || '',
        cliente.endereco?.numero || '',
        cliente.endereco?.complemento || '',
        cliente.endereco?.bairro || '',
        cliente.endereco?.cidade || '',
        cliente.endereco?.estado || '',
        cliente.endereco?.cep || '',
        cliente.endereco?.latitude || 0,
        cliente.endereco?.longitude || 0,
        cliente.enderecoCobranca?.rua || '',
        cliente.enderecoCobranca?.numero || '',
        cliente.enderecoCobranca?.complemento || '',
        cliente.enderecoCobranca?.bairro || '',
        cliente.enderecoCobranca?.cidade || '',
        cliente.enderecoCobranca?.estado || '',
        cliente.enderecoCobranca?.cep || '',
        cliente.tipo || 'prospect',
        cliente.segmento || '',
        cliente.categoria || '',
        cliente.potencial || 'C',
        JSON.stringify(cliente.representacoes || []),
        cliente.vendedorResponsavel || '',
        cliente.limiteCredito || 0,
        cliente.statusCredito || 'sem_limite',
        cliente.condicoesPagamento || '',
        cliente.diaCompraPreferido || '',
        cliente.frequenciaCompra || '',
        cliente.regiaoVendas || '',
        cliente.observacoes || '',
        cliente.origem || '',
        cliente.statusCliente || 'regular',
        cliente.dataUltimaVisita || null,
        cliente.valorUltimaCompra || null,
        cliente.dataUltimaCompra || null,
        cliente.mediaCompraMensal || null
      ];

      await db.execute(sql, values);
    }

    res.status(201).json({ message: `${clientes.length} clientes importados com sucesso` });
  } catch (error) {
    console.error('Erro ao importar clientes:', error);
    res.status(500).json({ error: 'Erro ao importar clientes' });
  }
});

// POST - Remover fundo da imagem usando Python rembg
app.post('/api/removebg-local', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });

  const inputPath = req.file.path;
  const outputPath = inputPath + '_nobg.png';
  const scriptPath = path.join(__dirname, 'remover_fundo.py');

  // Chama o script Python
  exec(`python "${scriptPath}" "${inputPath}" "${outputPath}"`, (error, stdout, stderr) => {
    if (error || stdout.includes('ERROR')) {
      console.error('Erro no Python:', error || stdout);
      return res.status(500).json({ error: 'Falha ao processar imagem' });
    }

    // Lê a imagem gerada e envia de volta ao editor
    const processedImage = fs.readFileSync(outputPath);
    const base64Image = Buffer.from(processedImage).toString('base64');

    // Limpa os arquivos temporários
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

    res.json({ success: true, image: `data:image/png;base64,${base64Image}` });
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`API disponível em http://localhost:${PORT}/api`);
  });
});

module.exports = app;
