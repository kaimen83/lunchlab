# 런치랩 마켓플레이스 API 문서

## 모듈 관리 API

이 문서는 런치랩 마켓플레이스의 모듈 관리 API에 대한 상세 정보를 제공합니다.

## 목차

- [모듈 목록 조회](#모듈-목록-조회)
- [특정 모듈 조회](#특정-모듈-조회)
- [모듈 구독 정보 조회](#모듈-구독-정보-조회)
- [모듈 설정 정보 조회](#모듈-설정-정보-조회)
- [모듈 설정 정보 업데이트](#모듈-설정-정보-업데이트)

---

## 모듈 목록 조회

마켓플레이스에서 제공하는 모든 모듈 목록을 조회합니다.

- **URL**: `/api/marketplace/modules`
- **Method**: `GET`
- **권한**: 인증된 사용자

### 응답

#### 성공 응답 (200 OK)

```json
{
  "modules": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "식재료 관리",
      "description": "식재료 목록 관리 및 추적 기능",
      "icon": "ingredient_icon",
      "category": "inventory",
      "price": 0,
      "is_active": true,
      "requires_approval": false,
      "version": "1.0.0",
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z"
    },
    // 더 많은 모듈...
  ]
}
```

#### 에러 응답

- **401 Unauthorized**
  ```json
  { "error": "인증되지 않은 요청입니다." }
  ```

- **500 Internal Server Error**
  ```json
  { "error": "모듈 목록 조회 중 오류가 발생했습니다." }
  ```

---

## 특정 모듈 조회

특정 ID를 가진 마켓플레이스 모듈의 상세 정보를 조회합니다.

- **URL**: `/api/marketplace/modules/:id`
- **Method**: `GET`
- **URL 파라미터**: 
  - `id`: 모듈 ID
- **권한**: 인증된 사용자

### 응답

#### 성공 응답 (200 OK)

```json
{
  "module": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "식재료 관리",
    "description": "식재료 목록 관리 및 추적 기능",
    "icon": "ingredient_icon",
    "category": "inventory",
    "price": 0,
    "is_active": true,
    "requires_approval": false,
    "version": "1.0.0",
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  },
  "features": [
    {
      "id": "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
      "module_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "식재료 등록",
      "description": "새로운 식재료 등록 기능",
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z"
    },
    // 더 많은 기능...
  ]
}
```

#### 에러 응답

- **401 Unauthorized**
  ```json
  { "error": "인증되지 않은 요청입니다." }
  ```

- **404 Not Found**
  ```json
  { "error": "해당 모듈을 찾을 수 없습니다." }
  ```

- **500 Internal Server Error**
  ```json
  { "error": "모듈 정보 조회 중 오류가 발생했습니다." }
  ```

---

## 모듈 구독 정보 조회

특정 모듈을 구독한 회사들의 목록을 조회합니다.

- **URL**: `/api/marketplace/modules/:id/subscription`
- **Method**: `GET`
- **URL 파라미터**: 
  - `id`: 모듈 ID
- **권한**: 관리자만 접근 가능

### 응답

#### 성공 응답 (200 OK)

```json
{
  "subscriptions": [
    {
      "id": "s1u2b3s4-c5r6-7890-abcd-ef1234567890",
      "status": "active",
      "createdAt": "2023-01-01T00:00:00Z",
      "updatedAt": "2023-01-01T00:00:00Z",
      "company": {
        "id": "c1o2m3p4-a5n6-7890-abcd-ef1234567890",
        "name": "런치랩 테스트 회사",
        "logo_url": "https://example.com/logo.png"
      }
    },
    // 더 많은 구독 정보...
  ]
}
```

#### 에러 응답

- **401 Unauthorized**
  ```json
  { "error": "인증되지 않은 요청입니다." }
  ```

- **403 Forbidden**
  ```json
  { "error": "이 API에 접근할 권한이 없습니다. 관리자만 접근 가능합니다." }
  ```

- **500 Internal Server Error**
  ```json
  { "error": "모듈 구독 정보 조회 중 오류가 발생했습니다." }
  ```

---

## 모듈 설정 정보 조회

특정 마켓플레이스 모듈의 설정 정보를 조회합니다.

- **URL**: `/api/marketplace/modules/:id/settings`
- **Method**: `GET`
- **URL 파라미터**: 
  - `id`: 모듈 ID
- **권한**: 관리자만 접근 가능

### 응답

#### 성공 응답 (200 OK)

```json
{
  "settings": [
    {
      "id": "s1e2t3t4-i5n6-7890-abcd-ef1234567890",
      "module_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "key": "default_unit",
      "value": "kg",
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z"
    },
    // 더 많은 설정...
  ]
}
```

#### 에러 응답

- **401 Unauthorized**
  ```json
  { "error": "인증되지 않은 요청입니다." }
  ```

- **403 Forbidden**
  ```json
  { "error": "이 API에 접근할 권한이 없습니다. 관리자만 접근 가능합니다." }
  ```

- **500 Internal Server Error**
  ```json
  { "error": "모듈 설정 정보 조회 중 오류가 발생했습니다." }
  ```

---

## 모듈 설정 정보 업데이트

특정 마켓플레이스 모듈의 설정 정보를 업데이트합니다.

- **URL**: `/api/marketplace/modules/:id/settings`
- **Method**: `PUT`
- **URL 파라미터**: 
  - `id`: 모듈 ID
- **요청 본문**:
  ```json
  {
    "key1": "value1",
    "key2": "value2"
    // 업데이트할 설정 키-값 쌍
  }
  ```
- **권한**: 관리자만 접근 가능

### 응답

#### 성공 응답 (200 OK)

```json
{
  "settings": [
    {
      "id": "s1e2t3t4-i5n6-7890-abcd-ef1234567890",
      "module_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "key": "key1",
      "value": "value1",
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-02T00:00:00Z"
    },
    // 업데이트된 다른 설정...
  ]
}
```

#### 에러 응답

- **400 Bad Request**
  ```json
  { "error": "잘못된 요청 형식입니다." }
  ```
  
- **401 Unauthorized**
  ```json
  { "error": "인증되지 않은 요청입니다." }
  ```

- **403 Forbidden**
  ```json
  { "error": "이 API에 접근할 권한이 없습니다. 관리자만 접근 가능합니다." }
  ```

- **500 Internal Server Error**
  ```json
  { "error": "모듈 설정 정보 업데이트 중 오류가 발생했습니다." }
  ``` 