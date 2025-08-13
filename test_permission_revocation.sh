#!/bin/bash

echo "🔐 Testing Permission Revocation System"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
DAPP_BACKEND="http://localhost:3002"
SP1_BACKEND="http://localhost:5001"
SP2_BACKEND="http://localhost:5002"
SP3_BACKEND="http://localhost:5003"
TEST_WALLET="0x86a587c3710ded6694f1df2e5466e80e013711bc"

echo -e "${BLUE}📋 Test Configuration:${NC}"
echo "DApp Backend: $DAPP_BACKEND"
echo "SP1 Backend: $SP1_BACKEND"
echo "SP2 Backend: $SP2_BACKEND"
echo "SP3 Backend: $SP3_BACKEND"
echo "Test Wallet: $TEST_WALLET"
echo ""

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    
    echo -e "${YELLOW}🧪 Testing: $name${NC}"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$url")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$url")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✅ Success (HTTP $http_code)${NC}"
        echo "Response: $body" | head -c 200
        if [ ${#body} -gt 200 ]; then
            echo "..."
        fi
    else
        echo -e "${RED}❌ Failed (HTTP $http_code)${NC}"
        echo "Response: $body"
    fi
    echo ""
}

# Test 1: Check DApp Backend Health
echo -e "${BLUE}🔍 Test 1: DApp Backend Health Check${NC}"
test_endpoint "DApp Health" "GET" "$DAPP_BACKEND/health"

# Test 2: Check SP Backends Health
echo -e "${BLUE}🔍 Test 2: SP Backends Health Check${NC}"
test_endpoint "SP1 Health" "GET" "$SP1_BACKEND/api/health"
test_endpoint "SP2 Health" "GET" "$SP2_BACKEND/api/health"
test_endpoint "SP3 Health" "GET" "$SP3_BACKEND/api/health"

# Test 3: Get User Permissions
echo -e "${BLUE}🔍 Test 3: Get User Permissions${NC}"
test_endpoint "Get Permissions" "GET" "$DAPP_BACKEND/permissions/$TEST_WALLET"

# Test 4: Test SP Token Revocation Endpoints
echo -e "${BLUE}🔍 Test 4: SP Token Revocation Endpoints${NC}"
test_endpoint "SP1 Token Revocation" "POST" "$SP1_BACKEND/api/revoke-token" '{"access_token": "test_token_123"}'
test_endpoint "SP2 Token Revocation" "POST" "$SP2_BACKEND/api/revoke-token" '{"access_token": "test_token_456"}'
test_endpoint "SP3 Token Revocation" "POST" "$SP3_BACKEND/api/revoke-token" '{"access_token": "test_token_789"}'

# Test 5: Test Individual Permission Revocation
echo -e "${BLUE}🔍 Test 5: Individual Permission Revocation${NC}"
test_endpoint "Revoke SP1 Permission" "POST" "$DAPP_BACKEND/revoke-permission" "{\"walletAddress\": \"$TEST_WALLET\", \"serviceProvider\": \"sp1\"}"

# Test 6: Test All Permissions Revocation
echo -e "${BLUE}🔍 Test 6: All Permissions Revocation${NC}"
test_endpoint "Revoke All Permissions" "POST" "$DAPP_BACKEND/revoke-all-permissions" "{\"walletAddress\": \"$TEST_WALLET\"}"

# Test 7: Verify Permissions After Revocation
echo -e "${BLUE}🔍 Test 7: Verify Permissions After Revocation${NC}"
test_endpoint "Get Permissions After Revocation" "GET" "$DAPP_BACKEND/permissions/$TEST_WALLET"

echo -e "${GREEN}🎉 Permission Revocation System Tests Completed!${NC}"
echo ""
echo -e "${BLUE}📝 Test Summary:${NC}"
echo "✅ DApp Backend endpoints tested"
echo "✅ SP Backend token revocation endpoints tested"
echo "✅ Individual permission revocation tested"
echo "✅ Bulk permission revocation tested"
echo "✅ Permission verification tested"
echo ""
echo -e "${YELLOW}💡 Next Steps:${NC}"
echo "1. Open http://localhost:8080 in your browser"
echo "2. Connect your wallet and grant permissions to SPs"
echo "3. Click 'Manage Permissions' to test the UI"
echo "4. Try revoking individual and all permissions"
echo "" 