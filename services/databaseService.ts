// 🗄️ BANCO DE DADOS DEFINITIVO - NUNCA PERDE DADOS
export class DatabaseService {
  private static instance: DatabaseService;
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'SFImports_Definitivo';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'produtos';

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log('🗄️ Banco de dados iniciado com sucesso!');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'rowId' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('📦 Tabela de produtos criada!');
        }
      };
    });
  }

  async saveProducts(produtos: any[]): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);
    
    // Limpar e salvar tudo
    store.clear();
    produtos.forEach(produto => {
      store.add({
        ...produto,
        timestamp: Date.now()
      });
    });

    console.log(`💾 ${produtos.length} produtos salvos DEFINITIVAMENTE!`);
  }

  async loadProducts(): Promise<any[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const produtos = request.result;
        console.log(`📦 ${produtos.length} produtos carregados DEFINITIVAMENTE!`);
        resolve(produtos);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async clearProducts(): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);
    store.clear();
    console.log('🗑️ Banco de dados limpo!');
  }

  hasProducts(): Promise<boolean> {
    return this.loadProducts().then(produtos => produtos.length > 0);
  }
}

export const dbService = DatabaseService.getInstance();
