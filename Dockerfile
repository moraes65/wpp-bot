# Etapa 1: Imagem base com Node.js 18
FROM node:18

# Etapa 2: Criar diretório de trabalho dentro do container
WORKDIR /app

# Etapa 3: Copiar todos os arquivos do projeto para o container
COPY . .

# Etapa 4: Instalar dependências
RUN npm install

# Etapa 5: Variáveis de ambiente (melhor definir via painel Coolify)
ENV NODE_ENV=production

# Etapa 6: Expor a porta usada pelo Express
EXPOSE 3000

# Etapa 7: Iniciar a aplicação
CMD ["npm", "start"]
