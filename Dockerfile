# Stage 1: Build the frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Build the backend and serve
FROM node:20-alpine
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY server/ ./server/
COPY tsconfig*.json ./

# Copy built frontend
COPY --from=frontend-builder /app/dist ./dist

# Generate tsx (if not installed globally, we can use npx or install locally)
RUN npm install -g tsx

# Expose the API and static server port
EXPOSE 3001

# Run the server
CMD ["tsx", "server/index.ts"]
