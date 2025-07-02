FROM node:18-bullseye

# Define variáveis para o Puppeteer
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV NODE_ENV=production

# Instala o Chromium e dependências necessárias
RUN apt-get update && apt-get install -y \
  chromium \
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
  libdrm2 \
  libgbm1 \
  libxshmfence1 \
  libglu1-mesa \
  libpangocairo-1.0-0 \
  libgtk-3-0 \
  chromium-driver \
  --no-install-recommends && \
  apt-get clean && rm -rf /var/lib/apt/lists/*

# Define caminho do navegador para o Puppeteer
ENV CHROME_PATH=/usr/bin/chromium

# Define diretório de trabalho
WORKDIR /app

# Copia os arquivos do projeto
COPY . .

# Instala as dependências Node.js
RUN npm install

# Expor a porta do app
EXPOSE 3000

# Inicializa a aplicação
CMD ["npm", "start"]
