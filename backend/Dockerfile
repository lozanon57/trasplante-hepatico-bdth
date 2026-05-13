FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
CMD ["sh", "-c", "npx prisma db push && node src/seed.js; node src/index.js"]
