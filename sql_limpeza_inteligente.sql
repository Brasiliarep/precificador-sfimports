-- SQL PARA LIMPEZA INTELIGENTE DE DUPLICATAS
-- PRESERVA PRODUTOS COMPLETOS, APAGA CÓPIAS VAZIAS

-- PASSO 1: IDENTIFICAR PRODUTOS DUPLICADOS POR NOME
WITH duplicatas AS (
    SELECT 
        p1.ID,
        p1.post_title as nome_produto,
        COUNT(*) as total_duplicatas,
        GROUP_CONCAT(p2.ID ORDER BY p2.ID) as ids_duplicados
    FROM wp_posts p1
    INNER JOIN wp_posts p2 ON 
        LOWER(TRIM(p1.post_title)) = LOWER(TRIM(p2.post_title)) 
        AND p1.ID != p2.ID
        AND p1.post_type = 'product' 
        AND p2.post_type = 'product'
        AND p1.post_status = 'publish'
        AND p2.post_status = 'publish'
    GROUP BY p1.ID, p1.post_title
    HAVING COUNT(*) > 1
),

-- PASSO 2: AVALIAR QUAL PRODUTO MANTER (O MAIS COMPLETO)
produtos_avaliados AS (
    SELECT 
        d.ID,
        d.nome_produto,
        d.total_duplicatas,
        d.ids_duplicados,
        
        -- CONTAR DESCRIÇÃO COMPLETA
        (SELECT COUNT(*) FROM wp_postmeta pm 
         WHERE pm.post_id = d.ID AND pm.meta_key = '_description' 
         AND LENGTH(pm.meta_value) > 100) as tem_descricao_completa,
        
        -- VERIFICAR SE TEM IMAGEM DESTAQUE
        (SELECT COUNT(*) FROM wp_postmeta pm 
         WHERE pm.post_id = d.ID AND pm.meta_key = '_thumbnail_id' 
         AND pm.meta_value != '0') as tem_imagem,
        
        -- VERIFICAR SE TEM CATEGORIAS
        (SELECT COUNT(*) FROM wp_term_relationships tr 
         INNER JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
         WHERE tr.object_id = d.ID AND tt.taxonomy = 'product_cat') as tem_categorias,
        
        -- VERIFICAR SE TEM ATRIBUTOS
        (SELECT COUNT(*) FROM wp_postmeta pm 
         WHERE pm.post_id = d.ID AND pm.meta_key LIKE 'attribute_%') as tem_atributos,
        
        -- PONTUAÇÃO DO PRODUTO (MAIS COMPLETO = MAIS PONTOS)
        (SELECT 
            (CASE WHEN LENGTH(pm.meta_value) > 100 THEN 3 ELSE 0 END) +
            (CASE WHEN pm2.meta_value != '0' THEN 2 ELSE 0 END) +
            (SELECT CASE WHEN COUNT(*) > 0 THEN 2 ELSE 0 END FROM wp_term_relationships tr 
             INNER JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
             WHERE tr.object_id = d.ID AND tt.taxonomy = 'product_cat') +
            (SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END FROM wp_postmeta pm 
             WHERE pm.post_id = d.ID AND pm.meta_key LIKE 'attribute_%')
        as pontuacao
        FROM wp_postmeta pm
        LEFT JOIN wp_postmeta pm2 ON pm.post_id = pm2.post_id AND pm2.meta_key = '_thumbnail_id'
        WHERE pm.post_id = d.ID AND pm.meta_key = '_description'
    ) as pontuacao
)

-- PASSO 3: IDENTIFICAR QUAL ID MANTER E QUAIS APAGAR
SELECT 
    nome_produto,
    total_duplicatas,
    ids_duplicados,
    (SELECT ID FROM produtos_avaliados pa2 
     WHERE pa2.nome_produto = pa1.nome_produto 
     ORDER BY pontuacao DESC LIMIT 1) as id_manter,
    
    (SELECT GROUP_CONCAT(ID) FROM produtos_avaliados pa2 
     WHERE pa2.nome_produto = pa1.nome_produto 
     AND pa2.ID != (SELECT ID FROM produtos_avaliados pa3 
                    WHERE pa3.nome_produto = pa1.nome_produto 
                    ORDER BY pontuacao DESC LIMIT 1)) as ids_apagar
FROM produtos_avaliados pa1
GROUP BY nome_produto, total_duplicatas, ids_duplicados;

-- PASSO 4: APENAS PARA VERIFICAÇÃO - NÃO EXECUTAR AINDA
-- DEPOIS DE ANALISAR O RESULTADO ACIMA, USE:

/*
-- APAGAR APENAS OS PRODUTOS MENOS COMPLETOS
-- ATENÇÃO: FAÇA BACKUP ANTES!

DELETE FROM wp_postmeta 
WHERE post_id IN (
    SELECT id_apagar FROM (
        -- AQUI COLOQUE OS IDs PARA APAGAR DO RESULTADO ACIMA
        SELECT id_apagar FROM produtos_para_apagar
    ) AS ids_para_apagar
);

DELETE FROM wp_posts 
WHERE ID IN (
    SELECT id_apagar FROM (
        -- AQUI COLOQUE OS IDS PARA APAGAR DO RESULTADO ACIMA
        SELECT id_apagar FROM produtos_para_apagar
    ) AS ids_para_apagar
    AND post_type = 'product'
);
*/
