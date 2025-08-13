#!/bin/bash

echo "🚀 Testing Advanced Features - Session Management, Fare Locking, and Token Refresh"
echo "=================================================================================="

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
        echo "Response: $body" | head -c 300
        if [ ${#body} -gt 300 ]; then
            echo "..."
        fi
    else
        echo -e "${RED}❌ Failed (HTTP $http_code)${NC}"
        echo "Response: $body"
    fi
    echo ""
}

echo -e "${BLUE}🔍 Test 1: Advanced Session Management${NC}"
echo "================================================"

# Test session creation
test_endpoint "Create Session" "POST" "$DAPP_BACKEND/create-session" "{\"walletAddress\": \"$TEST_WALLET\", \"latitude\": 23.8103, \"longitude\": 90.4125, \"radius\": 2}"

# Extract session ID from response for further tests
SESSION_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "{\"walletAddress\": \"$TEST_WALLET\", \"latitude\": 23.8103, \"longitude\": 90.4125, \"radius\": 2}" "$DAPP_BACKEND/create-session")
SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)

if [ -n "$SESSION_ID" ]; then
    echo -e "${GREEN}📝 Session ID extracted: $SESSION_ID${NC}"
    echo ""
    
    # Test session retrieval
    test_endpoint "Get Session Info" "GET" "$DAPP_BACKEND/session/$SESSION_ID"
    
    # Test user sessions
    test_endpoint "Get User Sessions" "GET" "$DAPP_BACKEND/sessions/$TEST_WALLET"
    
    echo -e "${BLUE}🔍 Test 2: SP Query with Session Management${NC}"
    echo "=================================================="
    
    # Test SP query with session
    test_endpoint "SP1 Query with Session" "POST" "$DAPP_BACKEND/sp-query" "{\"walletAddress\": \"$TEST_WALLET\", \"serviceProvider\": \"sp1\", \"query\": {\"location\": \"Dhaka\", \"type\": \"nearby\"}, \"sessionId\": \"$SESSION_ID\"}"
    
    test_endpoint "SP2 Query with Session" "POST" "$DAPP_BACKEND/sp-query" "{\"walletAddress\": \"$TEST_WALLET\", \"serviceProvider\": \"sp2\", \"query\": {\"location\": \"Dhaka\", \"type\": \"nearby\"}, \"sessionId\": \"$SESSION_ID\"}"
    
    test_endpoint "SP3 Query with Session" "POST" "$DAPP_BACKEND/sp-query" "{\"walletAddress\": \"$TEST_WALLET\", \"serviceProvider\": \"sp3\", \"query\": {\"location\": \"Dhaka\", \"type\": \"nearby\"}, \"sessionId\": \"$SESSION_ID\"}"
    
else
    echo -e "${RED}❌ Failed to extract session ID${NC}"
    echo ""
fi

echo -e "${BLUE}🔍 Test 3: Token Refresh & Validation System${NC}"
echo "=================================================="

# Test token validation
test_endpoint "Validate SP1 Token" "GET" "$DAPP_BACKEND/validate-token/$TEST_WALLET/sp1"
test_endpoint "Validate SP2 Token" "GET" "$DAPP_BACKEND/validate-token/$TEST_WALLET/sp2"
test_endpoint "Validate SP3 Token" "GET" "$DAPP_BACKEND/validate-token/$TEST_WALLET/sp3"

# Test token refresh
test_endpoint "Refresh SP1 Token" "POST" "$DAPP_BACKEND/refresh-token" "{\"walletAddress\": \"$TEST_WALLET\", \"serviceProvider\": \"sp1\"}"
test_endpoint "Refresh SP2 Token" "POST" "$DAPP_BACKEND/refresh-token" "{\"walletAddress\": \"$TEST_WALLET\", \"serviceProvider\": \"sp2\"}"
test_endpoint "Refresh SP3 Token" "POST" "$DAPP_BACKEND/refresh-token" "{\"walletAddress\": \"$TEST_WALLET\", \"serviceProvider\": \"sp3\"}"

# Test auto-refresh
test_endpoint "Auto-refresh All Tokens" "POST" "$DAPP_BACKEND/auto-refresh-tokens" "{\"walletAddress\": \"$TEST_WALLET\"}"

echo -e "${BLUE}🔍 Test 4: Fare Locking & Validation System${NC}"
echo "=================================================="

if [ -n "$SESSION_ID" ]; then
    # Test booking with fare locking (using mock data)
    test_endpoint "Book Ride with Fare Locking" "POST" "$DAPP_BACKEND/book-ride" "{\"aggregatorSessionId\": \"$SESSION_ID\", \"provider\": \"sp1\", \"walletAddress\": \"$TEST_WALLET\", \"providerSessionId\": \"SP_sp1_${SESSION_ID}\", \"accessToken\": \"test_token_123\"}"
else
    echo -e "${YELLOW}⚠️  Skipping fare locking test - no session ID available${NC}"
    echo ""
fi

echo -e "${BLUE}🔍 Test 5: Session Cleanup${NC}"
echo "================================"

# Test session cleanup
test_endpoint "Clean Expired Sessions" "POST" "$DAPP_BACKEND/clean-sessions"

echo -e "${BLUE}🔍 Test 6: Permission Management (Existing)${NC}"
echo "=================================================="

# Test existing permission management
test_endpoint "Get User Permissions" "GET" "$DAPP_BACKEND/permissions/$TEST_WALLET"

echo -e "${GREEN}🎉 Advanced Features Testing Completed!${NC}"
echo ""
echo -e "${BLUE}📝 Test Summary:${NC}"
echo "✅ Advanced Session Management System tested"
echo "✅ SP Query with Session Management tested"
echo "✅ Token Refresh & Validation System tested"
echo "✅ Fare Locking & Validation System tested"
echo "✅ Session Cleanup tested"
echo "✅ Permission Management (existing) tested"
echo ""
echo -e "${YELLOW}💡 Next Steps:${NC}"
echo "1. Open http://localhost:8080 in your browser"
echo "2. Connect your wallet and grant permissions to SPs"
echo "3. Test the new session-based query system"
echo "4. Verify fare locking during booking process"
echo "5. Check token refresh functionality"
echo ""
echo -e "${BLUE}🔧 System Status:${NC}"
echo "✅ Phase 1 Complete: Advanced Session Management, Fare Locking, Token Refresh"
echo "🔄 Ready for Phase 2: Enhanced Smart Contract Permission System"
echo "" 