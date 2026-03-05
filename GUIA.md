# 🚀 GUIA COMPLETO – PUBLICAR O VIDA CONTROL COMO APP

---

## 📦 ESTRUTURA DOS ARQUIVOS

Você vai ter esta pasta para subir no GitHub:

```
vidacontrol/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── App.jsx        ← código principal do app
│   ├── firebase.js    ← ⚠️ você vai preencher as credenciais aqui
│   └── index.js
└── package.json
```

---

## PARTE 1 – GITHUB (guardar o código)

### 1. Crie uma conta em github.com (se não tiver)
### 2. Crie um repositório novo
- Clique em **"New"** (botão verde)
- Nome: `vidacontrol`
- Deixe como **Public**
- Clique em **"Create repository"**

### 3. Faça upload dos arquivos
- Na página do repositório clique em **"uploading an existing file"**
- Arraste TODA a pasta `vidacontrol` para lá
- Clique em **"Commit changes"**

---

## PARTE 2 – FIREBASE (banco de dados na nuvem)

### 1. Acesse firebase.google.com
- Clique em **"Começar"**
- Faça login com sua conta Google

### 2. Crie um projeto
- Clique em **"Adicionar projeto"**
- Nome: `vidacontrol`
- Desative o Google Analytics (não precisa)
- Clique em **"Criar projeto"**

### 3. Adicione um Web App
- Na tela do projeto, clique no ícone **"</>"** (Web)
- Apelido: `vidacontrol-web`
- Clique em **"Registrar app"**
- Uma caixa vai aparecer com suas credenciais. Copie e guarde esses valores:

```
apiKey: "..."
authDomain: "..."
projectId: "..."
storageBucket: "..."
messagingSenderId: "..."
appId: "..."
```

### 4. Cole as credenciais no arquivo firebase.js
Abra o arquivo `src/firebase.js` e substitua cada campo:

```js
const firebaseConfig = {
  apiKey:            "COLE AQUI",
  authDomain:        "COLE AQUI",
  projectId:         "COLE AQUI",
  storageBucket:     "COLE AQUI",
  messagingSenderId: "COLE AQUI",
  appId:             "COLE AQUI"
};
```

### 5. Ative o Firestore (banco de dados)
- No menu lateral do Firebase, clique em **"Firestore Database"**
- Clique em **"Criar banco de dados"**
- Selecione **"Iniciar no modo de teste"**
- Escolha a região **us-east1** (ou qualquer uma)
- Clique em **"Ativar"**

### 6. Ative o Login com Google
- No menu lateral, clique em **"Authentication"**
- Clique em **"Primeiros passos"**
- Clique em **"Google"**
- Ative o toggle
- Coloque seu e-mail como e-mail de suporte
- Clique em **"Salvar"**

---

## PARTE 3 – VERCEL (publicar o app na internet)

### 1. Acesse vercel.com
- Clique em **"Sign Up"**
- Escolha **"Continue with GitHub"**
- Autorize o Vercel a acessar seus repositórios

### 2. Importe o projeto
- Clique em **"Add New → Project"**
- Você vai ver o repositório `vidacontrol` na lista
- Clique em **"Import"**

### 3. Configure o projeto
- Framework Preset: **Create React App** (detectado automático)
- Clique em **"Deploy"**
- Aguarde 2-3 minutos ☕

### 4. Pegue seu link
Depois do deploy você vai receber um link como:
`https://vidacontrol.vercel.app`

Esse é o link do seu app — funciona em qualquer dispositivo!

---

## PARTE 4 – INSTALAR COMO APP NO CELULAR E PC

### 📱 Android (Chrome)
1. Abra o link do app no Chrome
2. Toque nos **3 pontinhos** no canto superior direito
3. Toque em **"Adicionar à tela inicial"**
4. Confirme — o app vai aparecer na sua home como qualquer app

### 🍎 iPhone (Safari)
1. Abra o link no **Safari** (obrigatório, não Chrome)
2. Toque no botão de **compartilhar** (quadrado com seta pra cima)
3. Role e toque em **"Adicionar à tela de início"**
4. Confirme

### 💻 PC (Chrome ou Edge)
1. Abra o link no Chrome ou Edge
2. Olhe na barra de endereço — vai aparecer um ícone de **instalar** (computador com seta)
3. Clique e depois **"Instalar"**
4. O app abre como janela própria, sem barra do navegador

---

## PARTE 5 – ADICIONAR DOMÍNIO AUTORIZADO NO FIREBASE
*(importante para o login funcionar no seu link do Vercel)*

1. No Firebase, vá em **Authentication → Settings → Domínios autorizados**
2. Clique em **"Adicionar domínio"**
3. Cole seu domínio do Vercel (ex: `vidacontrol.vercel.app`)
4. Clique em **"Adicionar"**

---

## ✅ RESUMO DO FLUXO

```
Você edita o código
      ↓
GitHub (armazena o código)
      ↓
Vercel (publica automaticamente)
      ↓
Firebase (salva seus dados na nuvem)
      ↓
Acessa de qualquer dispositivo 📱💻
      ↓
Tudo sincronizado em tempo real ☁️
```

---

## 🆘 PROBLEMAS COMUNS

**"Login não funciona"**
→ Verifique se adicionou o domínio do Vercel no Firebase (Parte 5)

**"Erro de CORS ou permissão"**
→ Verifique se o Firestore está no modo de teste (Parte 2, passo 5)

**"App não atualiza depois que mudei o código"**
→ O Vercel faz deploy automático sempre que você salva no GitHub

---

## 💰 CUSTO

Tudo **100% gratuito** para uso pessoal:
- GitHub: gratuito
- Vercel: gratuito (até 100GB de banda/mês)
- Firebase: gratuito (até 1GB de dados e 50k leituras/dia — muito mais do que você vai precisar)
