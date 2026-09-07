#!/bin/bash

# Start the secure API server
echo "🚀 Starting Dusan Djukaric Secure API Server..."

# Check if server directory exists
if [ ! -d "server" ]; then
    echo "❌ Server directory not found!"
    exit 1
fi

# Navigate to server directory
cd server

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing server dependencies..."
    npm install
fi

# Start the server
echo "🔒 Starting secure API server on port 3001..."
node server.js
