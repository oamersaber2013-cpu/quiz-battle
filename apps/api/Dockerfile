FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY turbo.json ./

# Copy workspace packages
COPY packages ./packages

# Copy API app
COPY apps/api ./apps/api

# Install dependencies
RUN npm install

# Build shared packages
RUN cd packages/shared && npm run build || true
RUN cd packages/db && npm run build || true

# Build API
WORKDIR /app/apps/api
RUN npm run build

# Expose port
EXPOSE 4000

# Start command
CMD ["npm", "start"]
