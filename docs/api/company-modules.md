# 런치랩 회사별 모듈 API 문서

## 회사별 모듈 관리 API

이 문서는 런치랩의 회사별 모듈 관리 API에 대한 상세 정보를 제공합니다.

## 목차

- [회사 모듈 목록 조회](#회사-모듈-목록-조회)
- [회사에 모듈 구독 추가](#회사에-모듈-구독-추가)
- [회사 특정 모듈 구독 정보 조회](#회사-특정-모듈-구독-정보-조회)
- [회사 모듈 구독 취소](#회사-모듈-구독-취소)
- [회사 모듈 설정 조회](#회사-모듈-설정-조회)
- [회사 모듈 설정 업데이트](#회사-모듈-설정-업데이트)

---

## 회사 모듈 목록 조회

특정 회사가 구독 중인 모든 모듈 목록을 조회합니다.

- **URL**: `/api/companies/:id/modules`
- **Method**: `GET`
- **URL 파라미터**:
  - `id`: 회사 ID
- **권한**: 회사 멤버

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
      "subscription_status": "active",
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z"
    },
    // 더 많은 모듈...
  ]
}
```

#### 에러 응답

- **400 Bad Request**
  ```json
  { "error": "회사 ID는 필수 항목입니다." }
  ```

- **401 Unauthorized**
  ```json
  { "error": "인증되지 않은 요청입니다." }
  ```

- **403 Forbidden**
  ```json
  { "error": "해당 회사에 접근 권한이 없습니다." }
  ```

- **500 Internal Server Error**
  ```json
  { "error": "모듈 구독 목록 조회 중 오류가 발생했습니다." }
  ```

---

## 회사에 모듈 구독 추가

특정 회사에 새로운 모듈을 구독합니다.

- **URL**: `/api/companies/:id/modules`
- **Method**: `POST`
- **URL 파라미터**:
  - `id`: 회사 ID
- **요청 본문**:
  ```json
  {
    "moduleId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
  ```
- **권한**: 회사 관리자 또는 소유자

### 응답

#### 성공 응답 (200 OK)

```json
{
  "subscription": {
    "id": "s1u2b3s4-c5r6-7890-abcd-ef1234567890",
    "company_id": "c1o2m3p4-a5n6-7890-abcd-ef1234567890",
    "module_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "active",
    "start_date": "2023-01-01T00:00:00Z",
    "payment_status": "free",
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  }
}
```

#### 에러 응답

- **400 Bad Request**
  ```json
  { "error": "회사 ID는 필수 항목입니다." }
  ```
  또는
  ```json
  { "error": "모듈 ID는 필수 항목입니다." }
  ```

- **401 Unauthorized**
  ```json
  { "error": "인증되지 않은 요청입니다." }
  ```

- **403 Forbidden**
  ```json
  { "error": "해당 회사에 접근 권한이 없습니다." }
  ```
  또는
  ```json
  { "error": "모듈 구독 권한이 없습니다. 관리자 또는 소유자만 모듈을 구독할 수 있습니다." }
  ```

- **500 Internal Server Error**
  ```json
  { "error": "모듈 구독 처리 중 오류가 발생했습니다." }
  ```

---

## 회사 특정 모듈 구독 정보 조회

특정 회사의 특정 모듈 구독 정보를 조회합니다.

- **URL**: `/api/companies/:id/modules/:moduleId`
- **Method**: `GET`
- **URL 파라미터**:
  - `id`: 회사 ID
  - `moduleId`: 모듈 ID
- **권한**: 회사 멤버

### 응답

#### 성공 응답 (200 OK)

```json
{
  "subscription": {
    "id": "s1u2b3s4-c5r6-7890-abcd-ef1234567890",
    "status": "active",
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T00:00:00Z",
    "module": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "식재료 관리",
      "description": "식재료 목록 관리 및 추적 기능",
      "icon_url": "https://example.com/icons/ingredients.png",
      "category": "inventory"
    }
  }
}
```

#### 에러 응답

- **400 Bad Request**
  ```json
  { "error": "회사 ID와 모듈 ID는 필수 항목입니다." }
  ```

- **401 Unauthorized**
  ```json
  { "error": "인증되지 않은 요청입니다." }
  ```

- **403 Forbidden**
  ```json
  { "error": "해당 회사에 접근 권한이 없습니다." }
  ```

- **404 Not Found**
  ```json
  { "error": "해당 모듈의 구독 정보를 찾을 수 없습니다." }
  ```

- **500 Internal Server Error**
  ```json
  { "error": "모듈 구독 정보 조회 중 오류가 발생했습니다." }
  ```

---

## 회사 모듈 구독 취소

특정 회사의 모듈 구독을 취소합니다.

- **URL**: `/api/companies/:id/modules/:moduleId`
- **Method**: `DELETE`
- **URL 파라미터**:
  - `id`: 회사 ID
  - `moduleId`: 모듈 ID
- **권한**: 회사 관리자 또는 소유자

### 응답

#### 성공 응답 (200 OK)

```json
{
  "success": true
}
```

#### 에러 응답

- **400 Bad Request**
  ```json
  { "error": "회사 ID와 모듈 ID는 필수 항목입니다." }
  ```

- **401 Unauthorized**
  ```json
  { "error": "인증되지 않은 요청입니다." }
  ```

- **403 Forbidden**
  ```json
  { "error": "해당 회사에 접근 권한이 없습니다." }
  ```
  또는
  ```json
  { "error": "모듈 구독 취소 권한이 없습니다. 관리자 또는 소유자만 구독을 취소할 수 있습니다." }
  ```

- **500 Internal Server Error**
  ```json
  { "error": "모듈 구독 취소 중 오류가 발생했습니다." }
  ```

---

## 회사 모듈 설정 조회

특정 회사의 특정 모듈 설정 정보를 조회합니다.

- **URL**: `/api/companies/:id/modules/:moduleId/settings`
- **Method**: `GET`
- **URL 파라미터**:
  - `id`: 회사 ID
  - `moduleId`: 모듈 ID
- **권한**: 회사 멤버

### 응답

#### 성공 응답 (200 OK)

```json
{
  "settings": [
    {
      "id": "s1e2t3t4-i5n6-7890-abcd-ef1234567890",
      "company_id": "c1o2m3p4-a5n6-7890-abcd-ef1234567890",
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

- **400 Bad Request**
  ```json
  { "error": "회사 ID와 모듈 ID는 필수 항목입니다." }
  ```

- **401 Unauthorized**
  ```json
  { "error": "인증되지 않은 요청입니다." }
  ```

- **403 Forbidden**
  ```json
  { "error": "해당 회사에 접근 권한이 없습니다." }
  ```

- **404 Not Found**
  ```json
  { "error": "해당 모듈의 구독 정보를 찾을 수 없습니다." }
  ```

- **500 Internal Server Error**
  ```json
  { "error": "모듈 설정 정보 조회 중 오류가 발생했습니다." }
  ```

---

## 회사 모듈 설정 업데이트

특정 회사의 특정 모듈 설정 정보를 업데이트합니다.

- **URL**: `/api/companies/:id/modules/:moduleId/settings`
- **Method**: `PUT`
- **URL 파라미터**:
  - `id`: 회사 ID
  - `moduleId`: 모듈 ID
- **요청 본문**:
  ```json
  {
    "key1": "value1",
    "key2": "value2"
    // 업데이트할 설정 키-값 쌍
  }
  ```
- **권한**: 회사 관리자 또는 소유자

### 응답

#### 성공 응답 (200 OK)

```json
{
  "settings": [
    {
      "id": "s1e2t3t4-i5n6-7890-abcd-ef1234567890",
      "company_id": "c1o2m3p4-a5n6-7890-abcd-ef1234567890",
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
  { "error": "회사 ID와 모듈 ID는 필수 항목입니다." }
  ```
  또는
  ```json
  { "error": "잘못된 요청 형식입니다." }
  ```

- **401 Unauthorized**
  ```json
  { "error": "인증되지 않은 요청입니다." }
  ```

- **403 Forbidden**
  ```json
  { "error": "해당 회사에 접근 권한이 없습니다." }
  ```
  또는
  ```json
  { "error": "모듈 설정 변경 권한이 없습니다. 관리자 또는 소유자만 설정을 변경할 수 있습니다." }
  ```

- **404 Not Found**
  ```json
  { "error": "해당 모듈의 구독 정보를 찾을 수 없습니다." }
  ```

- **500 Internal Server Error**
  ```json
  { "error": "모듈 설정 정보 업데이트 중 오류가 발생했습니다." }
  ``` 