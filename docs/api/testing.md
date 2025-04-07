# 런치랩 API 테스트 가이드

이 문서는 런치랩 API를 테스트하는 방법을 설명합니다. 각 API 엔드포인트의 기능을 테스트하기 위한 curl 명령어와 예상 결과를 제공합니다.

## 사전 요구사항

- [curl](https://curl.se/) 명령줄 도구가 설치되어 있어야 합니다.
- 유효한 인증 토큰이 필요합니다 (아래 예제에서는 `YOUR_AUTH_TOKEN`를 실제 토큰으로 대체하세요).

## 환경 변수 설정

테스트를 시작하기 전에 다음 환경 변수를 설정하세요:

```bash
# 기본 URL
BASE_URL="https://your-lunchlab-api.com"

# 인증 토큰
AUTH_TOKEN="YOUR_AUTH_TOKEN"

# 테스트에 사용할 IDs
COMPANY_ID="your-company-id"
MODULE_ID="your-module-id"
```

## 마켓플레이스 모듈 API 테스트

### 1. 모듈 목록 조회

```bash
curl -X GET "$BASE_URL/api/marketplace/modules" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. 특정 모듈 조회

```bash
curl -X GET "$BASE_URL/api/marketplace/modules/$MODULE_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

### 3. 모듈 구독 정보 조회 (관리자 전용)

```bash
curl -X GET "$BASE_URL/api/marketplace/modules/$MODULE_ID/subscription" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

### 4. 모듈 설정 정보 조회 (관리자 전용)

```bash
curl -X GET "$BASE_URL/api/marketplace/modules/$MODULE_ID/settings" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

### 5. 모듈 설정 정보 업데이트 (관리자 전용)

```bash
curl -X PUT "$BASE_URL/api/marketplace/modules/$MODULE_ID/settings" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key1": "value1",
    "key2": "value2"
  }'
```

## 회사별 모듈 API 테스트

### 1. 회사 모듈 목록 조회

```bash
curl -X GET "$BASE_URL/api/companies/$COMPANY_ID/modules" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. 회사에 모듈 구독 추가 (관리자/소유자 전용)

```bash
curl -X POST "$BASE_URL/api/companies/$COMPANY_ID/modules" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "moduleId": "'"$MODULE_ID"'"
  }'
```

### 3. 회사 특정 모듈 구독 정보 조회

```bash
curl -X GET "$BASE_URL/api/companies/$COMPANY_ID/modules/$MODULE_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

### 4. 회사 모듈 구독 취소 (관리자/소유자 전용)

```bash
curl -X DELETE "$BASE_URL/api/companies/$COMPANY_ID/modules/$MODULE_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

### 5. 회사 모듈 설정 조회

```bash
curl -X GET "$BASE_URL/api/companies/$COMPANY_ID/modules/$MODULE_ID/settings" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

### 6. 회사 모듈 설정 업데이트 (관리자/소유자 전용)

```bash
curl -X PUT "$BASE_URL/api/companies/$COMPANY_ID/modules/$MODULE_ID/settings" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key1": "value1",
    "key2": "value2"
  }'
```

## 자동화된 테스트 스크립트

다음은 모든 API 엔드포인트를 자동으로 테스트하는 쉘 스크립트입니다:

```bash
#!/bin/bash

# 환경 변수 설정
BASE_URL="https://your-lunchlab-api.com"
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

echo "테스트 완료!"
```

이 스크립트를 실행하려면:

1. 텍스트 편집기에서 위 스크립트를 복사하여 `test_api.sh` 파일에 저장합니다.
2. 환경 변수를 실제 값으로 업데이트합니다.
3. 파일을 실행 가능하게 만듭니다: `chmod +x test_api.sh`
4. 스크립트를 실행합니다: `./test_api.sh`

## 테스트 결과 해석

각 API 테스트 후 다음과 같은 결과가 표시됩니다:

- ✅ 성공: API가 성공적으로 응답하고 예상 결과를 반환했습니다.
- ❌ 실패: API가 오류를 반환했거나 예상 결과를 반환하지 않았습니다.

실패한 테스트의 경우 오류 메시지를 확인하여 문제를 해결하세요. 