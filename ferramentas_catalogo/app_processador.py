import gradio as gr
import os
import rembg
from PIL import Image

def processar_lote(dir_entrada, dir_saida, largura, altura, progress=gr.Progress()):
    try:
        # Verifica se a pasta de entrada existe
        if not os.path.exists(dir_entrada):
            return "❌ Erro: A pasta de entrada não existe. Verifique o caminho."
            
        os.makedirs(dir_saida, exist_ok=True)
        
        # Pega as imagens (ignorando arquivos que não são fotos)
        arquivos = [f for f in os.listdir(dir_entrada) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))]
        
        if not arquivos:
            return "⚠️ Nenhuma imagem encontrada na pasta de entrada."

        tamanho_final = (int(largura), int(altura))

        # Barra de progresso visual
        for arquivo in progress.tqdm(arquivos, desc="Processando garrafas..."):
            caminho_entrada = os.path.join(dir_entrada, arquivo)
            # Força a saída para .png para manter o fundo transparente
            nome_arquivo_saida = os.path.splitext(arquivo)[0] + ".png"
            caminho_saida = os.path.join(dir_saida, nome_arquivo_saida)

            imagem_entrada = Image.open(caminho_entrada).convert("RGB")
            
            # 1. Remove o fundo localmente (100% gratuito) com modelo especializado
            from rembg import new_session
            session = new_session(model_name="isnet-general-use")
            imagem_sem_fundo = rembg.remove(imagem_entrada, 
                                            session=session,
                                            alpha_matting=True, 
                                            alpha_matting_foreground_threshold=240, 
                                            alpha_matting_background_threshold=10, 
                                            alpha_matting_erode_size=10)

            # 2. Redimensiona preservando a proporção exata da garrafa
            w, h = imagem_sem_fundo.size
            proporcao = min(tamanho_final[0] / w, tamanho_final[1] / h)
            nova_largura, nova_altura = int(w * proporcao), int(h * proporcao)
            imagem_redimensionada = imagem_sem_fundo.resize((nova_largura, nova_altura), Image.Resampling.LANCZOS)

            # 3. Centraliza na tela transparente com o tamanho final desejado
            imagem_saida = Image.new("RGBA", tamanho_final, (0, 0, 0, 0))
            pos_x = (tamanho_final[0] - nova_largura) // 2
            pos_y = (tamanho_final[1] - nova_altura) // 2
            imagem_saida.paste(imagem_redimensionada, (pos_x, pos_y), imagem_redimensionada)

            # Salva a imagem processada
            imagem_saida.save(caminho_saida)

        return f"✅ Sucesso! {len(arquivos)} imagens processadas e salvas em:\n{dir_saida}"
        
    except Exception as e:
        return f"❌ Ocorreu um erro: {str(e)}"

# --- INTERFACE VISUAL (FRONT-END DO PAINEL) ---
tema = gr.themes.Soft(primary_hue="indigo", secondary_hue="blue")

with gr.Blocks(theme=tema, title="Preparador de Catálogo") as interface:
    gr.Markdown("# 🍾 Preparador de Catálogo (Local & Gratuito)")
    gr.Markdown("Remove o fundo e padroniza o tamanho de centenas de imagens sem gastar créditos.")
    
    with gr.Row():
        with gr.Column():
            dir_entrada = gr.Textbox(
                label="📁 Pasta de Origem (Onde estão as fotos originais)", 
                value=r"C:\app precificador\precificador-sfimports\imagens_produtos" 
            )
            dir_saida = gr.Textbox(
                label="📂 Pasta de Destino (Onde serão salvas)", 
                value=r"C:\app precificador\precificador-sfimports\imagens sem fundo"
            )
            
        with gr.Column():
            largura = gr.Number(label="↔️ Largura Final (Pixels)", value=1080, precision=0)
            altura = gr.Number(label="↕️ Altura Final (Pixels)", value=1920, precision=0)
            
    botao_processar = gr.Button("🚀 Iniciar Processamento em Lote", variant="primary")
    resultado = gr.Textbox(label="Status do Processamento", interactive=False)

    botao_processar.click(
        fn=processar_lote,
        inputs=[dir_entrada, dir_saida, largura, altura],
        outputs=resultado
    )

import threading
from flask import Flask, request, jsonify
import requests as req_http
import base64
from io import BytesIO

api_app = Flask('processador_api')

@api_app.route('/processar-imagem', methods=['POST'])
def processar_imagem_endpoint():
    try:
        dados = request.json
        url = dados.get('url', '')
        if not url:
            return jsonify({ 'success': False, 'erro': 'Sem URL' }), 400
            
        # Baixa a imagem da URL
        r = req_http.get(url, timeout=15, headers={'User-Agent': 'Mozilla/5.0'})
        img_bytes = BytesIO(r.content)
        from PIL import Image
        img = Image.open(img_bytes)
        
        # Salva temporariamente e processa com processar_lote
        import tempfile, os
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
            img.save(tmp.name)
            tmp_path = tmp.name
            
        # Simula o processamento em lote para 1 único arquivo
        # Nota: processar_lote espera diretórios, então criamos um temporário
        temp_in = tempfile.mkdtemp()
        temp_out = tempfile.mkdtemp()
        
        # Move arquivo para a pasta de entrada temporária
        basename = os.path.basename(tmp_path)
        os.rename(tmp_path, os.path.join(temp_in, basename))
        
        # Chama a função principal de processamento (1080x1920)
        processar_lote(temp_in, temp_out, 1080, 1920)
        
        # Pega o resultado
        out_file = os.path.join(temp_out, os.path.splitext(basename)[0] + ".png")
        if os.path.exists(out_file):
            with open(out_file, 'rb') as f:
                b64 = base64.b64encode(f.read()).decode()
            success = True
            result_b64 = f'data:image/png;base64,{b64}'
        else:
            success = False
            result_b64 = None
            
        # Cleanup
        import shutil
        shutil.rmtree(temp_in, ignore_errors=True)
        shutil.rmtree(temp_out, ignore_errors=True)
        
        if success:
            return jsonify({ 'success': True, 'base64': result_b64 })
        return jsonify({ 'success': False, 'erro': 'Falha no processamento' }), 500
        
    except Exception as e:
        return jsonify({ 'success': False, 'erro': str(e) }), 500

def iniciar_api():
    print("🛰️  API do Processador subindo na porta 7861...")
    try:
        api_app.run(host='0.0.0.0', port=7861, debug=False, use_reloader=False)
    except Exception as e:
        print(f"❌ Erro ao subir API: {e}")

if __name__ == "__main__":
    t = threading.Thread(target=iniciar_api, daemon=True)
    t.start()
    print("🔥 Lançando Interface Gradio...")
    interface.launch(inbrowser=True)
