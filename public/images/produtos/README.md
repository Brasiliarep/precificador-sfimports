# 📁 PASTA DE IMAGENS OFFLINE

## 🎯 OBJETIVO:
Armazenar imagens dos produtos para uso offline no Catálogo Master e Stories.

## 📋 ESTRUTURA:
```
public/images/produtos/
├── 240.jpg ← VODKA LIQUID 950 ML
├── 241.jpg ← PRÓXIMO PRODUTO
└── ...
```

## 🚀 COMO USAR:
1. **Baixe as imagens** das URLs do products-array.json
2. **Salve como:** {id}.jpg
3. **Atualize o JSON** para usar caminhos locais

## 📝 EXEMPLO:
```json
{
  "id": 240,
  "image": "/images/produtos/240.jpg"
}
```

## 🔧 PRÓXIMO PASSO:
Criar script para baixar todas as imagens automaticamente.
