FROM node:18-alpine

# Install build dependencies
RUN apk add --no-cache python3 make g++ gcc

# Set working directory
WORKDIR /app

# Copy package.json files
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN cd server && npm install --build-from-source
RUN cd client && npm install --legacy-peer-deps

# Add a timestamp to force rebuild
RUN echo "Build timestamp: $(date)" > /app/build_timestamp.txt

# Copy project files
COPY . .

# Create uploads directory and set permissions
RUN mkdir -p /app/server/uploads/images /app/server/uploads/audio /app/server/uploads/pdfs
RUN chmod -R 777 /app/server/uploads

# Expose ports
EXPOSE 3000 5000

# Start services
CMD ["sh", "-c", "cd /app && ./start-services.sh"]
