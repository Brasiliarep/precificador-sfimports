import React, { useState, useEffect } from 'react';
import { DashboardRow, GlobalSettings, StoreProduct } from '../types';
import { Download, Printer, Link as LinkIcon, Search, Trash2, Unlink, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import * as XLSX from 'xlsx';

// Função para extrair ID do nome
const extractId = (nome: string): string | null => {
  const match = nome.match(/\|\s*(\d+)/);
  return match ? match[1].trim() : null;
};

// Função para limpar nome do produto
const cleanProductName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\sà-ú]/g, '')
    .replace(/\b(vinho|wine|750ml|garrafa|taça|copo|fl|fr|ml|cl)\b/g, '')
    .trim();
};

// Função para formatar moeda
const formatCurrency = (value: number): string => {
  return `R$${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface ResultsTableProps {
  rows: DashboardRow[];
  settings: GlobalSettings;
  viewMode: 'RETAIL' | 'B2B';
  onUpdateRow?: (rowId: string, field: string, value: any) => void;
  onLinkProduct?: (rowId: string) => void;
  onDeleteRow?: (rowId: string) => void;
  storeCatalog?: any[];
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
  rows,
  settings,
  viewMode,
  onUpdateRow,
  onLinkProduct,
  onDeleteRow,
  storeCatalog
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [localRows, setLocalRows] = useState<DashboardRow[]>([]);

  // Atualizar localRows quando rows mudar
  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  // Função SF Final
  const handleSfFinalChange = (rowId: string, novoValor: number) => {
    const row = localRows.find(r => r.rowId === rowId);
    if (row) {
      const newRows = localRows.map(r => 
        r.rowId === rowId 
          ? { ...r, sfFinal: novoValor }
          : r
      );
      setLocalRows(newRows);
      console.log('SF Final atualizado:', rowId, novoValor);
    }
  };

  // Filter rows for display
  const filteredRows = localRows.filter(r => 
    r.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.storeProduct && r.storeProduct.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200 gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="text-sm text-gray-600">
          {filteredRows.length} de {localRows.length} produtos
        </div>
      </div>

      {/* TABELA OTIMIZADA */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs overflow-x-auto">
          <thead className="bg-gray-100 border-b-2 border-gray-300">
            <tr className="text-xs font-semibold text-gray-700 uppercase">
              <th className="w-[40%] p-1 text-sm font-bold border-b bg-gray-50">Produto Milão</th>
              <th className="w-[8%] p-1 text-xs text-center font-bold border-b bg-gray-50">SF Match</th>
              <th className="w-[6%] p-1 text-xs text-right font-bold border-b bg-blue-50">Milão De</th>
              <th className="w-[6%] p-1 text-xs text-right font-bold border-b bg-blue-50">Milão Por</th>
              <th className="w-[6%] p-1 text-xs text-right font-bold border-b bg-yellow-50">Instagram</th>
              <th className="w-[6%] p-1 text-xs text-right font-bold border-b bg-purple-50">Ilusão</th>
              <th className="w-[6%] p-1 text-xs text-right font-bold border-b bg-green-50">SF De</th>
              <th className="w-[6%] p-1 text-xs text-right font-bold border-b bg-green-50">SF Por</th>
              <th className="w-[8%] p-1 text-xs text-right font-bold border-b bg-blue-100">SF Sugestão</th>
              <th className="w-[6%] p-1 text-xs text-right font-bold border-b bg-gray-100">Lucro Real</th>
              <th className="w-[8%] p-1 text-xs text-right font-bold border-b bg-yellow-100">SF Final</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              // 🔥 PROTEÇÃO CONTRA NULL - VERIFICAÇÕES INICIAIS
              const temDadosSF = row.storeProduct && row.storeProduct.price;
              const temDadosMilao = row.supplierCostRaw && row.supplierCostRaw > 0;
              const custoOperacional = 5; // Frete fixo
              
              return (
              <tr key={row.rowId} className="hover:bg-gray-50 border-b text-sm">
                {/* 1. COLUNA PRODUTO (Milão + SF na mesma célula) */}
                <td className="p-2 align-top">
                  <div className="font-bold text-gray-800 flex items-center mb-1">
                    <button onClick={() => onDeleteRow?.(row.rowId)} className="text-red-500 mr-1">🗑️</button>
                    {row.supplierName}
                  </div>
                  {row.storeProduct && (
                    <div className="text-blue-600 text-xs flex items-center ml-4">
                      🔹 {row.storeProduct.name}
                    </div>
                  )}
                </td>

                {/* 2. COLUNA SF MATCH (Compacto - só botão) */}
                <td className="text-center p-1">
                  {row.storeProduct ? (
                    <button onClick={() => onLinkProduct?.(row.rowId)} className="text-green-600 hover:text-green-800 text-sm">
                      ✅
                    </button>
                  ) : (
                    <button onClick={() => onLinkProduct?.(row.rowId)} className="text-red-600 hover:text-red-800 text-sm">
                      🔗
                    </button>
                  )}
                </td>

                {/* 3. Milão De */}
                <td className="text-right p-1">
                  {temDadosMilao ? (
                    formatCurrency(row.suggestedListPrice || 0)
                  ) : (
                    <span className="text-gray-400">--</span>
                  )}
                </td>

                {/* 4. Milão Por */}
                <td className="font-bold text-gray-800 text-right bg-gray-50 p-1">
                  {temDadosMilao ? (
                    formatCurrency(row.supplierCostRaw || 0)
                  ) : (
                    <span className="text-gray-400">--</span>
                  )}
                </td>

                {/* 5. Instagram */}
                <td className="p-1">
                  {temDadosMilao && row.instagramPrice && row.instagramPrice > 0 ? (
                    <input 
                      type="number" 
                      step="0.01" 
                      defaultValue={row.instagramPrice || 0}
                      className="w-full p-1 border rounded text-right text-xs bg-yellow-50" 
                    />
                  ) : (
                    <div className="text-right text-gray-400 text-xs">--</div>
                  )}
                </td>

                {/* 6. Ilusão */}
                <td className="text-purple-600 font-bold text-right p-1">
                  {temDadosMilao ? (
                    formatCurrency(row.precoIlusao || 0)
                  ) : (
                    <span className="text-gray-400">--</span>
                  )}
                </td>

                {/* 7. SF De */}
                <td className="text-right p-1">
                  {temDadosSF ? (
                    formatCurrency(row.storeProduct?.price || 0)
                  ) : (
                    <span className="text-gray-400">--</span>
                  )}
                </td>

                {/* 8. SF Por */}
                <td className="text-right p-1">
                  {temDadosSF ? (
                    formatCurrency(row.suggestedSalePrice || 0)
                  ) : (
                    <span className="text-gray-400">--</span>
                  )}
                </td>

                {/* 9. COLUNA SF SUGESTÃO (Calculada, Não Editável) */}
                <td className="text-right bg-blue-50 font-bold text-blue-700">
                  {(() => {
                    if (!temDadosSF && !temDadosMilao) {
                      return <span className="text-gray-400">--</span>;
                    }
                    
                    if (temDadosSF && !temDadosMilao) {
                      // Exclusivo SF: Margem fixa 20%
                      const sfPrice = row.storeProduct?.price || 0;
                      const margemMin = 0.20;
                      const custoTotal = sfPrice + custoOperacional;
                      const taxaCartao = 0.04;
                      const precoSugerido = custoTotal / (1 - taxaCartao) / (1 - margemMin);
                      return formatCurrency(precoSugerido);
                    }
                    
                    if (temDadosSF && temDadosMilao) {
                      // Ambos: Bater concorrente -5%
                      const milaoPor = row.supplierCostRaw || 0;
                      return formatCurrency(milaoPor * 0.95);
                    }
                    
                    // Só Milão: mostrar preço dele
                    return formatCurrency(row.supplierCostRaw || 0);
                  })()}
                </td>

                {/* 10. Lucro Real */}
                <td className={`text-right p-1 font-bold ${(() => {
                  if (!temDadosSF || !temDadosMilao) {
                    return 'text-gray-400 bg-gray-50';
                  }
                  
                  const sfPrice = row.storeProduct?.price || 0;
                  const milaoPor = row.supplierCostRaw || 0;
                  const lucroReal = sfPrice - milaoPor - custoOperacional;
                  return lucroReal < 10 ? 'text-red-600 bg-red-100' : 'text-green-600 bg-green-50';
                })()}`}>
                  {(() => {
                    if (!temDadosSF || !temDadosMilao) {
                      return <span className="text-gray-400">--</span>;
                    }
                    
                    const sfPrice = row.storeProduct?.price || 0;
                    const milaoPor = row.supplierCostRaw || 0;
                    const lucroReal = sfPrice - milaoPor - custoOperacional;
                    return formatCurrency(lucroReal);
                  })()}
                </td>

                {/* 11. COLUNA SF FINAL (Editável, Default = Sugestão) */}
                <td className="p-1 text-right bg-yellow-100 border-l">
                  {temDadosSF ? (
                    <input 
                      type="number" 
                      step="0.01"
                      defaultValue={(() => {
                        if (temDadosSF && !temDadosMilao) {
                          // Exclusivo SF: Usar sugestão calculada
                          const sfPrice = row.storeProduct?.price || 0;
                          const margemMin = 0.20;
                          const custoTotal = sfPrice + custoOperacional;
                          const taxaCartao = 0.04;
                          const precoSugerido = custoTotal / (1 - taxaCartao) / (1 - margemMin);
                          return precoSugerido.toFixed(2);
                        }
                        
                        if (temDadosSF && temDadosMilao) {
                          // Ambos: Bater concorrente -5%
                          const milaoPor = row.supplierCostRaw || 0;
                          return (milaoPor * 0.95).toFixed(2);
                        }
                        
                        // Só Milão: mostrar preço dele
                        return (row.supplierCostRaw || 0).toFixed(2);
                      })()}
                      className="w-full text-right bg-transparent border-none p-1 font-bold text-base focus:ring-2 focus:ring-yellow-400 rounded"
                      style={{minWidth: '85px'}}
                      onChange={(e) => handleSfFinalChange(row.rowId, parseFloat(e.target.value || 0))}
                    />
                  ) : (
                    <span className="text-gray-400">--</span>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* DEBUG INFO */}
      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-bold text-lg mb-2">🔍 DEBUG INFO</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <strong>Total Linhas:</strong> {filteredRows.length}
          </div>
          <div>
            <strong>Vinculados:</strong> {filteredRows.filter(r => !!r.storeProduct).length}
          </div>
          <div>
            <strong>Sem Vínculo:</strong> {filteredRows.filter(r => !r.storeProduct).length}
          </div>
        </div>
      </div>
    </div>
  );
};
