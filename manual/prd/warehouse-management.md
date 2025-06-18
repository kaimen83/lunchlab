# 창고 관리 시스템 PRD (Product Requirements Document)

## 1. 개요

기존 재고관리 시스템에 창고(warehouse) 개념을 추가하여, 회사 내 여러 창고에서 재고를 분리 관리할 수 있도록 개선합니다.

## 2. 목표

- 회사 내 여러 창고에서 재고를 분리하여 관리
- 창고별 재고 현황 조회 및 관리
- 창고 간 재고 이동 기능
- 기존 시스템과의 호환성 유지

## 3. 핵심 기능

### 3.1 창고 관리
- 창고 생성, 수정, 삭제
- 창고별 기본 정보 관리 (이름, 설명, 주소)
- 기본 창고 설정 기능

### 3.2 창고별 재고 관리
- 창고 선택을 통한 재고 조회
- 창고별 식자재/용기 재고 현황
- 전체 창고 재고 합계 조회

### 3.3 창고 간 재고 이동
- 창고 간 재고 이동 기능
- 이동 기록 추적

### 3.4 창고별 재고 실사
- 창고별 재고 실사 진행
- 창고별 실사 결과 조회

## 4. 기술 요구사항

### 4.1 데이터베이스 스키마

#### warehouses 테이블
```sql
CREATE TABLE warehouses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  address TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### stock_items 테이블 수정
- warehouse_id 컬럼 추가 (UUID, warehouses 테이블 참조)
- 기본값은 회사의 기본 창고

#### stock_transactions 테이블 수정
- source_warehouse_id 컬럼 추가 (이동 시 출발 창고)
- destination_warehouse_id 컬럼 추가 (이동 시 도착 창고)
- transaction_type에 'transfer' 추가

#### stock_audits 테이블 수정
- warehouse_id 컬럼 추가

### 4.2 API 엔드포인트

#### 창고 관리
- GET /api/companies/[id]/warehouses - 창고 목록 조회
- POST /api/companies/[id]/warehouses - 창고 생성
- PUT /api/companies/[id]/warehouses/[warehouseId] - 창고 수정
- DELETE /api/companies/[id]/warehouses/[warehouseId] - 창고 삭제

#### 재고 관리 (기존 API 확장)
- warehouse_id 쿼리 파라미터 추가
- GET /api/companies/[id]/stock/items?warehouse_id=xxx
- POST /api/companies/[id]/stock/transactions (창고 간 이동 포함)

### 4.3 UI/UX 요구사항

#### 창고 선택 인터페이스
- 재고 페이지 상단에 창고 선택 드롭다운
- "전체 창고" 옵션으로 모든 창고 재고 합계 표시
- 선택된 창고에 따라 재고 데이터 필터링

#### 창고 관리 페이지
- 회사 설정 내 창고 관리 섹션
- 창고 CRUD 기능
- 기본 창고 설정 기능

#### 재고 이동 기능
- 재고 상세 페이지에서 다른 창고로 이동 버튼
- 이동량 입력 모달
- 이동 내역 거래 기록에 표시

## 5. 사용자 스토리

### 5.1 창고 생성
- 관리자는 새로운 창고를 생성할 수 있다
- 창고명, 설명, 주소를 입력할 수 있다
- 기본 창고로 설정할 수 있다

### 5.2 창고별 재고 조회
- 사용자는 특정 창고의 재고만 조회할 수 있다
- 사용자는 전체 창고의 재고 합계를 조회할 수 있다
- 창고 선택은 페이지 새로고침 없이 실시간으로 적용된다

### 5.3 창고 간 재고 이동
- 사용자는 재고를 다른 창고로 이동할 수 있다
- 이동 내역은 거래 기록에 남는다
- 이동 전후 각 창고의 재고량이 정확히 업데이트된다

### 5.4 창고별 재고 실사
- 사용자는 특정 창고에 대해서만 재고 실사를 진행할 수 있다
- 실사 결과는 해당 창고의 재고에만 반영된다

## 6. 구현 우선순위

### Phase 1: 기본 창고 인프라
1. warehouses 테이블 생성
2. 기본 창고 자동 생성 (회사 생성 시)
3. stock_items에 warehouse_id 추가
4. 기존 재고 데이터를 기본 창고로 마이그레이션

### Phase 2: 창고 관리 UI
1. 창고 관리 페이지 구현
2. 창고 CRUD API 구현
3. 창고 선택 드롭다운 추가

### Phase 3: 창고별 재고 조회
1. 재고 API에 warehouse_id 파라미터 추가
2. UI에서 선택된 창고에 따른 재고 필터링
3. 전체 창고 재고 합계 기능

### Phase 4: 창고 간 이동
1. 재고 이동 API 구현
2. 이동 UI 구현
3. 이동 내역 거래 기록 표시

### Phase 5: 창고별 실사
1. 실사 API에 warehouse_id 추가
2. 창고별 실사 UI 수정

## 7. 기술 스택

- **Backend**: Next.js API Routes
- **Database**: Supabase PostgreSQL
- **Frontend**: React, TypeScript
- **UI Components**: ShadCN/UI
- **State Management**: React State + SWR

## 8. 마이그레이션 전략

### 기존 데이터 처리
1. 모든 회사에 "메인 창고" 자동 생성
2. 기존 stock_items의 warehouse_id를 메인 창고로 설정
3. 기존 API 호환성 유지 (warehouse_id 생략 시 기본 창고 사용)

### 점진적 배포
1. 데이터베이스 스키마 변경
2. 백엔드 API 업데이트 (하위 호환성 유지)
3. 프론트엔드 UI 업데이트
4. 사용자 가이드 제공

## 9. 성공 지표

- 창고 생성 및 관리 기능 정상 동작
- 창고별 재고 조회 성능 유지
- 창고 간 이동 기능 정확성
- 기존 기능 호환성 100% 유지
- 사용자 만족도 향상

## 10. 제약사항

- 기존 재고 관리 워크플로우 변경 최소화
- 성능 저하 없이 창고 기능 추가
- 데이터 일관성 보장
- 단순하고 직관적인 UI 유지 