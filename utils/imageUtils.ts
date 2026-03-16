const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD') // Decompõe caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remove os acentos
    .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
    .replace(/[\s_-]+/g, '-') // Substitui espaços e underscores por hífens
    .replace(/^-+|-+$/g, ''); // Remove hífens no início e fim
};

export const getImagemLocalPrecificador = (urlOriginal: string | undefined | null, productName?: string) => {
  // REGRA DE OURO DO SÉRGIO: Se houver qualquer dúvida, retorna a ORIGINAL ou tenta GEOMETRIA LIMPA.
  
  const lowerName = (productName || "").toLowerCase();
  const slug = productName ? slugify(productName) : "";

  // 1. SE NÃO TEM URL ORIGINAL, TENTAMOS ADIVINHAR PELO NOME
  if (!urlOriginal || urlOriginal.trim() === "") {
    if (slug) {
      return `/imagens_sem_fundo/${slug}.png`;
    }
    return "";
  }

  const lowerUrl = urlOriginal.toLowerCase();

  // 2. DETECÇÃO DE BANNER/KITS NA URL ORIGINAL
  const isBanner = lowerUrl.includes('story') ||
    lowerUrl.includes('promo') ||
    lowerUrl.includes('banner') ||
    lowerUrl.includes('background') ||
    lowerName.includes('kit') ||
    lowerName.includes('combo');

  // 3. TENTATIVA DE MAPEAMENTO PARA IMAGEM LIMPA (SEM FUNDO)
  try {
    // Extrai o slug do produto da URL original
    const parts = urlOriginal.split('/');
    const fileNameWithExt = parts[parts.length - 1];
    const nomeBase = fileNameWithExt.split('.')[0];

    // Se temos um nome base válido na URL, priorizamos ele para o caminho local
    if (nomeBase && nomeBase.length > 3) {
      const localPath = `/imagens_sem_fundo/${nomeBase}.png`;

      // Se for banner ou URL já interna, forçamos o localPath
      if (isBanner || lowerUrl.includes('imagens_produtos') || lowerUrl.includes('imagens_sem_fundo') || lowerUrl.includes('imagens%20sem%20fundo')) {
        return localPath;
      }

      // Se a URL original for muito longa (Base64) ou externa suspeita, sugerimos o localPath
      if (urlOriginal.length > 500 || (!urlOriginal.startsWith('http') && !urlOriginal.startsWith('/'))) {
         return localPath;
      }
    } else if (slug) {
      // Se não conseguimos extrair da URL mas temos slug pelo nome, usamos o slug
      return `/imagens_sem_fundo/${slug}.png`;
    }
  } catch (e) {
    // Fallback para slug se falhar o parse da URL
    if (slug) return `/imagens_sem_fundo/${slug}.png`;
  }

  // PADRÃO: Retorna a URL original. 
  return urlOriginal;
};
