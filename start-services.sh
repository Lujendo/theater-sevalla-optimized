#!/bin/sh

# Start backend server
cd /app/server && npm start &

# Start frontend server with clean build
cd /app/client && rm -rf node_modules/.vite && npm run dev &

# Keep container running
tail -f /dev/null
