# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Install http-server as a more reliable static file server
RUN npm install -g http-server

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create a simple startup script that handles PORT properly
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'PORT=${PORT:-3000}' >> /start.sh && \
    echo 'echo "Starting http-server on port $PORT"' >> /start.sh && \
    echo 'http-server dist -p $PORT -a 0.0.0.0 --cors' >> /start.sh && \
    chmod +x /start.sh

# Expose port (Railway will override)
EXPOSE 3000

# Start the server
CMD ["/start.sh"]
