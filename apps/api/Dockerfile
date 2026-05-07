FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./

# Copy all workspace packages
COPY packages ./packages
COPY apps ./apps

# Install dependencies from root
RUN npm install

# Build shared packages first
RUN cd packages/shared && npm run build || echo "Shared build skipped"
RUN cd packages/db && npm run build || echo "DB build skipped"

# Build API
RUN cd apps/api && npm run build

# Set working directory to API
WORKDIR /app/apps/api

# Expose port
EXPOSE 4000

# Start command
CMD ["node", "dist/index.js"]
