import React, { useState, useRef } from 'react';
import { Cliente, REPRESENTACOES } from '../../types/agenda';

interface ImportadorClientesProps {
  onImportComplete: (clientes: Cliente[]) => void;
}

const ImportadorClientes: React.FC<ImportadorClientesProps> = ({ onImportComplete }) => {
  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adicionarLog = (mensagem: string) => {
    setLog(prev => [...prev, `${new Date().toLocaleTimeString('pt-BR')} - ${mensagem}`]);
  };

  // Função para geocodificar endereço usando Google Maps API
  const geocodificarEndereco = async (endereco: string): Promise<{lat: number, lng: number} | null> => {
    try {
      // Usar Nominatim (OpenStreetMap) - gratuito e não precisa de API key
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}&limit=1&countrycodes=br`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
      return null;
    } catch (error) {
      console.error('Erro na geocodificação:', error);
      return null;
    }
  };

  // Função para processar arquivo CSV/Excel
  const processarArquivo = async (file: File) => {
    setImportando(true);
    setProgresso(0);
    setLog(['Iniciando importação...']);
    setPreview([]);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        adicionarLog('❌ Arquivo vazio!');
        setImportando(false);
        return;
      }

      // Detectar delimitador (vírgula ou ponto e vírgula)
      const firstLine = lines[0];
      const delimiter = firstLine.includes(',') ? ',' : ';';
      
      // Parse CSV
      const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase());
      const data = lines.slice(1).map(line => {
        const values = line.split(delimiter);
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = values[index]?.trim() || '';
        });
        return obj;
      }).filter(row => Object.keys(row).length > 1);

      adicionarLog(`📊 Encontrados ${data.length} registros no arquivo`);
      
      // Mostrar preview dos primeiros 5
      setPreview(data.slice(0, 5));
      
      // Mapear colunas para nosso formato
      const clientesProcessados: Cliente[] = [];
      let erros = 0;
      let sucesso = 0;

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        setProgresso(Math.round((i / data.length) * 100));

        try {
          // Tentar identificar colunas (variações possíveis)
          const nome = row['nome'] || row['razao social'] || row['cliente'] || row['name'] || '';
          const cnpj = row['cnpj'] || row['cpf'] || row['documento'] || '';
          const telefone = row['telefone'] || row['fone'] || row['phone'] || '';
          const email = row['email'] || row['e-mail'] || '';
          const whatsapp = row['whatsapp'] || row['celular'] || row['cel'] || telefone;
          
          // Endereço (várias colunas possíveis)
          const rua = row['rua'] || row['endereco'] || row['logradouro'] || row['address'] || '';
          const numero = row['numero'] || row['n'] || row['num'] || '';
          const bairro = row['bairro'] || row['district'] || '';
          const cidade = row['cidade'] || row['city'] || row['municipio'] || '';
          const estado = row['estado'] || row['uf'] || row['state'] || '';
          const cep = row['cep'] || row['zipcode'] || row['zip'] || '';

          if (!nome) {
            adicionarLog(`⚠️ Linha ${i + 2}: Sem nome, ignorando...`);
            erros++;
            continue;
          }

          // Montar endereço completo para geocodificação
          const enderecoCompleto = `${rua}, ${numero} - ${bairro}, ${cidade} - ${estado}, ${cep}`;
          
          let latitude = 0;
          let longitude = 0;

          // Geocodificar apenas se tiver endereço básico
          if (rua && cidade && estado) {
            adicionarLog(`📍 Geocodificando: ${nome}`);
            const coords = await geocodificarEndereco(enderecoCompleto);
            if (coords) {
              latitude = coords.lat;
              longitude = coords.lng;
              adicionarLog(`✅ Coordenadas encontradas para: ${nome}`);
            } else {
              adicionarLog(`⚠️ Coordenadas não encontradas para: ${nome}`);
            }
            
            // Pequeno delay para não sobrecarregar a API
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          const cliente: Cliente = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            nome: nome.trim(),
            cnpj: cnpj.trim(),
            telefone: telefone.trim(),
            email: email.trim(),
            whatsapp: whatsapp.trim(),
            endereco: {
              rua: rua.trim(),
              numero: numero.trim(),
              bairro: bairro.trim(),
              cidade: cidade.trim(),
              estado: estado.trim(),
              cep: cep.trim(),
              latitude,
              longitude
            },
            tipo: 'prospect', // Novos clientes entram como prospect
            segmento: row['segmento'] || row['categoria'] || row['segment'] || 'Não informado',
            potencial: (row['potencial']?.toUpperCase() || 'C') as 'A' | 'B' | 'C',
            representacoes: [], // Será preenchido manualmente
            observacoes: row['observacoes'] || row['obs'] || row['notas'] || '',
            criadoEm: new Date().toISOString(),
            atualizadoEm: new Date().toISOString()
          };

          clientesProcessados.push(cliente);
          sucesso++;

        } catch (error) {
          adicionarLog(`❌ Erro na linha ${i + 2}: ${error}`);
          erros++;
        }
      }

      adicionarLog(`✅ Importação concluída!`);
      adicionarLog(`📊 Sucesso: ${sucesso} clientes`);
      adicionarLog(`❌ Erros: ${erros} registros`);
      
      // Salvar no localStorage
      const clientesExistentes = JSON.parse(localStorage.getItem('agenda-clientes') || '[]');
      const todosClientes = [...clientesExistentes, ...clientesProcessados];
      localStorage.setItem('agenda-clientes', JSON.stringify(todosClientes));
      
      onImportComplete(todosClientes);
      adicionarLog(`💾 Total de clientes no sistema: ${todosClientes.length}`);

    } catch (error) {
      adicionarLog(`❌ Erro ao processar arquivo: ${error}`);
    } finally {
      setImportando(false);
      setProgresso(100);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type)) {
      adicionarLog('❌ Tipo de arquivo não suportado! Use CSV ou Excel.');
      return;
    }

    processarArquivo(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processarArquivo(file);
    }
  };

  const downloadModelo = () => {
    const csv = `nome,cnpj,telefone,email,whatsapp,rua,numero,bairro,cidade,estado,cep,segmento,potencial,observacoes
"Wine House Brasília","12.345.678/0001-90","(61) 3234-5678","contato@winehouse.com.br","(61) 98765-4321","SGAS 915","Loja 123","Asa Sul","Brasília","DF","70390-150","Varejo","A","Cliente premium"
"Empório do Vinho","98.765.432/0001-10","(61) 3456-7890","vendas@emporiodovinho.com.br","(61) 91234-5678","CLS 104","Bloco A","Asa Norte","Brasília","DF","70720-150","Varejo","B","Interessado em vinhos italianos"`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modelo_clientes.csv';
    link.click();
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">📥 Importar Clientes</h2>
        
        {/* Área de Upload */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">📁 Arraste o arquivo ou clique para selecionar</h3>
            <p className="text-gray-600 text-sm mb-4">
              Formatos aceitos: CSV, Excel (.xls, .xlsx)<br/>
              Máximo recomendado: 1000 clientes por lote
            </p>
            
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-4xl mb-2">📁</div>
              <p className="text-lg font-medium mb-2">
                {importando ? 'Processando...' : 'Clique ou arraste o arquivo aqui'}
              </p>
              <p className="text-sm text-gray-500">
                CSV ou Excel com até 4000 clientes
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Download do Modelo */}
          <div className="text-center">
            <button
              onClick={downloadModelo}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              📥 Baixar Modelo CSV
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Use o modelo para garantir formato correto
            </p>
          </div>
        </div>

        {/* Progresso */}
        {importando && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">📊 Processando...</h3>
            <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
              <div 
                className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${progresso}%` }}
              />
            </div>
            <p className="text-center text-sm text-gray-600">{progresso}%</p>
          </div>
        )}

        {/* Preview */}
        {preview.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">👁️ Preview (primeiros 5 registros)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Nome</th>
                    <th className="px-4 py-2 text-left">CNPJ</th>
                    <th className="px-4 py-2 text-left">Telefone</th>
                    <th className="px-4 py-2 text-left">Cidade</th>
                    <th className="px-4 py-2 text-left">Potencial</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, index) => (
                    <tr key={index} className="border-b">
                      <td className="px-4 py-2">{row.nome || row.razao_social || '-'}</td>
                      <td className="px-4 py-2">{row.cnpj || '-'}</td>
                      <td className="px-4 py-2">{row.telefone || '-'}</td>
                      <td className="px-4 py-2">{row.cidade || '-'}</td>
                      <td className="px-4 py-2">{row.potencial || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Log */}
        {log.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">📋 Log da Importação</h3>
            <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-64 overflow-y-auto">
              {log.map((linha, index) => (
                <div key={index}>{linha}</div>
              ))}
            </div>
          </div>
        )}

        {/* Instruções */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-blue-800">📖 Instruções</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p><strong>1.</strong> Baixe o modelo CSV acima</p>
            <p><strong>2.</strong> Preencha com seus dados (até 4000 clientes)</p>
            <p><strong>3.</strong> Salve como CSV (separado por vírgula)</p>
            <p><strong>4.</strong> Arraste ou selecione o arquivo</p>
            <p><strong>5.</strong> Aguarde a geocodificação automática</p>
            <div className="mt-4 p-3 bg-blue-100 rounded">
              <strong>⚠️ Importante:</strong> O sistema buscará automaticamente as coordenadas 
              usando o endereço completo. Clientes sem endereço ficarão sem coordenadas.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportadorClientes;
