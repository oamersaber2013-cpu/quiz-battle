FROM node:20-alpine

WORKDIR /app

# Copy everything
COPY . .

# Install all dependencies from root
RUN npm install

# Expose port
EXPOSE 3000

WORKDIR /app/apps/web

# Start in dev mode
CMD ["npm", "run", "dev"]
