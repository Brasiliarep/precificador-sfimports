// 🗄️ SF IMPORTS STORAGE - ÚNICO SOURCE OF TRUTH
// IndexedDB para persistência definitiva

interface SFImportsState {
  rows: any[];
  configuracoes: {
    varejo: {
      sellout: number;
      margem: number;
      frete: number;
      taxaCartao: number;
      lucroMinimo: number;
      ilusaoSF: number;
    };
    atacado: {
      sellout: number;
      margem: number;
      frete: number;
      taxaCartao: number;
      lucroMinimo: number;
      ilusaoSF: number;
    };
  };
  perfilAtivo: 'varejo' | 'atacado';
  metadata: {
    timestamp: string;
    version: string;
    totalProdutos: number;
    lastUpload?: string;
  };
}

const DB_NAME = 'SFImportsDB';
const DB_VERSION = 1;
const STORE_NAME = 'SFImportsState';

class SFImportsStorage {
  private db: IDBDatabase | null = null;

  // 🔥 Inicializar banco
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  }

  // 📥 Carregar estado completo
  async loadState(): Promise<SFImportsState | null> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('current');

      return new Promise((resolve) => {
        request.onsuccess = () => {
          const state = request.result;
          if (state) {
            console.log('📦 Estado carregado do IndexedDB:', {
              produtos: state.rows?.length || 0,
              perfil: state.perfilAtivo,
              timestamp: state.metadata?.timestamp
            });
            resolve(state);
          } else {
            console.log('📝 Nenhum estado encontrado no IndexedDB');
            resolve(null);
          }
        };
        request.onerror = () => {
          console.error('❌ Erro ao carregar estado');
          resolve(null);
        };
      });
    } catch (error) {
      console.error('❌ Erro ao inicializar DB:', error);
      return null;
    }
  }

  // 💾 Salvar estado completo
  async saveState(state: SFImportsState): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const stateWithMetadata = {
        ...state,
        metadata: {
          ...state.metadata,
          timestamp: new Date().toISOString(),
          version: '3.0-DEFINITIVE',
          totalProdutos: state.rows?.length || 0
        }
      };

      const request = store.put(stateWithMetadata, 'current');

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          console.log('💾 Estado salvo no IndexedDB:', {
            produtos: state.rows?.length || 0,
            perfil: state.perfilAtivo,
            timestamp: new Date().toISOString()
          });
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('❌ Erro ao salvar estado:', error);
    }
  }

  // 🗑️ Limpar estado completo
  async clearState(): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete('current');

      return new Promise((resolve) => {
        request.onsuccess = () => {
          console.log('🗑️ Estado limpo do IndexedDB');
          resolve();
        };
        request.onerror = () => {
          console.error('❌ Erro ao limpar estado');
          resolve();
        };
      });
    } catch (error) {
      console.error('❌ Erro ao limpar DB:', error);
    }
  }

  // 🔍 Verificar se tem estado
  async hasState(): Promise<boolean> {
    const state = await this.loadState();
    return state !== null && state.rows && state.rows.length > 0;
  }
}

// 🚀 Exportar instância única
export const sfImportsStorage = new SFImportsStorage();

// 📋 Tipos para exportação
export type { SFImportsState };
