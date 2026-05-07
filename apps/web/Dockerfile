FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY turbo.json ./

# Copy workspace packages
COPY packages ./packages

# Copy Web app
COPY apps/web ./apps/web

# Install dependencies
RUN npm install

# Build shared packages
RUN cd packages/shared && npm run build || true

# Expose port
EXPOSE 3000

WORKDIR /app/apps/web

# Start in dev mode (since build fails)
CMD ["npm", "run", "dev"]
