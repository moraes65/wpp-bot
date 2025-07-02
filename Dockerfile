# Etapa 1: Imagem base
FROM node:18-slim

# Etapa 2: Instalar dependências do sistema necessárias para Chromium
RUN apt-get update && apt-get install -y \
  wget \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgdk-pixbuf2.0-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils \
  --no-install-recommends && \
  apt-get clean && rm -rf /var/lib/apt/lists/*

# Etapa 3: Criar diretório de trabalho
WORKDIR /app

# Etapa 4: Copiar arquivos do projeto
COPY . .

# Etapa 5: Instalar dependências do Node.js
RUN npm install

# Etapa 6: Definir ambiente
ENV NODE_ENV=production

# Etapa 7: Expor a porta da aplicação
EXPOSE 3000

# Etapa 8: Iniciar a aplicação
CMD ["npm", "start"]
