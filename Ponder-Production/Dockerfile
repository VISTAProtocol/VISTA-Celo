FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 42069

CMD ["sh", "-c", "npm run start -- --port ${PORT:-42069}"]
