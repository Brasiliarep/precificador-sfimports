// Serviço de API para persistência de clientes
const API_BASE_URL = '/api';


class ClienteService {
  // Buscar todos os clientes
  async getClientes() {
    try {
      const response = await fetch(`${API_BASE_URL}/clientes`);
      if (!response.ok) {
        throw new Error('Erro ao buscar clientes');
      }
      return await response.json();
    } catch (error) {
      console.error('Erro na API:', error);
      // Fallback para localStorage se a API falhar
      return this.getClientesFromStorage();
    }
  }

  // Salvar um cliente (criar ou atualizar)
  async salvarCliente(cliente) {
    try {
      const method = cliente.id && await this.verificarClienteExistente(cliente.id) ? 'PUT' : 'POST';
      const url = method === 'PUT' ? `${API_BASE_URL}/clientes/${cliente.id}` : `${API_BASE_URL}/clientes`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cliente)
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar cliente');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro na API:', error);
      // Fallback para localStorage
      return this.salvarClienteStorage(cliente);
    }
  }

  // Excluir um cliente
  async excluirCliente(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/clientes/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir cliente');
      }

      return true;
    } catch (error) {
      console.error('Erro na API:', error);
      // Fallback para localStorage
      return this.excluirClienteStorage(id);
    }
  }

  // Importar múltiplos clientes
  async importarClientes(clientes) {
    try {
      const response = await fetch(`${API_BASE_URL}/clientes/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientes)
      });

      if (!response.ok) {
        throw new Error('Erro ao importar clientes');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro na API:', error);
      // Fallback para localStorage
      return this.importarClientesStorage(clientes);
    }
  }

  // Verificar se cliente existe
  async verificarClienteExistente(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/clientes`);
      if (!response.ok) return false;

      const clientes = await response.json();
      return clientes.some(c => c.id === id);
    } catch (error) {
      return false;
    }
  }

  // Métodos de fallback para localStorage
  getClientesFromStorage() {
    const data = localStorage.getItem('clientes');
    return data ? JSON.parse(data) : [];
  }

  salvarClienteStorage(cliente) {
    const clientes = this.getClientesFromStorage();

    if (cliente.id && clientes.some(c => c.id === cliente.id)) {
      // Atualizar cliente existente
      const index = clientes.findIndex(c => c.id === cliente.id);
      clientes[index] = { ...cliente, atualizadoEm: new Date().toISOString() };
    } else {
      // Criar novo cliente
      const novoCliente = {
        ...cliente,
        id: cliente.id || Date.now().toString(),
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString()
      };
      clientes.push(novoCliente);
    }

    localStorage.setItem('clientes', JSON.stringify(clientes));
    return cliente;
  }

  excluirClienteStorage(id) {
    const clientes = this.getClientesFromStorage();
    const filtered = clientes.filter(c => c.id !== id);
    localStorage.setItem('clientes', JSON.stringify(filtered));
    return true;
  }

  importarClientesStorage(clientes) {
    const clientesExistentes = this.getClientesFromStorage();

    clientes.forEach(novoCliente => {
      const index = clientesExistentes.findIndex(c => c.id === novoCliente.id);

      if (index >= 0) {
        // Atualizar cliente existente
        clientesExistentes[index] = {
          ...novoCliente,
          atualizadoEm: new Date().toISOString()
        };
      } else {
        // Adicionar novo cliente
        clientesExistentes.push({
          ...novoCliente,
          criadoEm: new Date().toISOString(),
          atualizadoEm: new Date().toISOString()
        });
      }
    });

    localStorage.setItem('clientes', JSON.stringify(clientesExistentes));
    return { message: `${clientes.length} clientes importados com sucesso` };
  }

  // Sincronizar dados do localStorage com a API
  async sincronizarComAPI() {
    try {
      const clientesLocalStorage = this.getClientesFromStorage();
      if (clientesLocalStorage.length === 0) return;

      console.log('Sincronizando', clientesLocalStorage.length, 'clientes com a API...');

      await this.importarClientes(clientesLocalStorage);

      // Limpar localStorage após sincronização bem-sucedida
      localStorage.removeItem('clientes');

      console.log('Sincronização concluída com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro na sincronização:', error);
      return false;
    }
  }

  // Verificar status da API
  async verificarStatusAPI() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// Exportar instância única
export const clienteService = new ClienteService();
export default clienteService;
