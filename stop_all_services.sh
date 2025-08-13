#!/bin/bash

echo "🛑 Stopping All Ride-Sharing Platform Services..."

# Kill processes by PID if files exist
if [ -f .ganache_pid ]; then
    GANACHE_PID=$(cat .ganache_pid)
    kill $GANACHE_PID 2>/dev/null || true
    rm .ganache_pid
    echo "✅ Stopped Ganache"
fi

if [ -f .dapp_backend_pid ]; then
    DAPP_BACKEND_PID=$(cat .dapp_backend_pid)
    kill $DAPP_BACKEND_PID 2>/dev/null || true
    rm .dapp_backend_pid
    echo "✅ Stopped Dapp Backend"
fi

if [ -f .dapp_frontend_pid ]; then
    DAPP_FRONTEND_PID=$(cat .dapp_frontend_pid)
    kill $DAPP_FRONTEND_PID 2>/dev/null || true
    rm .dapp_frontend_pid
    echo "✅ Stopped Dapp Frontend"
fi

if [ -f .sp1_pid ]; then
    SP1_PID=$(cat .sp1_pid)
    kill $SP1_PID 2>/dev/null || true
    rm .sp1_pid
    echo "✅ Stopped SP1"
fi

if [ -f .sp2_pid ]; then
    SP2_PID=$(cat .sp2_pid)
    kill $SP2_PID 2>/dev/null || true
    rm .sp2_pid
    echo "✅ Stopped SP2"
fi

if [ -f .sp3_pid ]; then
    SP3_PID=$(cat .sp3_pid)
    kill $SP3_PID 2>/dev/null || true
    rm .sp3_pid
    echo "✅ Stopped SP3"
fi

if [ -f .oauth_pid ]; then
    OAUTH_PID=$(cat .oauth_pid)
    kill $OAUTH_PID 2>/dev/null || true
    rm .oauth_pid
    echo "✅ Stopped OAuth Server"
fi

# Also kill any processes on the ports we used
echo "🔄 Cleaning up any remaining processes on used ports..."
sudo fuser -k 8545/tcp 2>/dev/null || true
sudo fuser -k 3002/tcp 2>/dev/null || true
sudo fuser -k 8080/tcp 2>/dev/null || true
sudo fuser -k 5001/tcp 2>/dev/null || true
sudo fuser -k 5002/tcp 2>/dev/null || true
sudo fuser -k 5003/tcp 2>/dev/null || true
sudo fuser -k 4000/tcp 2>/dev/null || true

echo ""
echo "🎉 All services stopped successfully!"
echo "" 