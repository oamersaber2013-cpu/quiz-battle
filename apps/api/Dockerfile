FROM node:20-alpine

WORKDIR /app

# Copy everything
COPY . .

# Install all dependencies from root
RUN npm install

# Build API
WORKDIR /app/apps/api
RUN npm run build

# Expose port
EXPOSE 4000

# Start command
CMD ["node", "dist/index.js"]
