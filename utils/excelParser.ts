import * as XLSX from 'xlsx';

export const parseExcelFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Grab the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON array of arrays first (handles merged cells better)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        
        // Join columns with " | " (Pipe) instead of comma. 
        // This is CRITICAL for Brazilian prices (R$ 1,50) to not break the column structure.
        const text = jsonData.map((row: any) => row.join(' | ')).join('\n');
        
        resolve(text);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    
    // Read as binary string
    reader.readAsBinaryString(file);
  });
};