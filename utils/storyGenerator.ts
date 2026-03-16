// ========================================
// GERADOR DE STORIES AVANÇADO
// ========================================

interface StoryConfig {
  template: 'sf' | 'parceiro';
  precoDe: string;
  precoPor: string;
  imagemX: number;
  imagemY: number;
  imagemWidth: number;
  imagemHeight: number;
  nomeX: number;
  nomeY: number;
  nomeTamanho: number;
  precoDeX: number;
  precoDeY: number;
  precoDeTamanho: number;
  precoPorX: number;
  precoPorY: number;
  precoPorTamanho: number;
  nomeCor: string;
  precoDeCor: string;
  precoPorCor: string;
  nomeFonte: string;
  precoFonte: string;
  nomeNegrito: boolean;
  precoNegrito: boolean;
  nomeItalico: boolean;
  precoItalico: boolean;
}

interface Produto {
  id: string;
  nome: string;
  imagem: string;
  precoVenda: number;
  precoOriginal: number;
}

export class StoryGenerator {
  static async gerarStoryAvancado(
    produto: Produto,
    config: StoryConfig,
    canvas: HTMLCanvasElement
  ): Promise<void> {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas não encontrado');

    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Carregar template
    await this.carregarTemplate(ctx, config.template);

    // Carregar e desenhar imagem do produto
    await this.desenharImagemProduto(ctx, produto, config);

    // Desenhar textos com configurações avançadas
    this.desenharTextosAvancados(ctx, produto, config);

    // Adicionar marca d'água
    this.adicionarMarcaDagua(ctx, config.template);
  }

  private static async carregarTemplate(ctx: CanvasRenderingContext2D, template: string): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();

