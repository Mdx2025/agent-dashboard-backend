FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

# Copy package.json and install production dependencies only
COPY package*.json ./
RUN npm install --production

# Copy server.js
COPY server.js ./

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port (Railway will assign $PORT)
EXPOSE 3000

# Start server on the PORT assigned by Railway
CMD ["node", "server.js"]
