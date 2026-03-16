// TIPOS DE PEDIDOS - Versão Simplificada SF Imports

export interface ItemPedido {
  qty: number;
  name: string;
  price: number;
}

export interface Pedido {
  id: number;
  date: string;
  client: string;
  phone: string;
  items: ItemPedido[];
  total: number;
  pay: string;
  obs: string;
  discount: number;
  payLink: string;
  origin: string;
  paid: boolean;
  delivered: boolean;
}

// Utilitários para Pedidos Simplificados
export class PedidoUtils {
  // Gerar número do pedido
  static gerarNumeroPedido(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `SF${year}${month}${day}${random}`;
  }

  // Calcular total do pedido
  static calcularTotal(items: ItemPedido[]): number {
    return items.reduce((total, item) => total + (item.qty * item.price), 0);
  }

  // Calcular total com desconto
  static calcularTotalComDesconto(items: ItemPedido[], discount: number): number {
    const subtotal = this.calcularTotal(items);
    return subtotal - discount;
  }

  // Validar pedido
  static validarPedido(pedido: Partial<Pedido>): { valido: boolean; erros: string[] } {
    const erros: string[] = [];

    if (!pedido.client || pedido.client.trim().length < 3) {
      erros.push('Nome do cliente é obrigatório');
    }

    if (!pedido.phone || pedido.phone.length < 10) {
      erros.push('Telefone do cliente é inválido');
    }

    if (!pedido.items || pedido.items.length === 0) {
      erros.push('Pedido deve ter pelo menos um item');
    }

    pedido.items?.forEach((item, index) => {
      if (!item.name || item.name.trim().length < 2) {
        erros.push(`Item ${index + 1}: Nome é obrigatório`);
      }
      if (!item.qty || item.qty <= 0) {
        erros.push(`Item ${index + 1}: Quantidade inválida`);
      }
      if (!item.price || item.price <= 0) {
        erros.push(`Item ${index + 1}: Preço inválido`);
      }
    });

    return {
      valido: erros.length === 0,
      erros
    };
  }

  // Formatar telefone
  static formatarTelefone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    
    return phone;
  }

  // Gerar link de pagamento
  static gerarPayLink(pedidoId: number): string {
    return `https://sfimportsdf.com.br/pagar/${pedidoId}`;
  }

  // Status do pedido
  static getStatus(pedido: Pedido): string {
    if (!pedido.paid && !pedido.delivered) return 'Pendente';
    if (pedido.paid && !pedido.delivered) return 'Pago';
    if (pedido.paid && pedido.delivered) return 'Entregue';
    return 'Desconhecido';
  }

  // Cor do status
  static getCorStatus(pedido: Pedido): string {
    if (!pedido.paid && !pedido.delivered) return '#FFA500'; // Laranja
    if (pedido.paid && !pedido.delivered) return '#007BFF'; // Azul
    if (pedido.paid && pedido.delivered) return '#10B981'; // Verde
    return '#6B7280'; // Cinza
  }
}

export default PedidoUtils;
