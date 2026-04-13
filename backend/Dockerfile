FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies inside the container
COPY package.json .
RUN npm install --production

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p /app/logs

EXPOSE 3000

CMD ["node", "server.js"]
