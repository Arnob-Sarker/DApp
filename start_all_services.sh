#!/bin/bash

echo "🚀 Starting All Ride-Sharing Platform Services..."

# Kill any existing processes on the ports we need
echo "🔄 Cleaning up existing processes..."
sudo fuser -k 8545/tcp 2>/dev/null || true  # Ganache
sudo fuser -k 3002/tcp 2>/dev/null || true  # Dapp Backend
sudo fuser -k 8080/tcp 2>/dev/null || true  # Dapp Frontend
sudo fuser -k 5001/tcp 2>/dev/null || true  # SP1
sudo fuser -k 5002/tcp 2>/dev/null || true  # SP2
sudo fuser -k 5003/tcp 2>/dev/null || true  # SP3
sudo fuser -k 4000/tcp 2>/dev/null || true  # OAuth Server

sleep 2

# Start Ganache
echo "🔗 Starting Ganache (Ethereum Local Node)..."
ganache --port 8545 --deterministic &
GANACHE_PID=$!
echo "✅ Ganache started with PID: $GANACHE_PID"

sleep 3

# Start Dapp Backend
echo "🔧 Starting Dapp Backend..."
cd backend
npm install > /dev/null 2>&1
MONGODB_URI=mongodb+srv://arnob28sarker:a123s123@cluster0.6pawhmr.mongodb.net/ node server.js &
DAPP_BACKEND_PID=$!
cd ..
echo "✅ Dapp Backend started with PID: $DAPP_BACKEND_PID"

sleep 3

# Start Dapp Frontend
echo "🌐 Starting Dapp Frontend..."
npx http-server src -p 8080 &
DAPP_FRONTEND_PID=$!
echo "✅ Dapp Frontend started with PID: $DAPP_FRONTEND_PID"

sleep 3

# Start SP1
echo "🚗 Starting SP1 (Standard Ride Sharing)..."
cd sp1
npm install > /dev/null 2>&1
MONGODB_URI=mongodb+srv://arnob28sarker:a123s123@cluster0.6pawhmr.mongodb.net/sp1_ridesharing node server.js &
SP1_PID=$!
cd ..
echo "✅ SP1 started with PID: $SP1_PID"

sleep 3

# Start SP2
echo "👑 Starting SP2 (Premium Ride Sharing)..."
cd sp2
npm install > /dev/null 2>&1
MONGODB_URI=mongodb+srv://arnob28sarker:a123s123@cluster0.6pawhmr.mongodb.net/sp2_fooddelivery node server.js &
SP2_PID=$!
cd ..
echo "✅ SP2 started with PID: $SP2_PID"

sleep 3

# Start SP3
echo "🛵 Starting SP3 (Budget Ride Sharing)..."
cd sp3
npm install > /dev/null 2>&1
MONGODB_URI=mongodb+srv://arnob28sarker:a123s123@cluster0.6pawhmr.mongodb.net/sp3_courierservice node server.js &
SP3_PID=$!
cd ..
echo "✅ SP3 started with PID: $SP3_PID"

sleep 3

# Start OAuth Server
echo "🔐 Starting OAuth Server..."
cd "token generation"
node sp_oauth_server.js &
OAUTH_PID=$!
cd ..
echo "✅ OAuth Server started with PID: $OAUTH_PID"

sleep 3

# Save PIDs to file for later cleanup
echo "$GANACHE_PID" > .ganache_pid
echo "$DAPP_BACKEND_PID" > .dapp_backend_pid
echo "$DAPP_FRONTEND_PID" > .dapp_frontend_pid
echo "$SP1_PID" > .sp1_pid
echo "$SP2_PID" > .sp2_pid
echo "$SP3_PID" > .sp3_pid
echo "$OAUTH_PID" > .oauth_pid

echo ""
echo "🎉 All services started successfully!"
echo ""
echo "📋 Service URLs:"
echo "   🌐 Dapp Frontend: http://localhost:8080"
echo "   🔧 Dapp Backend: http://localhost:3002"
echo "   🚗 SP1 (Standard): http://localhost:5001"
echo "   👑 SP2 (Premium): http://localhost:5002"
echo "   🛵 SP3 (Budget): http://localhost:5003"
echo "   🔐 OAuth Server: http://localhost:4000"
echo "   🔗 Ganache: http://localhost:8545"
echo ""
echo "💡 Instructions:"
echo "   1. Open http://localhost:8080 in your browser"
echo "   2. Connect your MetaMask wallet to Localhost 8545"
echo "   3. Register and verify your email"
echo "   4. Click 'Grant Permission to Service Provider' to see all 3 SPs"
echo "   5. Select any SP to grant permission"
echo "   6. Use 'Query Service Provider' to test data retrieval"
echo ""
echo "🔧 To stop all services, run: ./stop_all_services.sh"
echo "" 