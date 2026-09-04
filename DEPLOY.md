# Night Slides — Guia de Deploy no Render (Monolito Docker)

Este documento instrui como publicar o **Night Slides** no Render gratuitamente como um serviço web Docker contendo frontend e backend integrados.

---

## 🚀 Passo a Passo no Render

### 1. Conectar Repositório GitHub
1. Acesse o painel do [Render](https://dashboard.render.com/).
2. Clique em **New +** -> **Web Service**.
3. Conecte sua conta do GitHub e selecione o repositório `night-slides`.

### 2. Configurações do Serviço Web
- **Name**: `night-slides`
- **Region**: Oregon (US West) ou a mais próxima.
- **Environment**: `Docker`
- **Dockerfile Path**: `./Dockerfile`
- **Instance Type**: `Free`

### 3. Variáveis de Ambiente
No painel de variáveis de ambiente do Render:
- `NODE_ENV`: `production`
- `PORT`: `10000`

### 4. Health Check Path
- **Health Check Path**: `/api/health`

---

## 📱 Acesso via QR Code e Celular

Quando o serviço estiver rodando no Render:
- A URL principal (ex: `https://night-slides.onrender.com`) carrega a aplicação.
- Abrir a URL com `#/host` ou clicar em "Criar Sala" gera o QR Code apontando diretamente para `https://night-slides.onrender.com/#/join?room=CÓDIGO`.
- Qualquer jogador na mesma sala ou conectado via 4G/Wi-Fi pode escanear o QR Code no celular e entrar no jogo imediatamente.

---

## 🔄 Reconexão Automática
- Se o celular do jogador bloquear a tela ou perder conexão momentaneamente, ao reabrir a página o jogo restaura automaticamente o jogador sem perder a pontuação!
