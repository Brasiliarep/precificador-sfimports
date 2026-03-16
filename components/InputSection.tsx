import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, FileText, Check, AlertCircle } from 'lucide-react';
import { parseExcelFile } from '../utils/excelParser';

interface InputSectionProps {
  title: string;
  description: string;
  color: string;
  textValue: string;
  setTextValue: (val: string) => void;
  placeholder: string;
}

export const InputSection: React.FC<InputSectionProps> = ({
  title,
  description,
  color,
  textValue,
  setTextValue,
  placeholder
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFileName(file.name);
      setIsProcessing(true);

      try {
        const textContent = await parseExcelFile(file);
        setTextValue(textContent);
      } catch (error) {
        console.error("Error parsing file:", error);
        alert("Erro ao ler o arquivo Excel. Verifique se não está corrompido.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border-t-4 ${color} p-6 flex-1 flex flex-col h-full`}>
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-800 mb-1">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>

      {/* File Upload Area */}
      <div 
        className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors mb-4 ${fileName ? 'bg-green-50 border-green-300' : 'border-gray-300 hover:bg-gray-50'}`}
        onClick={() => fileInputRef.current?.click()}
      >
        {isProcessing ? (
           <div className="animate-pulse flex flex-col items-center">
             <FileSpreadsheet className="w-8 h-8 text-gray-400 mb-2" />
             <span className="text-sm font-medium text-gray-600">Lendo Planilha...</span>
           </div>
        ) : fileName ? (
          <div className="flex flex-col items-center">
             <Check className="w-8 h-8 text-green-600 mb-2" />
             <span className="text-sm font-bold text-green-700">{fileName}</span>
             <span className="text-xs text-green-600 mt-1">Arquivo carregado com sucesso!</span>
             <span className="text-xs text-gray-400 mt-2">Clique para trocar</span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <span className="text-sm font-medium text-gray-600">Carregar Tabela (Excel / CSV)</span>
            <span className="text-xs text-gray-400 mt-1">Suporta .xlsx, .xls, .csv</span>
          </div>
        )}
        
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
          onChange={handleFileChange}
        />
      </div>

      {/* Text Preview Area */}
      <div className="relative flex-grow flex flex-col">
        <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
          <FileText className="w-4 h-4" />
          <span>Conteúdo (Gerado automaticamente ou Cole aqui)</span>
        </div>
        <textarea
          className="w-full flex-grow p-4 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[200px] resize-y"
          placeholder={placeholder}
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
        />
        <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-400">
               {textValue ? "O conteúdo da planilha aparecerá aqui." : "Aguardando dados..."}
            </span>
            <span className="text-xs text-gray-400">
            {textValue.length} caracteres
            </span>
        </div>
      </div>
    </div>
  );
};