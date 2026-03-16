# 📥 Importador de Clientes - Manual Completo

## 🎯 OBJETIVO
Importar até 4000 clientes de uma só vez com geocodificação automática de endereços usando Google Maps/OpenStreetMap.

## 📋 FORMATO DO ARQUIVO

### Colunas Obrigatórias:
- **nome**: Razão Social do cliente
- **cnpj**: CNPJ ou CPF (sem formatação)
- **telefone**: Telefone comercial
- **email**: E-mail principal

### Colunas Opcionais (Recomendadas):
- **whatsapp**: WhatsApp (se não informado, usa telefone)
- **rua**: Logradouro/Endereço
- **numero**: Número da casa/prédio
- **bairro**: Bairro
- **cidade**: Cidade
- **estado**: UF (sigla)
- **cep**: CEP
- **segmento**: Segmento de mercado (ex: Varejo, Food Service)
- **potencial**: Potencial do cliente (A, B ou C)
- **observacoes**: Observações gerais

### Variações de Nomes Aceitos:
```
Nome da coluna -> Variações aceitas
nome -> nome, razao social, cliente, name
cnpj -> cnpj, cpf, documento
telefone -> telefone, fone, phone
email -> email, e-mail
whatsapp -> whatsapp, celular, cel
rua -> rua, endereco, logradouro, address
numero -> numero, n, num
bairro -> bairro, district
cidade -> cidade, city, municipio
estado -> estado, uf, state
cep -> cep, zipcode, zip
segmento -> segmento, categoria, segment
potencial -> potencial (A/B/C)
observacoes -> observacoes, obs, notas
```

## 🚀 COMO USAR

### Passo 1: Baixar Modelo
1. No sistema SF Imports
2. Clique em "📅 AGENDA REP"
3. Clique em "👥 Clientes CRM"
4. Clique em "📥 Importar Clientes"
5. Clique em "📥 Baixar Modelo CSV"

### Passo 2: Preencher Dados
1. Abra o arquivo CSV no Excel ou Google Sheets
2. Preencha com seus dados (máximo 4000 linhas)
3. **DICA**: Use fórmulas para padronizar dados
4. Salve como "CSV (separado por vírgula)"

### Passo 3: Importar
1. Volte ao sistema
2. Clique em "📥 Importar Clientes"
3. Arraste o arquivo ou clique para selecionar
4. Aguarde o processamento

## 📍 GEOCODIFICAÇÃO AUTOMÁTICA

### Como Funciona:
1. O sistema monta o endereço completo
2. Busca coordenadas no OpenStreetMap (gratuito)
3. Salva latitude/longitude no cliente
4. **Delay**: 1 segundo entre buscas (não sobrecarregar API)

### Requisitos para Geocodificação:
- **Mínimo**: Rua + Cidade + Estado
- **Ideal**: Rua + Número + Bairro + Cidade + Estado + CEP
- **Formato**: Endereço completo, sem abreviações

### Exemplos de Endereços:
```
✅ Bom: "SGAS 915, Loja 123, Asa Sul, Brasília, DF, 70390-150"
✅ Bom: "Avenida Paulista, 1000, Bela Vista, São Paulo, SP, 01310-100"
❌ Ruim: "SGAS 915" (incompleto)
❌ Ruim: "Brasília" (muito genérico)
```

## 📊 ESTRUTURA DO IMPORTADOR

### Interface:
- **Drag & Drop**: Arraste arquivo CSV/Excel
- **Preview**: Mostra primeiros 5 registros
- **Progresso**: Barra de progresso em tempo real
- **Log**: Detalhes do processamento

### Processamento:
1. **Validação**: Tipo e estrutura do arquivo
2. **Parse**: Identificação automática de colunas
3. **Geocodificação**: Busca de coordenadas
4. **Mapeamento**: Conversão para formato interno
5. **Salvamento**: Armazenamento no localStorage

## ⚠️ REGRAS E LIMITAÇÕES

### Limites:
- **Máximo recomendado**: 1000 clientes por lote
- **Máximo suportado**: 4000 clientes
- **Timeout**: 30 minutos por importação

### Tratamento de Dados:
- **Novos clientes**: Entram como "prospect"
- **Potencial padrão**: "C" se não informado
- **Representações**: Vazio (preencher manualmente)
- **Coordenadas**: 0,0 se não encontrado endereço

### Erros Comuns:
```
Erro -> Solução
"Arquivo vazio" -> Verifique se o arquivo tem dados
"Tipo não suportado" -> Use CSV ou Excel
"Sem nome" -> Preencha coluna nome obrigatória
"Coordenadas não encontradas" -> Verifique endereço completo
```

## 📱 RESULTADOS ESPERADOS

### Após Importação:
1. **Dashboard**: Atualizado com novos clientes
2. **Clientes CRM**: Lista completa com filtros
3. **Mapa**: Pins nos endereços geocodificados
4. **Visitas**: Clientes disponíveis para agendamento

### Estatísticas:
- ✅ Total importado com sucesso
- ❌ Registros com erro
- 📍 Endereços geocodificados
- 📊 Percentual de sucesso

## 🔧 DICAS E MELHORES

### Para Melhor Precisão:
1. **Padronize endereços** antes de importar
2. **Remova acentos** especiais
3. **Use UF em maiúsculo** (SP, RJ, DF)
4. **CEP completo** com hífen

### Para Performance:
1. **Divida em lotes** de 1000 em 1000
2. **Importe durante horário** de menos movimento
3. **Feche outras abas** do navegador
4. **Use internet estável** e rápida

### Exemplo de Planilha:
| nome | cnpj | telefone | email | whatsapp | rua | numero | bairro | cidade | estado | cep | segmento | potencial | observacoes |
|------|-------|----------|--------|-----------|------|--------|--------|--------|-------|-----|-----------|-----------|------------|
| Wine House Brasília Ltda | 12.345.678/0001-90 | (61) 3234-5678 | contato@winehouse.com.br | (61) 98765-4321 | SGAS 915 | Loja 123 | Asa Sul | Brasília | DF | 70390-150 | Varejo | A | Cliente premium, focado em vinhos importados |
| Empório do Vinho | 98.765.432/0001-10 | (61) 3456-7890 | vendas@emporiodovinho.com.br | (61) 91234-5678 | CLS 104 | Bloco A | Asa Norte | Brasília | DF | 70720-150 | Varejo | B | Interessado em vinhos italianos |

## 📞 SUPORTE

### Problemas Comuns:
1. **Arquivo não lido**: Verifique formato e codificação
2. **Geocodificação falhando**: Verifique conexão com internet
3. **Importação lenta**: Reduza quantidade de registros
4. **Dados cortados**: Verifique delimitador (vírgula vs ponto e vírgula)

### Contato:
- **Log detalhado**: Disponível durante importação
- **Preview**: Verifique antes de confirmar
- **Rollback**: Dados antigos mantidos até sucesso total

---

## 🎉 BENEFÍCIOS ALCANÇADOS

✅ **Importação em massa**: Até 4000 clientes de uma vez  
✅ **Geocodificação automática**: Pins no mapa sem trabalho manual  
✅ **Validação inteligente**: Mapeamento automático de colunas  
✅ **Interface intuitiva**: Drag & drop e progresso real  
✅ **Log completo**: Acompanhamento detalhado do processo  
✅ **Integração total**: Dados disponíveis imediatamente no CRM  

Seu cadastro de 4000 clientes que levaria semanas agora é feito em minutos!
