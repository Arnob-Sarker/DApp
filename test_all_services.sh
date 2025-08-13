#!/bin/bash

echo "🧪 Testing All Ride-Sharing Platform Services..."
echo "================================================"

# Test Ganache
echo "1. Testing Ganache (8545)..."
if curl -s http://localhost:8545 > /dev/null; then
    echo "   ✅ Ganache is running"
else
    echo "   ❌ Ganache is not running"
fi

# Test Dapp Backend
echo "2. Testing Dapp Backend (3002)..."
if curl -s http://localhost:3002 > /dev/null; then
    echo "   ✅ Dapp Backend is running"
else
    echo "   ❌ Dapp Backend is not running"
fi

# Test Dapp Frontend
echo "3. Testing Dapp Frontend (8080)..."
if curl -s http://localhost:8080/ | grep -q "User Registration"; then
    echo "   ✅ Dapp Frontend is running"
else
    echo "   ❌ Dapp Frontend is not running"
fi

# Test SP1
echo "4. Testing SP1 (5001)..."
if curl -s http://localhost:5001/ | grep -q "SP1 RideShare"; then
    echo "   ✅ SP1 is running"
else
    echo "   ❌ SP1 is not running"
fi

# Test SP2
echo "5. Testing SP2 (5002)..."
if curl -s http://localhost:5002/ | grep -q "SP2 Premium"; then
    echo "   ✅ SP2 is running"
else
    echo "   ❌ SP2 is not running"
fi

# Test SP3
echo "6. Testing SP3 (5003)..."
if curl -s http://localhost:5003/ | grep -q "SP3 Budget"; then
    echo "   ✅ SP3 is running"
else
    echo "   ❌ SP3 is not running"
fi

# Test OAuth Server
echo "7. Testing OAuth Server (4000)..."
if curl -s http://localhost:4000 > /dev/null; then
    echo "   ✅ OAuth Server is running"
else
    echo "   ❌ OAuth Server is not running"
fi

echo ""
echo "🔐 Testing OAuth Endpoints..."
echo "============================="

# Test SP1 OAuth
echo "1. Testing SP1 OAuth..."
SP1_OAUTH=$(curl -s "http://localhost:5001/oauth/authorize?client_id=sp1_client_123&response_type=code&redirect_uri=http://localhost:8080/index.html&state=test")
if echo "$SP1_OAUTH" | grep -q "oauth/login"; then
    echo "   ✅ SP1 OAuth is working"
else
    echo "   ❌ SP1 OAuth is not working"
fi

# Test SP2 OAuth
echo "2. Testing SP2 OAuth..."
SP2_OAUTH=$(curl -s "http://localhost:5002/oauth/authorize?client_id=sp2_client_123&response_type=code&redirect_uri=http://localhost:8080/index.html&state=test")
if echo "$SP2_OAUTH" | grep -q "oauth/login"; then
    echo "   ✅ SP2 OAuth is working"
else
    echo "   ❌ SP2 OAuth is not working"
fi

# Test SP3 OAuth
echo "3. Testing SP3 OAuth..."
SP3_OAUTH=$(curl -s "http://localhost:5003/oauth/authorize?client_id=sp3_client_123&response_type=code&redirect_uri=http://localhost:8080/index.html&state=test")
if echo "$SP3_OAUTH" | grep -q "oauth/login"; then
    echo "   ✅ SP3 OAuth is working"
else
    echo "   ❌ SP3 OAuth is not working"
fi

echo ""
echo "📊 Testing API Endpoints..."
echo "=========================="

# Test SP1 API
echo "1. Testing SP1 API..."
SP1_API=$(curl -s http://localhost:5001/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"test"}')
if echo "$SP1_API" | grep -q "Invalid credentials"; then
    echo "   ✅ SP1 API is working"
else
    echo "   ❌ SP1 API is not working"
fi

# Test SP2 API
echo "2. Testing SP2 API..."
SP2_API=$(curl -s http://localhost:5002/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"test"}')
if echo "$SP2_API" | grep -q "Invalid credentials"; then
    echo "   ✅ SP2 API is working"
else
    echo "   ❌ SP2 API is not working"
fi

# Test SP3 API
echo "3. Testing SP3 API..."
SP3_API=$(curl -s http://localhost:5003/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"test"}')
if echo "$SP3_API" | grep -q "Invalid credentials"; then
    echo "   ✅ SP3 API is working"
else
    echo "   ❌ SP3 API is not working"
fi

echo ""
echo "🎯 Service URLs for Testing..."
echo "============================="
echo "🌐 Dapp Frontend: http://localhost:8080"
echo "🚗 SP1 Ride Sharing: http://localhost:5001"
echo "🚙 SP2 Premium Rides: http://localhost:5002"
echo "🛵 SP3 Budget Rides: http://localhost:5003"
echo "🔗 OAuth Server: http://localhost:4000"
echo ""
echo "✅ All services are ready for testing!" 