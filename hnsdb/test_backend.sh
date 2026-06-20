#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API="http://localhost:8000"
TOKEN=""
PASS=0
FAIL=0

# Helper function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    local expected_code=${5:-200}
    
    echo -e "\n${BLUE}Testing: ${description}${NC}"
    echo "  ${method} ${endpoint}"
    
    if [ "$method" == "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "${API}${endpoint}" \
            ${TOKEN:+-H "Authorization: Bearer ${TOKEN}"})
    elif [ "$method" == "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "${API}${endpoint}" \
            -H "Content-Type: application/json" \
            ${TOKEN:+-H "Authorization: Bearer ${TOKEN}"} \
            -d "${data}")
    elif [ "$method" == "PUT" ]; then
        response=$(curl -s -w "\n%{http_code}" -X PUT "${API}${endpoint}" \
            -H "Content-Type: application/json" \
            ${TOKEN:+-H "Authorization: Bearer ${TOKEN}"} \
            -d "${data}")
    elif [ "$method" == "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X DELETE "${API}${endpoint}" \
            ${TOKEN:+-H "Authorization: Bearer ${TOKEN}"})
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "  ${GREEN}✅ PASS${NC} (HTTP ${http_code})"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}❌ FAIL${NC} (HTTP ${http_code})"
        echo "  Response: $(echo $body | head -c 200)"
        FAIL=$((FAIL + 1))
    fi
}

echo "========================================"
echo "  Heavenly Nature School - API Test"
echo "========================================"
echo "  API URL: ${API}"
echo "  Time: $(date)"
echo "========================================"

# ==========================================
# 1. SYSTEM ENDPOINTS (No Auth Required)
# ==========================================
echo -e "\n${YELLOW}━━━ 1. SYSTEM ENDPOINTS ━━━${NC}"

test_endpoint "GET" "/" "" "API Root"
test_endpoint "GET" "/health" "" "Health Check"
test_endpoint "GET" "/status" "" "System Status"
test_endpoint "GET" "/docs" "" "Swagger Docs"

# ==========================================
# 2. AUTHENTICATION
# ==========================================
echo -e "\n${YELLOW}━━━ 2. AUTHENTICATION ━━━${NC}"

# Login
echo -e "\n${BLUE}Testing: Login${NC}"
login_response=$(curl -s -X POST "${API}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@test.com","password":"Admin@2024!"}')

login_success=$(echo "$login_response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)

if [ "$login_success" == "True" ]; then
    echo -e "  ${GREEN}✅ Login Successful${NC}"
    PASS=$((PASS + 1))
    
    # Extract token
    TOKEN=$(echo "$login_response" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['access_token'])" 2>/dev/null)
    
    if [ -n "$TOKEN" ]; then
        echo -e "  ${GREEN}✅ Token received${NC}"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}❌ No token in response${NC}"
        FAIL=$((FAIL + 1))
    fi
else
    echo -e "  ${RED}❌ Login Failed${NC}"
    echo "  Response: $(echo $login_response | head -c 300)"
    FAIL=$((FAIL + 1))
fi

# Test invalid login
test_endpoint "POST" "/api/v1/auth/login" \
    '{"email":"wrong@email.com","password":"wrongpass"}' \
    "Invalid Login (should fail)"

# Get current user
test_endpoint "GET" "/api/v1/auth/me" "" "Get Current User"

# Verify token
test_endpoint "GET" "/api/v1/auth/verify" "" "Verify Token"

# ==========================================
# 3. SCHOOL INFO
# ==========================================
echo -e "\n${YELLOW}━━━ 3. SCHOOL INFORMATION ━━━${NC}"

test_endpoint "GET" "/api/v1/school/info" "" "Get School Info"
test_endpoint "GET" "/api/v1/school/dashboard" "" "Dashboard Statistics"

# ==========================================
# 4. USER MANAGEMENT (Admin)
# ==========================================
echo -e "\n${YELLOW}━━━ 4. USER MANAGEMENT ━━━${NC}"

test_endpoint "GET" "/api/v1/users?page=1&limit=5" "" "List Users"
test_endpoint "GET" "/api/v1/users/roles/list" "" "Get Roles"

# Create a test user
test_endpoint "POST" "/api/v1/users" \
    '{"first_name":"Test","last_name":"Teacher","email":"teacher@test.com","password":"Teacher@2024!","confirm_password":"Teacher@2024!","role":"teacher"}' \
    "Create Teacher User"

# ==========================================
# 5. STUDENTS
# ==========================================
echo -e "\n${YELLOW}━━━ 5. STUDENTS ━━━${NC}"

test_endpoint "GET" "/api/v1/students?page=1&limit=5" "" "List Students"
test_endpoint "GET" "/api/v1/students/statistics/overview" "" "Student Statistics"
test_endpoint "GET" "/api/v1/students/statistics/by-class" "" "Students by Class"

# Create a test student
test_endpoint "POST" "/api/v1/students" \
    '{"first_name":"John","last_name":"Doe","gender":"Male","date_of_birth":"2016-05-15","student_type":"other","enrollment_date":"2024-01-15"}' \
    "Create Student"

# ==========================================
# 6. TEACHERS
# ==========================================
echo -e "\n${YELLOW}━━━ 6. TEACHERS ━━━${NC}"

test_endpoint "GET" "/api/v1/teachers?page=1&limit=5" "" "List Teachers"
test_endpoint "GET" "/api/v1/teachers/statistics/overview" "" "Teacher Statistics"

# ==========================================
# 7. CLASSES
# ==========================================
echo -e "\n${YELLOW}━━━ 7. CLASSES ━━━${NC}"

test_endpoint "GET" "/api/v1/classes?page=1&limit=5" "" "List Classes"
test_endpoint "GET" "/api/v1/classes/statistics/overview" "" "Class Statistics"
test_endpoint "GET" "/api/v1/classes/levels" "" "Class Levels"
test_endpoint "GET" "/api/v1/classes/promotion-map" "" "Promotion Map"

# ==========================================
# 8. ATTENDANCE
# ==========================================
echo -e "\n${YELLOW}━━━ 8. ATTENDANCE ━━━${NC}"

test_endpoint "GET" "/api/v1/attendance/today" "" "Today's Attendance"

# ==========================================
# 9. EXAMS
# ==========================================
echo -e "\n${YELLOW}━━━ 9. EXAMS ━━━${NC}"

test_endpoint "GET" "/api/v1/exams?page=1&limit=5" "" "List Exams"
test_endpoint "GET" "/api/v1/exams/subjects" "" "List Subjects"
test_endpoint "GET" "/api/v1/exams/grading-systems" "" "Grading Systems"

# ==========================================
# 10. FINANCIAL
# ==========================================
echo -e "\n${YELLOW}━━━ 10. FINANCIAL ━━━${NC}"

test_endpoint "GET" "/api/v1/financial/summary" "" "Financial Summary"
test_endpoint "GET" "/api/v1/financial/dashboard" "" "Financial Dashboard"

# ==========================================
# 11. REPORTS
# ==========================================
echo -e "\n${YELLOW}━━━ 11. REPORTS ━━━${NC}"

test_endpoint "GET" "/api/v1/reports/enrollment/summary" "" "Enrollment Summary"
test_endpoint "GET" "/api/v1/reports/staff/summary" "" "Staff Summary"

# ==========================================
# 12. SCHOOL EVENTS
# ==========================================
echo -e "\n${YELLOW}━━━ 12. EVENTS ━━━${NC}"

test_endpoint "GET" "/api/v1/school/events" "" "List Events"
test_endpoint "GET" "/api/v1/school/board" "" "Board Members"

# ==========================================
# SUMMARY
# ==========================================
TOTAL=$((PASS + FAIL))
echo ""
echo "========================================"
echo "  TEST SUMMARY"
echo "========================================"
echo -e "  ${GREEN}Passed: ${PASS}/${TOTAL}${NC}"
echo -e "  ${RED}Failed: ${FAIL}/${TOTAL}${NC}"
echo "  Success Rate: $(( (PASS * 100) / TOTAL ))%"
echo "========================================"

if [ $FAIL -eq 0 ]; then
    echo -e "  ${GREEN}🎉 ALL TESTS PASSED!${NC}"
else
    echo -e "  ${YELLOW}⚠️  Some tests failed. Check above for details.${NC}"
fi
echo "========================================"
