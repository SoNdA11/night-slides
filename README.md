# 🌍 Night Slides — GeoGuessr Multiplayer Game

Um mini game interativo inspirado no GeoGuessr para apresentações e noites de slides com amigos. A TV exibe a imagem do local, e os participantes adivinham pelo celular em tempo real.

## 🎯 Experiência

```
1. Apresentador abre o jogo na TV
2. TV mostra QR Code
3. Amigos escaneiam o QR Code
4. Cada pessoa coloca nome e escolhe avatar
5. Todos aparecem na sala de espera
6. Apresentador inicia o jogo
7. TV mostra a imagem da rodada
8. Celulares mostram as 4 opções
9. Cada jogador escolhe uma opção
10. O tempo termina
11. TV revela a resposta
12. Sistema calcula os pontos
13. Ranking é atualizado com animação
14. Próxima rodada começa
15. Ao final, aparece o campeão
```

## 🛠️ Tecnologias

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Framer Motion (animações)
- qrcode.react (QR Code)

### Backend
- Node.js + Express
- Socket.io (comunicação em tempo real)
- TypeScript

### Deploy
- **Frontend**: GitHub Pages
- **Backend**: Render (free tier)

## 📁 Estrutura do Projeto

```
night-slides/
├── client/                    # Frontend React
│   ├── src/
│   │   ├── components/        # Componentes reutilizáveis
│   │   ├── pages/             # Páginas principais
│   │   │   ├── LandingPage.tsx
│   │   │   ├── JoinPage.tsx
│   │   │   ├── PlayerPage.tsx
│   │   │   ├── HostPage.tsx
│   │   │   └── TVPage.tsx
│   │   ├── game/              # Lógica do jogo
│   │   ├── scoring/           # Sistema de pontuação
│   │   ├── state/             # Estado global
│   │   ├── services/          # Serviços (socket)
│   │   ├── types/             # Tipos TypeScript
│   │   ├── assets/            # Assets estáticos
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
├── server/                    # Backend Node.js
│   ├── src/
│   │   ├── index.ts           # Servidor principal
│   │   ├── rooms.ts           # Gerenciamento de salas
│   │   ├── rounds.ts          # Rodadas de exemplo
│   │   ├── scoring.ts         # Sistema de pontuação
│   │   └── types.ts           # Tipos TypeScript
│   ├── tsconfig.json
│   └── package.json
├── Dockerfile                 # Docker para Render
└── README.md
```

## 🚀 Executar Localmente

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### 1. Instalar dependências

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 2. Iniciar o servidor

```bash
cd server
npm run dev
# Servidor roda em http://localhost:3001
```

### 3. Iniciar o cliente

```bash
cd client
npm run dev
# Cliente roda em http://localhost:5173
```

### 4. Abrir

- **Host/TV**: Acesse `http://localhost:5173` e clique em "Modo TV" ou "Criar Sala"
- **Celular**: Acesse `http://localhost:5173` e clique em "Entrar na Sala"

## 🎮 Como Usar

### Criar uma Sala (Host)
1. Acesse o site na TV/computador
2. Clique em **Criar Sala**
3. Um código de 6 dígitos será gerado
4. O QR Code é exibido automaticamente
5. Compartilhe o QR Code ou código com os participantes

### Entrar na Sala (Participante)
1. Escaneie o QR Code na TV **OU** acesse o site e clique em "Entrar na Sala"
2. Digite o código da sala
3. Escolha um avatar e digite seu nome
4. Aguarde o host iniciar o jogo

### Controlar o Jogo (Host)
- **Iniciar Jogo**: Começa a contagem regressiva e a primeira rodada
- **Revelar Resposta**: Encerra a rodada e mostra a resposta correta
- **Ver Ranking**: Mostra o ranking atualizado
- **Próxima Rodada**: Avança para a próxima rodada
- **Reiniciar**: Reinicia o jogo do zero

## 🏗️ Deploy

### Frontend (GitHub Pages)

1. No `client/vite.config.ts`, configure `base`:
   ```ts
   base: '/night-slides/',  // nome do repositório
   ```

2. Build:
   ```bash
   cd client
   npm run build
   ```

3. Deploy automático via GitHub Actions (criar `.github/workflows/deploy.yml`):
   ```yaml
   name: Deploy to GitHub Pages
   on:
     push:
       branches: [main]
   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 20
         - run: cd client && npm ci && npm run build
         - uses: peaceiris/actions-gh-pages@v4
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./client/dist
   ```

### Backend (Render)

1. Crie uma conta no [Render](https://render.com)
2. Clique em **New Web Service**
3. Conecte seu repositório GitHub
4. Configure:
   - **Runtime**: Docker
   - **Dockerfile**: `./Dockerfile`
   - **Port**: 3001
   - **Environment Variables**:
     - `CLIENT_URL`: URL do frontend (ex: `https://seu-usuario.github.io`)
     - `NODE_ENV`: `production`

5. Clique em **Create Web Service**

### Variáveis de Ambiente

#### Frontend (client/.env)
```
VITE_SERVER_URL=https://seu-backend.onrender.com
```

#### Backend (Render Dashboard)
```
CLIENT_URL=https://seu-usuario.github.io
PORT=3001
NODE_ENV=production
```

## 🎨 Tipos de Rodada

### Normal
- Resposta correta: +100 pontos
- Resposta errada: 0 pontos

### Risco
- Resposta correta: +200 pontos
- Resposta errada: -100 pontos

### Relâmpago
- Pontuação baseada na velocidade:
  - < 3s → +300
  - < 6s → +200
  - < 10s → +100

### Dobro ou Nada
- Resposta correta: +200 pontos
- Resposta errada: -200 pontos

## 🔒 Segurança

- Respostas validadas no servidor
- Pontuação calculada server-side
- O cliente não pode definir sua própria pontuação
- Resposta correta não exposta antes da revelação
- Controle de permissões (host vs jogador)

## 📝 Customizar Rodadas

Edite `server/src/rounds.ts` para adicionar ou modificar rodadas:

```typescript
{
  id: 7,
  type: 'city',
  title: 'Que cidade é esta?',
  image: 'https://URL_DA_IMAGEM',
  correctAnswer: 'Tokyo',
  correctFlag: '🇯🇵',
  options: [
    { label: 'Tokyo', flag: '🇯🇵' },
    { label: 'Seoul', flag: '🇰🇷' },
    { label: 'Beijing', flag: '🇨🇳' },
    { label: 'Bangkok', flag: '🇹🇭' },
  ],
  timeLimit: 15,
  scoringRule: SCORING_PRESETS.normal,
}
```

## 📄 Licença

MIT
