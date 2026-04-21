# Stage 1: Build the frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY server/ ./server/
COPY tsconfig*.json ./

# Copy built frontend from stage 1
COPY --from=builder /app/dist ./dist

# We will use tsx to run the server in the container 
# (it's lightweight enough for these standard Node 20 environments)
RUN npm install -g tsx

# Expose the API port
EXPOSE 3001

# Environment variables defaults
ENV NODE_ENV=production
ENV PORT=3001

# Run the server
CMD ["tsx", "server/index.ts"]

