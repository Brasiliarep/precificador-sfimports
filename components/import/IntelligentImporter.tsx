import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  confidence: number;
  sampleData?: string[];
}

export interface ImportConfig {
  entityName: string;
  requiredFields: string[];
  optionalFields: string[];
  fieldLabels: {[key: string]: string};
  fieldTypes: {[key: string]: 'text' | 'number' | 'email' | 'phone' | 'cnpj' | 'date'};
  validationRules: {[key: string]: (value: any) => boolean};
  templatesKey: string;
}

interface ImportedRow {
  [key: string]: any;
  _originalData?: any;
  _validationErrors?: string[];
}

interface IntelligentImporterProps {
  config: ImportConfig;
  onImport: (data: ImportedRow[]) => void;
  onClose: () => void;
  // NOVO: Configuração de origem
  enableOrigemField?: boolean;
  origemOptions?: string[];
  defaultOrigem?: string;
}

const IntelligentImporter: React.FC<IntelligentImporterProps> = ({
  config,
  onImport,
  onClose,
  enableOrigemField = false,
  origemOptions = [],
  defaultOrigem = ''
}) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [previewData, setPreviewData] = useState<ImportedRow[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<{[key: string]: ColumnMapping[]}>({});
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [importProgress, setImportProgress] = useState(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  // NOVO: Estado para origem
  const [selectedOrigem, setSelectedOrigem] = useState<string>(defaultOrigem);
  const [customOrigem, setCustomOrigem] = useState<string>('');

  // Sinônimos para detecção inteligente
  const fieldSynonyms: {[key: string]: string[]} = {
    nome: ['nome', 'nome completo', 'razao social', 'razão social', 'clientenome', 'cliente', 'name', 'fullname', 'razao', 'social'],
    nomeFantasia: ['nome fantasia', 'nomefantasia', 'fantasia', 'name fantasia', 'trade name', 'nome comercial'],
    cnpj: ['cnpj', 'cpf', 'documento', 'doc', 'cnpj/cpf', 'taxid', 'ein', 'inscricao estadual', 'ie'],
    inscricaoEstadual: ['inscricao estadual', 'ie', 'insc est', 'inscricao', 'estadual'],
    inscricaoMunicipal: ['inscricao municipal', 'im', 'insc mun', 'inscricao', 'municipal'],
    dataFundacao: ['data fundacao', 'data de fundacao', 'fundacao', 'data fund', 'dt fundacao', 'fundacao empresa'],
    telefone: ['telefone', 'fone', 'tel', 'telefone principal', 'phone', 'telefone1', 'tel principal', 'telefone principal'],
    telefone2: ['telefone2', 'telefone 2', 'fone2', 'tel2', 'telefone secundario', 'phone2', 'telefone secundario'],
    celular: ['celular', 'cel', 'whatsapp', 'zap', 'mobile', 'celular1', 'cel1'],
    whatsapp: ['whatsapp', 'zap', 'whats', 'wpp', 'celular', 'cel'],
    email: ['email', 'e-mail', 'mail', 'email principal', 'email1', 'e-mail principal'],
    email2: ['email2', 'email 2', 'e-mail secundario', 'mail2', 'email secundario'],
    contato: ['contato', 'contato principal', 'pessoa contato', 'contato nome', 'contato principal nome'],
    cargoContato: ['cargo', 'cargo contato', 'funcao', 'cargo do contato', 'funcao contato'],
    endereco: ['endereco', 'endereço', 'address', 'logradouro', 'rua', 'avenida'],
    complemento: ['complemento', 'compl', 'numero complemento', 'apartamento', 'sala', 'bloco'],
    bairro: ['bairro', 'district', 'bairro'],
    cidade: ['cidade', 'city', 'municipio'],
    estado: ['estado', 'uf', 'state', 'sigla'],
    cep: ['cep', 'zipcode', 'codigo postal', 'postal code'],
    segmento: ['segmento', 'segment', 'categoria', 'ramo', 'area'],
    categoria: ['categoria', 'category', 'tipo cliente', 'classificacao'],
    potencial: ['potencial', 'potential', 'classificacao', 'nivel'],
    vendedorResponsavel: ['vendedor', 'vendedor responsavel', 'vendedor resp', 'consultor', 'vendedor principal'],
    limiteCredito: ['limite', 'limite credito', 'credito', 'limite de credito', 'credit limit'],
    statusCredito: ['status credito', 'status do credito', 'situacao credito', 'credito status'],
    condicoesPagamento: ['condicoes', 'condicoes pagamento', 'pagamento', 'cond pag', 'condicoes pgto'],
    diaCompraPreferido: ['dia compra', 'dia preferido', 'dia semana', 'dia preferencia', 'melhor dia'],
    frequenciaCompra: ['frequencia', 'frequencia compra', 'periodicidade', 'compra frequencia'],
    regiaoVendas: ['regiao', 'regiao vendas', 'regiao de vendas', 'area vendas', 'territorio'],
    mediaCompraMensal: ['media', 'media compra', 'media mensal', 'ticket medio', 'valor medio'],
    statusCliente: ['status', 'status cliente', 'situacao cliente', 'cliente status', 'situacao'],
    observacoes: ['observacoes', 'obs', 'observacao', 'notas', 'anotacoes'],
    valor: ['valor', 'preco', 'preço', 'price', 'valor ultima compra', 'valorcompra'],
    quantidade: ['quantidade', 'qty', 'amount', 'qtd', 'estoque', 'stock'],
    descricao: ['descricao', 'descrição', 'description', 'detalhes'],
    codigo: ['codigo', 'código', 'code', 'sku', 'id', 'referencia']
  };

  useEffect(() => {
    // Carregar templates salvos
    const templates = localStorage.getItem(`${config.templatesKey}-templates`);
    if (templates) {
      setSavedTemplates(JSON.parse(templates));
    }
  }, [config.templatesKey]);

  // Detecção automática de colunas
  const detectColumnMapping = useCallback((fileColumns: string[]): ColumnMapping[] => {
    const detectedMappings: ColumnMapping[] = [];
    const usedColumns = new Set<string>();
    const columnScores: {[key: string]: {column: string, score: number}} = {};

    // Primeiro, calcular scores para todas as colunas
    fileColumns.forEach(column => {
      const columnLower = column.toLowerCase().trim();
      
      // Verificar correspondência para todos os campos
      [...config.requiredFields, ...config.optionalFields].forEach(field => {
        const synonyms = fieldSynonyms[field] || [field];
        let bestScore = 0;
        
        // Correspondência exata
        if (synonyms.includes(columnLower)) {
          bestScore = 100;
        }
        // Correspondência parcial (palavra contida)
        else if (synonyms.some(syn => columnLower.includes(syn) || syn.includes(columnLower))) {
          bestScore = 85;
        }
        // Correspondência de palavras
        else {
          const columnWords = columnLower.split(/[\s_-]+/);
          const synWords = synonyms.flatMap(syn => syn.split(/[\s_-]+/));
          const commonWords = columnWords.filter(word => synWords.includes(word));
          if (commonWords.length > 0) {
            bestScore = (commonWords.length / Math.max(columnWords.length, synWords.length)) * 70;
          }
        }

        // Para telefones, dar peso extra se contiver números
        if (field === 'telefone' || field === 'telefone2' || field === 'whatsapp') {
          const hasNumbers = /\d/.test(column);
          if (hasNumbers) bestScore += 10;
        }

        // Para emails, dar peso extra se tiver @
        if (field === 'email' || field === 'email2') {
          const hasEmailSymbol = columnLower.includes('@') || columnLower.includes('email');
          if (hasEmailSymbol) bestScore += 10;
        }

        if (bestScore > (columnScores[field]?.score || 0)) {
          columnScores[field] = { column, score: bestScore };
        }
      });
    });

    // Mapear campos obrigatórios primeiro
    config.requiredFields.forEach(field => {
      if (columnScores[field] && columnScores[field].score > 50) {
        const mapping = columnScores[field];
        if (!usedColumns.has(mapping.column)) {
          detectedMappings.push({
            sourceColumn: mapping.column,
            targetField: field,
            confidence: mapping.score,
            sampleData: rawData.slice(0, 3).map(row => row[mapping.column]).filter(Boolean)
          });
          usedColumns.add(mapping.column);
        }
      }
    });

    // Mapear campos opcionais
    config.optionalFields.forEach(field => {
      if (columnScores[field] && columnScores[field].score > 60) {
        const mapping = columnScores[field];
        if (!usedColumns.has(mapping.column)) {
          detectedMappings.push({
            sourceColumn: mapping.column,
            targetField: field,
            confidence: mapping.score,
            sampleData: rawData.slice(0, 3).map(row => row[mapping.column]).filter(Boolean)
          });
          usedColumns.add(mapping.column);
        }
      }
    });

    // Lógica especial para telefones múltiplos
    const phoneColumns = fileColumns.filter(col => {
      const colLower = col.toLowerCase();
      return /\d/.test(col) || 
             colLower.includes('fone') || 
             colLower.includes('tel') || 
             colLower.includes('whatsapp') ||
             colLower.includes('cel') ||
             colLower.includes('zap');
    });

    // Se encontrou múltiplas colunas de telefone, distribuir inteligentemente
    if (phoneColumns.length >= 2) {
      const phoneFields = ['telefone', 'telefone2', 'whatsapp'];
      phoneFields.forEach((field, index) => {
        if (index < phoneColumns.length && !usedColumns.has(phoneColumns[index])) {
          detectedMappings.push({
            sourceColumn: phoneColumns[index],
            targetField: field,
            confidence: 90,
            sampleData: rawData.slice(0, 3).map(row => row[phoneColumns[index]]).filter(Boolean)
          });
          usedColumns.add(phoneColumns[index]);
        }
      });
    }

    return detectedMappings;
  }, [config, rawData]);

  // Processar arquivo
  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setStep('mapping');

    const data = await readExcelFile(uploadedFile);
    setRawData(data);
    
    if (data.length > 0) {
      const fileColumns = Object.keys(data[0]);
      setColumns(fileColumns);
      
      // NOVO: Detectar origem automaticamente
      if (enableOrigemField) {
        const detectedOrigem = detectOrigemFromFileName(uploadedFile.name);
        setSelectedOrigem(detectedOrigem);
      }
      
      // Tentar usar template salvo
      const templateName = `${uploadedFile.name}_${fileColumns.length}`;
      if (savedTemplates[templateName]) {
        setMappings(savedTemplates[templateName]);
        setSelectedTemplate(templateName);
      } else {
        // Detecção automática
        const autoMappings = detectColumnMapping(fileColumns);
        setMappings(autoMappings);
      }
    }
  };

  // NOVO: Detectar origem do nome do arquivo
  const detectOrigemFromFileName = (fileName: string): string => {
    const fileNameLower = fileName.toLowerCase();
    
    // Verificar opções pré-definidas
    for (const option of origemOptions) {
      if (fileNameLower.includes(option.toLowerCase())) {
        return option;
      }
    }
    
    // Detectar padrões comuns
    if (fileNameLower.includes('ravin')) return 'Ravin';
    if (fileNameLower.includes('total') && fileNameLower.includes('quimica')) return 'Total Química';
    if (fileNameLower.includes('food') || fileNameLower.includes('service')) return 'Food Service';
    if (fileNameLower.includes('vinho') || fileNameLower.includes('wine')) return 'Vinhos';
    if (fileNameLower.includes('bebida') || fileNameLower.includes('drink')) return 'Bebidas';
    if (fileNameLower.includes('limpeza') || fileNameLower.includes('clean')) return 'Limpeza';
    if (fileNameLower.includes('higiene')) return 'Higiene';
    
    // Extrair primeira palavra do nome do arquivo
    const words = fileName.replace(/\.[^/.]+$/, '').split(/[\s_-]+/);
    return words[0] || 'Importação Manual';
  };

  // Ler arquivo Excel/CSV
  const readExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Ler primeira planilha
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Converter para JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: '',
            blankrows: false
          });
          
          if (jsonData.length === 0) {
            resolve([]);
            return;
          }
          
          // Primeira linha como cabeçalho
          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1) as any[][];
          
          // Converter para objetos
          const objects = rows.map(row => {
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header || `col_${index}`] = row[index] || '';
            });
            return obj;
          });
          
          resolve(objects);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsArrayBuffer(file);
    });
  };

  // Adicionar mapeamento manual
  const addMapping = (sourceColumn: string, targetField: string) => {
    const existingIndex = mappings.findIndex(m => m.sourceColumn === sourceColumn);
    const newMapping: ColumnMapping = {
      sourceColumn,
      targetField,
      confidence: 100,
      sampleData: rawData.slice(0, 3).map(row => row[sourceColumn]).filter(Boolean)
    };

    if (existingIndex >= 0) {
      setMappings(prev => prev.map((m, i) => i === existingIndex ? newMapping : m));
    } else {
      setMappings(prev => [...prev, newMapping]);
    }
  };

  // Remover mapeamento
  const removeMapping = (sourceColumn: string) => {
    setMappings(prev => prev.filter(m => m.sourceColumn !== sourceColumn));
  };

  // Salvar template
  const saveTemplate = () => {
    if (!file) return;
    
    const templateName = prompt('Nome do template:', `${file.name}_${columns.length}`);
    if (templateName) {
      const newTemplates = { ...savedTemplates, [templateName]: mappings };
      setSavedTemplates(newTemplates);
      localStorage.setItem(`${config.templatesKey}-templates`, JSON.stringify(newTemplates));
      setSelectedTemplate(templateName);
    }
  };

  // Gerar preview
  const generatePreview = () => {
    const preview: ImportedRow[] = rawData.slice(0, 10).map(row => {
      const mappedRow: ImportedRow = { _originalData: row };
      const errors: string[] = [];

      mappings.forEach(mapping => {
        const value = row[mapping.sourceColumn];
        
        // Validação
        if (config.validationRules[mapping.targetField]) {
          if (!config.validationRules[mapping.targetField](value)) {
            errors.push(`Valor inválido em ${config.fieldLabels[mapping.targetField]}`);
          }
        }
        
        // Transformação de tipo
        if (config.fieldTypes[mapping.targetField] === 'number') {
          mappedRow[mapping.targetField] = parseFloat(String(value).replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
        } else {
          mappedRow[mapping.targetField] = value;
        }
      });

      // Verificar campos obrigatórios
      config.requiredFields.forEach(field => {
        if (!mappedRow[field] || mappedRow[field] === '') {
          errors.push(`Campo obrigatório faltando: ${config.fieldLabels[field]}`);
        }
      });

      if (errors.length > 0) {
        mappedRow._validationErrors = errors;
      }

      return mappedRow;
    });

    setPreviewData(preview);
    setStep('preview');
  };

  // Importar dados
  const handleImport = async () => {
    setStep('importing');
    setImportProgress(0);
    setImportErrors([]);

    try {
      const allData: ImportedRow[] = [];
      const batchSize = 100;
      const totalBatches = Math.ceil(rawData.length / batchSize);

      for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, rawData.length);
        const batch = rawData.slice(start, end);

        const processedBatch = batch.map(row => {
          const mappedRow: ImportedRow = { _originalData: row };
          const errors: string[] = [];

          mappings.forEach(mapping => {
            const value = row[mapping.sourceColumn];
            
            if (config.fieldTypes[mapping.targetField] === 'number') {
              mappedRow[mapping.targetField] = parseFloat(String(value).replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
            } else {
              mappedRow[mapping.targetField] = value;
            }
          });

          // NOVO: Adicionar campo origem
          if (enableOrigemField) {
            mappedRow.origem = selectedOrigem || customOrigem || 'Importação Manual';
          }

          config.requiredFields.forEach(field => {
            if (!mappedRow[field] || mappedRow[field] === '') {
              errors.push(`Campo obrigatório: ${config.fieldLabels[field]}`);
            }
          });

          if (errors.length > 0) {
            mappedRow._validationErrors = errors;
          }

          return mappedRow;
        });

        allData.push(...processedBatch);
        setImportProgress(Math.round(((i + 1) / totalBatches) * 100));
        
        // Pequeno delay para mostrar progresso
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const validData = allData.filter(row => !row._validationErrors || row._validationErrors.length === 0);
      const invalidData = allData.filter(row => row._validationErrors && row._validationErrors.length > 0);

      if (invalidData.length > 0) {
        setImportErrors([
          `${invalidData.length} registros com erros de validação`,
          ...invalidData.slice(0, 5).map(row => row._validationErrors?.join(', ') || '')
        ]);
      }

      onImport(validData);
      
    } catch (error) {
      setImportErrors([`Erro na importação: ${error}`]);
    }
  };

  // Renderizar etapa de upload
  const renderUpload = () => (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">📁</div>
      <h2 className="text-2xl font-bold mb-4">Importar {config.entityName}</h2>
      <p className="text-gray-600 mb-6">Selecione um arquivo Excel ou CSV</p>
      
      <div className="max-w-md mx-auto">
        <label className="block">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-500 transition-colors cursor-pointer">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-sm text-gray-600">
              Arraste o arquivo aqui ou clique para selecionar
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Formatos: .xlsx, .xls, .csv
            </p>
          </div>
          <input
            type="file"
            className="hidden"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          />
        </label>
      </div>
    </div>
  );

  // Renderizar etapa de mapeamento
  const renderMapping = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Mapear Colunas</h2>
        <div className="flex items-center space-x-2">
          {savedTemplates && Object.keys(savedTemplates).length > 0 && (
            <select
              value={selectedTemplate}
              onChange={(e) => {
                setSelectedTemplate(e.target.value);
                if (e.target.value && savedTemplates[e.target.value]) {
                  setMappings(savedTemplates[e.target.value]);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value && savedTemplates[e.target.value]) {
                  setMappings(savedTemplates[e.target.value]);
                  setSelectedTemplate(e.target.value);
                }
              }}
              className="border rounded px-3 py-2"
            >
              <option value="">Selecione um template</option>
              {Object.keys(savedTemplates).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          )}
          <button
            onClick={saveTemplate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            💾 Salvar Template
          </button>
        </div>
      </div>

      {/* NOVO: Campo de Origem */}
      {enableOrigemField && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-3">🎯 Origem dos Clientes</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Origem Detectada:</label>
              <select
                value={selectedOrigem}
                onChange={(e) => setSelectedOrigem(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Selecione...</option>
                {origemOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
                <option value="Ravin">Ravin</option>
                <option value="Total Química">Total Química</option>
                <option value="Food Service">Food Service</option>
                <option value="Vinhos">Vinhos</option>
                <option value="Bebidas">Bebidas</option>
                <option value="Limpeza">Limpeza</option>
                <option value="Higiene">Higiene</option>
                <option value="Personalizado">Personalizado...</option>
              </select>
            </div>
            
            {selectedOrigem === 'Personalizado' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Nome da Origem:</label>
                <input
                  type="text"
                  value={customOrigem}
                  onChange={(e) => setCustomOrigem(e.target.value)}
                  placeholder="Digite o nome da origem..."
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            )}
          </div>
          
          {file && (
            <div className="text-xs text-blue-600 mt-2">
              📁 Arquivo: {file.name} → Origem sugerida: {detectOrigemFromFileName(file.name)}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Colunas do arquivo */}
        <div>
          <h3 className="font-semibold mb-3">Colunas do Arquivo</h3>
          <div className="space-y-2">
            {columns.map(column => {
              const isMapped = mappings.some(m => m.sourceColumn === column);
              return (
                <div
                  key={column}
                  className={`p-3 border rounded cursor-pointer transition-colors ${
                    isMapped ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => !isMapped && setSelectedTemplate('')}
                >
                  <div className="font-medium">{column}</div>
                  <div className="text-xs text-gray-600">
                    {rawData.slice(0, 2).map(row => row[column]).filter(Boolean).join(', ')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Campos do sistema */}
        <div>
          <h3 className="font-semibold mb-3">Campos do Sistema</h3>
          <div className="space-y-2">
            {[...config.requiredFields, ...config.optionalFields].map(field => {
              const mapping = mappings.find(m => m.targetField === field);
              const isRequired = config.requiredFields.includes(field);
              
              return (
                <div key={field} className="p-3 border rounded">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {config.fieldLabels[field]} {isRequired && <span className="text-red-500">*</span>}
                      </div>
                      <div className="text-xs text-gray-600 capitalize">{config.fieldTypes[field]}</div>
                    </div>
                    {mapping ? (
                      <div className="flex items-center space-x-2">
                        <div className="text-xs text-green-600">
                          ✓ {mapping.sourceColumn} ({mapping.confidence.toFixed(0)}%)
                        </div>
                        <button
                          onClick={() => removeMapping(mapping.sourceColumn)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <select
                        className="border rounded px-2 py-1 text-sm"
                        onChange={(e) => e.target.value && addMapping(e.target.value, field)}
                        value=""
                      >
                        <option value="">Mapear...</option>
                        {columns
                          .filter(col => !mappings.some(m => m.sourceColumn === col))
                          .map(column => (
                            <option key={column} value={column}>{column}</option>
                          ))}
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <button
          onClick={() => setStep('upload')}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
        >
          ← Voltar
        </button>
        <button
          onClick={generatePreview}
          disabled={mappings.filter(m => config.requiredFields.includes(m.targetField)).length < config.requiredFields.length}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded"
        >
          Próximo →
        </button>
      </div>
    </div>
  );

  // Renderizar preview
  const renderPreview = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Preview dos Dados</h2>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
        <p className="text-sm text-yellow-800">
          <strong>Atenção:</strong> Verifique se os dados foram mapeados corretamente antes de importar.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border">
          <thead className="bg-gray-50">
            <tr>
              <th className="border p-2 text-left">Linha</th>
              {mappings.map(mapping => (
                <th key={mapping.targetField} className="border p-2 text-left">
                  {config.fieldLabels[mapping.targetField]}
                </th>
              ))}
              <th className="border p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {previewData.map((row, index) => (
              <tr key={index} className={row._validationErrors ? 'bg-red-50' : ''}>
                <td className="border p-2">{index + 1}</td>
                {mappings.map(mapping => (
                  <td key={mapping.targetField} className="border p-2">
                    {row[mapping.targetField]}
                  </td>
                ))}
                <td className="border p-2">
                  {row._validationErrors ? (
                    <span className="text-red-600 text-xs">
                      ❌ {row._validationErrors.join(', ')}
                    </span>
                  ) : (
                    <span className="text-green-600">✅ OK</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Mostrando {previewData.length} de {rawData.length} registros
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setStep('mapping')}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            ← Voltar
          </button>
          <button
            onClick={handleImport}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            🚀 Importar {rawData.length} registros
          </button>
        </div>
      </div>
    </div>
  );

  // Renderizar importação
  const renderImporting = () => (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">🚀</div>
      <h2 className="text-2xl font-bold mb-4">Importando...</h2>
      
      <div className="max-w-md mx-auto mb-6">
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
            className="bg-blue-600 h-4 rounded-full transition-all duration-300"
            style={{ width: `${importProgress}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">{importProgress}% concluído</p>
      </div>

      {importErrors.length > 0 && (
        <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded p-4">
          <h3 className="font-semibold text-red-800 mb-2">Erros encontrados:</h3>
          {importErrors.map((error, index) => (
            <p key={index} className="text-sm text-red-700">{error}</p>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Importador Inteligente</h1>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {step === 'upload' && renderUpload()}
          {step === 'mapping' && renderMapping()}
          {step === 'preview' && renderPreview()}
          {step === 'importing' && renderImporting()}
        </div>
      </div>
    </div>
  );
};

export default IntelligentImporter;
