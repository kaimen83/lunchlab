#!/bin/bash

# 환경 변수 설정
BASE_URL="http://localhost:3000"
AUTH_TOKEN="YOUR_AUTH_TOKEN"
COMPANY_ID="your-company-id"
MODULE_ID="your-module-id"

# 응답 확인 함수
check_response() {
  if [[ $1 == *"error"* ]]; then
    echo "❌ 실패: $2"
    echo "$1"
  else
    echo "✅ 성공: $2"
  fi
}

# 마켓플레이스 모듈 API 테스트
echo "===== 마켓플레이스 모듈 API 테스트 ====="

# 1. 모듈 목록 조회
response=$(curl -s -X GET "$BASE_URL/api/marketplace/modules" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json")
check_response "$response" "모듈 목록 조회"

# 2. 특정 모듈 조회
response=$(curl -s -X GET "$BASE_URL/api/marketplace/modules/$MODULE_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json")
check_response "$response" "특정 모듈 조회"

# 3. 모듈 구독 정보 조회 (관리자 전용)
response=$(curl -s -X GET "$BASE_URL/api/marketplace/modules/$MODULE_ID/subscription" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json")
check_response "$response" "모듈 구독 정보 조회"

# 4. 모듈 설정 정보 조회 (관리자 전용)
response=$(curl -s -X GET "$BASE_URL/api/marketplace/modules/$MODULE_ID/settings" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json")
check_response "$response" "모듈 설정 정보 조회"

# 회사별 모듈 API 테스트
echo "===== 회사별 모듈 API 테스트 ====="

# 1. 회사 모듈 목록 조회
response=$(curl -s -X GET "$BASE_URL/api/companies/$COMPANY_ID/modules" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json")
check_response "$response" "회사 모듈 목록 조회"

# 2. 회사에 모듈 구독 추가
response=$(curl -s -X POST "$BASE_URL/api/companies/$COMPANY_ID/modules" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "moduleId": "'"$MODULE_ID"'"
  }')
check_response "$response" "회사에 모듈 구독 추가"

# 3. 회사 특정 모듈 구독 정보 조회
response=$(curl -s -X GET "$BASE_URL/api/companies/$COMPANY_ID/modules/$MODULE_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json")
check_response "$response" "회사 특정 모듈 구독 정보 조회"

# 4. 회사 모듈 설정 조회
response=$(curl -s -X GET "$BASE_URL/api/companies/$COMPANY_ID/modules/$MODULE_ID/settings" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json")
check_response "$response" "회사 모듈 설정 조회"

# 5. 회사 모듈 설정 업데이트
response=$(curl -s -X PUT "$BASE_URL/api/companies/$COMPANY_ID/modules/$MODULE_ID/settings" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "test_key": "test_value"
  }')
check_response "$response" "회사 모듈 설정 업데이트"

# 6. 회사 모듈 구독 취소 (마지막에 실행)
response=$(curl -s -X DELETE "$BASE_URL/api/companies/$COMPANY_ID/modules/$MODULE_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json")
check_response "$response" "회사 모듈 구독 취소"

echo "테스트 완료!" 