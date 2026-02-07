FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
# Use npm ci when a lockfile exists, otherwise fall back to npm install
RUN sh -c "if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi"

# Copy source
COPY . .

ENV NODE_ENV=production
EXPOSE 5000

CMD ["npm", "start"]
