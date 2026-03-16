import React, { useState, useEffect, useRef } from 'react';
import { Cliente, Visita } from '../../types/agenda';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type: 'text' | 'chart' | 'action' | 'report';
  data?: any;
}

interface Command {
  id: string;
  command: string;
  description: string;
  icon: string;
  action: () => void;
}

const SFBot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Carregar dados do sistema
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);

  useEffect(() => {
    // Carregar dados do localStorage
    const storedClientes = localStorage.getItem('agenda-clientes');
    const storedVisitas = localStorage.getItem('agenda-visitas');
    const storedProdutos = localStorage.getItem('produtos');
    
    if (storedClientes) setClientes(JSON.parse(storedClientes));
    if (storedVisitas) setVisitas(JSON.parse(storedVisitas));
    if (storedProdutos) setProdutos(JSON.parse(storedProdutos));

    // Mensagem de boas-vindas
    setMessages([{
      id: '1',
      text: '🤖 Olá! Sou o SF Bot, seu assistente virtual. Posso ajudar com:\n\n• Consultas de produtos e preços\n• Relatórios e estatísticas\n• Sugestões de vendas\n• Agendamento de visitas\n• Análise de clientes\n\nComo posso ajudar você hoje?',
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    }]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Processar comando com IA
  const processCommand = async (text: string) => {
    setIsTyping(true);
    
    // Simular processamento da IA
    await new Promise(resolve => setTimeout(resolve, 1500));

    const lowerText = text.toLowerCase();
    
    // COMANDOS DE PRODUTOS
    if (lowerText.includes('produto') || lowerText.includes('preço') || lowerText.includes('vinho')) {
      if (lowerText.includes('abaixo de') || lowerText.includes('menos que')) {
        const valor = lowerText.match(/\d+/)?.[0];
        if (valor) {
          const produtosFiltrados = produtos.filter(p => 
            parseFloat(p.preco?.replace(',', '.') || 0) <= parseFloat(valor)
          ).slice(0, 10);
          
          if (produtosFiltrados.length > 0) {
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              text: `🍷 Encontrei ${produtosFiltrados.length} produtos abaixo de R$${valor}:`,
              sender: 'bot',
              timestamp: new Date(),
              type: 'chart',
              data: produtosFiltrados
            }]);
          } else {
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              text: `❌ Não encontrei produtos abaixo de R$${valor}.`,
              sender: 'bot',
              timestamp: new Date(),
              type: 'text'
            }]);
          }
        }
      }
    }
    
    // COMANDOS DE CLIENTES
    else if (lowerText.includes('cliente') || lowerText.includes('clientes')) {
      if (lowerText.includes('top') || lowerText.includes('melhores')) {
        const topClientes = clientes
          .sort((a, b) => (b.valorUltimaCompra || 0) - (a.valorUltimaCompra || 0))
          .slice(0, 10);
        
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: '🏆 Top 10 Clientes por valor de compra:',
          sender: 'bot',
          timestamp: new Date(),
          type: 'report',
          data: topClientes
        }]);
      } else if (lowerText.includes('sem visita') || lowerText.includes('sem retorno')) {
        const diasSemVisita = lowerText.match(/\d+/)?.[0] || '30';
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - parseInt(diasSemVisita));
        
        const clientesSemVisita = clientes.filter(cliente => {
          const ultimaVisita = visitas
            .filter(v => v.clienteId === cliente.id && v.status === 'realizada')
            .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())[0];
          
          return !ultimaVisita || new Date(ultimaVisita.dataHora) < dataLimite;
        });

        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: `⚠️ Encontrei ${clientesSemVisita.length} clientes sem visita há ${diasSemVisita} dias:`,
          sender: 'bot',
          timestamp: new Date(),
          type: 'report',
          data: clientesSemVisita
        }]);
      }
    }
    
    // COMANDOS DE RELATÓRIOS
    else if (lowerText.includes('relatório') || lowerText.includes('relatorio') || lowerText.includes('vendas')) {
      if (lowerText.includes('mês') || lowerText.includes('mes')) {
        const mesAtual = new Date().getMonth();
        const anoAtual = new Date().getFullYear();
        
        const visitasMes = visitas.filter(v => {
          const dataVisita = new Date(v.dataHora);
          return dataVisita.getMonth() === mesAtual && dataVisita.getFullYear() === anoAtual;
        });

        const realizadas = visitasMes.filter(v => v.status === 'realizada').length;
        const agendadas = visitasMes.filter(v => v.status === 'agendada').length;
        const taxaConversao = realizadas > 0 ? ((realizadas / visitasMes.length) * 100).toFixed(1) : '0';

        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: `📊 Relatório do Mês Atual:\n\n• Total de visitas: ${visitasMes.length}\n• Realizadas: ${realizadas}\n• Agendadas: ${agendadas}\n• Taxa de conversão: ${taxaConversao}%`,
          sender: 'bot',
          timestamp: new Date(),
          type: 'report',
          data: { total: visitasMes.length, realizadas, agendadas, taxaConversao }
        }]);
      }
    }
    
    // COMANDOS DE SUGESTÕES
    else if (lowerText.includes('sugestão') || lowerText.includes('sugestao') || lowerText.includes('o que vender')) {
      const produtosPopulares = produtos
        .sort(() => Math.random() - 0.5)
        .slice(0, 5);
      
      const clientesPotenciais = clientes
        .filter(c => c.potencial === 'A' && c.tipo === 'ativo')
        .slice(0, 3);

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: '💡 Sugestões de Venda:\n\n🍷 Produtos populares para ofertar:\n' + 
          produtosPopulares.map(p => `• ${p.nome || p.supplierName} - R$${p.preco}`).join('\n') +
          '\n\n🎯 Clientes potenciais para focar:\n' +
          clientesPotenciais.map(c => `• ${c.nome} - ${c.cidade}`).join('\n'),
        sender: 'bot',
        timestamp: new Date(),
        type: 'action',
        data: { produtos: produtosPopulares, clientes: clientesPotenciais }
      }]);
    }
    
    // COMANDOS DE PREVISÃO
    else if (lowerText.includes('previsão') || lowerText.includes('previsao') || lowerText.includes('futuro')) {
      const proximos30dias = visitas.filter(v => {
        const dataVisita = new Date(v.dataHora);
        const hoje = new Date();
        const daqui30dias = new Date();
        daqui30dias.setDate(daqui30dias.getDate() + 30);
        return dataVisita >= hoje && dataVisita <= daqui30dias && v.status === 'agendada';
      });

      const vendasProjetadas = proximos30dias.length * 2500; // Média estimada por visita

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: `🔮 Previsão para próximos 30 dias:\n\n• Visitas agendadas: ${proximos30dias.length}\n• Vendas projetadas: R$${vendasProjetadas.toLocaleString('pt-BR')}\n• Clientes ativos: ${clientes.filter(c => c.tipo === 'ativo').length}\n\n💡 Recomendação: Focar nos clientes potenciais A e B.`,
        sender: 'bot',
        timestamp: new Date(),
        type: 'chart',
        data: { visitas: proximos30dias.length, vendasProjetadas }
      }]);
    }
    
    // COMANDO PADRÃO
    else {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: '🤖 Não entendi completamente. Tente perguntar como:\n\n• "Quais produtos abaixo de R$100?"\n• "Mostre os top 10 clientes"\n• "Relatório do mês atual"\n• "Quais clientes sem visita há 30 dias?"\n• "Me dê sugestões de venda"\n• "Qual a previsão para próximos dias?"',
        sender: 'bot',
          timestamp: new Date(),
          type: 'text'
      }]);
    }
    
    setIsTyping(false);
  };

  // Comandos rápidos
  const quickCommands: Command[] = [
    {
      id: '1',
      command: 'Top 10 Clientes',
      description: 'Mostrar melhores clientes',
      icon: '🏆',
      action: () => processCommand('mostre os top 10 clientes')
    },
    {
      id: '2',
      command: 'Relatório do Mês',
      description: 'Estatísticas mensais',
      icon: '📊',
      action: () => processCommand('relatório do mês atual')
    },
    {
      id: '3',
      command: 'Sugestões de Venda',
      description: 'Oportunidades de negócio',
      icon: '💡',
      action: () => processCommand('me dê sugestões de venda')
    },
    {
      id: '4',
      command: 'Clientes sem Visita',
      description: 'Clientes abandonados',
      icon: '⚠️',
      action: () => processCommand('clientes sem visita há 30 dias')
    },
    {
      id: '5',
      command: 'Previsão de Vendas',
      description: 'Projeções futuras',
      icon: '🔮',
      action: () => processCommand('qual a previsão para próximos 30 dias')
    }
  ];

  // Reconhecimento de voz
  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
        alert('Erro no reconhecimento de voz. Tente novamente.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } else {
      alert('Seu navegador não suporta reconhecimento de voz.');
    }
  };

  const handleSend = () => {
    if (inputText.trim()) {
      const userMessage: Message = {
        id: Date.now().toString(),
        text: inputText,
        sender: 'user',
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, userMessage]);
      processCommand(inputText);
      setInputText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">🤖</div>
            <div>
              <h1 className="text-xl font-bold">SF Bot</h1>
              <p className="text-xs opacity-90">Seu assistente virtual inteligente</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs">Online</span>
          </div>
        </div>
      </div>

      {/* Comandos Rápidos */}
      <div className="bg-gray-800 p-3 border-b border-gray-700">
        <div className="flex space-x-2 overflow-x-auto">
          {quickCommands.map(cmd => (
            <button
              key={cmd.id}
              onClick={cmd.action}
              className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors"
            >
              <span>{cmd.icon}</span>
              <span>{cmd.command}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-2xl ${
              message.sender === 'user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-100'
            } rounded-lg p-3`}>
              <div className="flex items-start space-x-2">
                <div className="text-lg">{message.sender === 'user' ? '👤' : '🤖'}</div>
                <div className="flex-1">
                  <div className="whitespace-pre-line">{message.text}</div>
                  
                  {/* Renderizar dados especiais */}
                  {message.type === 'chart' && message.data && (
                    <div className="mt-3 bg-gray-800 rounded p-3">
                      <div className="text-sm font-semibold mb-2">📊 Resultados:</div>
                      {Array.isArray(message.data) && message.data.slice(0, 5).map((item: any, index) => (
                        <div key={index} className="text-xs py-1">
                          {item.nome || item.supplierName || item.clienteNome} - R${item.preco || item.valorUltimaCompra || '0'}
                        </div>
                      ))}
                    </div>
                  )}

                  {message.type === 'report' && message.data && (
                    <div className="mt-3 bg-gray-800 rounded p-3">
                      <div className="text-sm font-semibold mb-2">📋 Detalhes:</div>
                      {Array.isArray(message.data) && message.data.slice(0, 5).map((item: any, index) => (
                        <div key={index} className="text-xs py-1">
                          {item.nome || item.clienteNome} - {item.cidade || 'N/A'}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-xs opacity-70 mt-2">
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-700 text-gray-100 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="text-lg">🤖</div>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={startListening}
            className={`p-3 rounded-lg transition-colors ${
              isListening 
                ? 'bg-red-600 text-white animate-pulse' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🎤
          </button>
          
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua pergunta ou comando..."
            className="flex-1 bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isTyping}
          />
          
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isTyping}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Enviar
          </button>
        </div>
        
        <div className="text-xs text-gray-400 mt-2 text-center">
          💡 Dica: Use os comandos rápidos acima ou fale naturalmente com o assistente
        </div>
      </div>
    </div>
  );
};

export default SFBot;