      // Para desenvolvimento, usar um template simulado
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 1080, 1920);
        resolve();
      };

      img.onerror = () => {
        // Se não carregar, usar fundo branco
        ctx.fillStyle = template === 'sf' ? '#8B5A3C' : '#2E7D32';
        ctx.fillRect(0, 0, 1080, 1920);

        // Adicionar logo simulado
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 32px Arial';
        ctx.fillText(template === 'sf' ? 'SF IMPORTS' : 'OTOVAL', 50, 100);

        resolve();
      };

      // Tentar carregar template real
      img.src = `/templates/${template}-story.png`;
    });
  }

  private static async desenharImagemProduto(
    ctx: CanvasRenderingContext2D,
    produto: Produto,
    config: StoryConfig
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        // Desenhar imagem com as configurações de posição e tamanho
        ctx.drawImage(
          img,
          config.imagemX,
          config.imagemY,
          config.imagemWidth,
          config.imagemHeight
        );
        resolve();
      };

      img.onerror = () => {
        // Se não carregar imagem, desenhar placeholder
        ctx.fillStyle = '#E0E0E0';
        ctx.fillRect(config.imagemX, config.imagemY, config.imagemWidth, config.imagemHeight);

        ctx.fillStyle = '#666666';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Imagem não disponível', config.imagemX + config.imagemWidth / 2, config.imagemY + config.imagemHeight / 2);
        ctx.textAlign = 'left';

        resolve();
      };

      img.crossOrigin = 'anonymous';
      img.src = produto.imagem;
    });
  }

  private static desenharTextosAvancados(
    ctx: CanvasRenderingContext2D,
    produto: Produto,
    config: StoryConfig
  ): void {
    // Desenhar nome do produto
    this.desenharTextoComEstilo(
      ctx,
      produto.nome,
      config.nomeX,
      config.nomeY,
      config.nomeTamanho,
      config.nomeCor,
      config.nomeFonte,
      config.nomeNegrito,
      config.nomeItalico
    );

    // Desenhar preço DE (se existir)
    if (produto.precoOriginal > produto.precoVenda) {
      this.desenharTextoComEstilo(
        ctx,
        `DE: R$ ${produto.precoOriginal.toFixed(2).replace('.', ',')}`,
        config.precoDeX,
        config.precoDeY,
        config.precoDeTamanho,
        config.precoDeCor,
        config.precoFonte,
        config.precoNegrito,
        config.precoItalico
      );
    }

    // Desenhar preço POR
    this.desenharTextoComEstilo(
      ctx,
      `POR: R$ ${produto.precoVenda.toFixed(2).replace('.', ',')}`,
      config.precoPorX,
      config.precoPorY,
      config.precoPorTamanho,
      config.precoPorCor,
      config.precoFonte,
      config.precoNegrito,
      config.precoItalico
    );
  }

  private static desenharTextoComEstilo(
    ctx: CanvasRenderingContext2D,
    texto: string,
    x: number,
    y: number,
    tamanho: number,
    cor: string,
    fonte: string,
    negrito: boolean,
    italico: boolean
  ): void {
    ctx.fillStyle = cor;

    let estiloFonte = '';
    if (negrito) estiloFonte += 'bold ';
    if (italico) estiloFonte += 'italic ';
    estiloFonte += `${tamanho}px ${fonte}`;

    ctx.font = estiloFonte;

    // Adicionar sombra para melhor legibilidade
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Quebrar texto se for muito longo
    const maxLargura = 500; // pixels
    const palavras = texto.split(' ');
    let linhaAtual = '';
    let linhaY = y;

    for (const palavra of palavras) {
      const testeLinha = linhaAtual + (linhaAtual ? ' ' : '') + palavra;
      const metrics = ctx.measureText(testeLinha);

      if (metrics.width > maxLargura && linhaAtual) {
        ctx.fillText(linhaAtual, x, linhaY);
        linhaAtual = palavra;
        linhaY += tamanho * 1.2; // Espaçamento entre linhas
      } else {
        linhaAtual = testeLinha;
      }
    }

    if (linhaAtual) {
      ctx.fillText(linhaAtual, x, linhaY);
    }

    // Resetar sombra
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  private static adicionarMarcaDagua(ctx: CanvasRenderingContext2D, template: string): void {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';

    const texto = template === 'sf' ? 'SF IMPORTS' : 'OTOVAL';
    ctx.fillText(texto, 1080 / 2, 1920 - 50);

    ctx.textAlign = 'left';
  }

  static downloadStory(canvas: HTMLCanvasElement, produto: Produto): void {
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');

    // Nome do arquivo formatado
    const nomeArquivo = produto.nome
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);

    link.download = `story-${nomeArquivo}-${Date.now()}.png`;
    link.href = dataUrl;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('✅ Story baixado com sucesso!');
  }

  static gerarPreviewRapido(config: StoryConfig): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;

    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Fundo branco
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Desenhar elementos de preview
    ctx.strokeStyle = '#4ECDC4';
    ctx.lineWidth = 2;

    // Imagem
    ctx.strokeRect(config.imagemX, config.imagemY, config.imagemWidth, config.imagemHeight);

    // Nome
    ctx.strokeRect(config.nomeX, config.nomeY - config.nomeTamanho, 200, config.nomeTamanho + 10);

    // Preço DE
    ctx.strokeRect(config.precoDeX, config.precoDeY - config.precoDeTamanho, 150, config.precoDeTamanho + 10);

    // Preço POR
    ctx.strokeRect(config.precoPorX, config.precoPorY - config.precoPorTamanho, 150, config.precoPorTamanho + 10);

    // Textos de exemplo
    ctx.fillStyle = config.nomeCor;
    ctx.font = `${config.nomeNegrito ? 'bold' : ''} ${config.nomeItalico ? 'italic' : ''} ${config.nomeTamanho}px ${config.nomeFonte}`;
    ctx.fillText('NOME DO PRODUTO', config.nomeX, config.nomeY);

    ctx.fillStyle = config.precoDeCor;
    ctx.font = `${config.precoNegrito ? 'bold' : ''} ${config.precoItalico ? 'italic' : ''} ${config.precoDeTamanho}px ${config.precoFonte}`;
    ctx.fillText(config.precoDe || 'DE: R$ 31,10', config.precoDeX, config.precoDeY);

    ctx.fillStyle = config.precoPorCor;
    ctx.font = `${config.precoNegrito ? 'bold' : ''} ${config.precoItalico ? 'italic' : ''} ${config.precoPorTamanho}px ${config.precoFonte}`;
    ctx.fillText(config.precoPor || 'POR: R$ 26,90', config.precoPorX, config.precoPorY);

    return canvas;
  }

  static validarConfig(config: StoryConfig): { valido: boolean; erros: string[] } {
    const erros: string[] = [];

    // Validar posições
    if (config.imagemX < 0 || config.imagemX > 1080) erros.push('Posição X da imagem inválida');
    if (config.imagemY < 0 || config.imagemY > 1920) erros.push('Posição Y da imagem inválida');
    if (config.imagemWidth <= 0 || config.imagemWidth > 1080) erros.push('Largura da imagem inválida');
    if (config.imagemHeight <= 0 || config.imagemHeight > 1920) erros.push('Altura da imagem inválida');

    if (config.nomeX < 0 || config.nomeX > 1080) erros.push('Posição X do nome inválida');
    if (config.nomeY < 0 || config.nomeY > 1920) erros.push('Posição Y do nome inválida');
    if (config.nomeTamanho <= 0 || config.nomeTamanho > 200) erros.push('Tamanho do nome inválido');

    if (config.precoDeX < 0 || config.precoDeX > 1080) erros.push('Posição X do preço DE inválida');
    if (config.precoDeY < 0 || config.precoDeY > 1920) erros.push('Posição Y do preço DE inválida');
    if (config.precoDeTamanho <= 0 || config.precoDeTamanho > 200) erros.push('Tamanho do preço DE inválido');

    if (config.precoPorX < 0 || config.precoPorX > 1080) erros.push('Posição X do preço POR inválida');
    if (config.precoPorY < 0 || config.precoPorY > 1920) erros.push('Posição Y do preço POR inválida');
    if (config.precoPorTamanho <= 0 || config.precoPorTamanho > 200) erros.push('Tamanho do preço POR inválido');

    // Validar cores
    const corRegex = /^#[0-9A-F]{6}$/i;
    if (!corRegex.test(config.nomeCor)) erros.push('Cor do nome inválida');
    if (!corRegex.test(config.precoDeCor)) erros.push('Cor do preço DE inválida');
    if (!corRegex.test(config.precoPorCor)) erros.push('Cor do preço POR inválida');

    return {
      valido: erros.length === 0,
      erros
    };
  }

  static getConfiguracaoPadrao(template: 'sf' | 'parceiro'): StoryConfig {
    return {
      template,
      precoDe: '',
      precoPor: '',
      imagemX: 540,
      imagemY: 400,
      imagemWidth: 600,
      imagemHeight: 600,
      nomeX: 540,
      nomeY: 1200,
      nomeTamanho: 48,
      precoDeX: 540,
      precoDeY: 1300,
      precoDeTamanho: 32,
      precoPorX: 540,
      precoPorY: 1350,
      precoPorTamanho: 48,
      nomeCor: '#000000',
      precoDeCor: '#000000',
      precoPorCor: '#000000',
      nomeFonte: 'Arial',
      precoFonte: 'Arial',
      nomeNegrito: false,
      precoNegrito: false,
      nomeItalico: false,
      precoItalico: false
    };
  }

  static salvarConfiguracao(config: StoryConfig, nome: string): void {
    const configs = this.getConfiguracoesSalvas();
    configs[nome] = config;
    localStorage.setItem('storyConfigs', JSON.stringify(configs));
  }

  static getConfiguracoesSalvas(): Record<string, StoryConfig> {
    const salvo = localStorage.getItem('storyConfigs');
    return salvo ? JSON.parse(salvo) : {};
  }

  static carregarConfiguracao(nome: string): StoryConfig | null {
    const configs = this.getConfiguracoesSalvas();
    return configs[nome] || null;
  }
}

export default StoryGenerator;
