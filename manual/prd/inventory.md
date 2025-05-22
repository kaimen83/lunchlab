# 재고 관리 시스템 PRD (Product Requirements Document)

## 1. 개요

### 1.1 목적
LunchLab 재고 관리 시스템은 식자재와 용기의 재고를 효율적으로 관리하기 위한 솔루션입니다. 이 시스템은 입고, 출고, 폐기 작업을 추적하고, 실제 재고 수량을 시스템에 반영하여 정확한 재고 관리를 가능하게 합니다.

### 1.2 목표
- 식자재와 용기의 재고 현황을 실시간으로 파악
- 모든 재고 변동 사항(입고, 출고, 폐기)을 관리자/소유자 승인 후 기록
- 발주서와 연동하여 자동 출고 프로세스 지원
- 실사를 통한 재고 수량 보정 기능 제공

### 1.3 대상 사용자
- 회사 소유자/관리자: 재고 변동 승인 및 전체 재고 현황 모니터링
- 일반 사용자: 재고 조회 및 재고 변동 요청 생성

## 2. 기능 요구사항

### 2.1 재고 항목 관리

#### 2.1.1 재고 관리 대상 선정
- **식재료**: 재고 관리 등급이 "나"인 품목만 재고 관리 대상 (관리자나 소유자가 재고 관리 대상 그룹을 설정할 수 있음)
- **용기**: 모든 용기 항목이 재고 관리 대상

#### 2.1.2 재고 항목 조회
- 재고 항목 목록 표시: 품목명, 현재 수량, 단위, 마지막 업데이트 시간
- 필터링 기능: 식재료/용기 구분, 검색어 기반 필터링
- 정렬 기능: 품목명, 수량, 업데이트 시간 기준 정렬

### 2.2 재고 거래 관리

#### 2.2.1 거래 요청 생성
- **입고 요청**: 품목, 수량, 메모 입력하여 요청 생성
- **출고 요청**: 품목, 수량, 메모 입력하여 요청 생성
- **폐기 요청**: 품목, 수량, 메모 입력하여 요청 생성
- 모든 요청은 관리자/소유자의 승인 필요

#### 2.2.2 거래 승인 프로세스
- 관리자/소유자만 승인/거부 권한 보유
- 승인 시 실제 재고에 반영 및 거래 내역 생성
- 거부 시 요청 상태만 업데이트 (재고 변동 없음)

#### 2.2.3 거래 내역 조회
- 모든 거래 내역 표시: 날짜, 품목, 거래 유형, 수량, 사용자
- 필터링 기능: 거래 유형, 날짜 범위, 품목 기준 필터링
- 정렬 기능: 날짜, 품목, 수량 기준 정렬

### 2.3 발주서 연동 출고

#### 2.3.1 발주서 기반 출고 요청
- 발주서 탭의 발주서 목록에서 투입량, 필요 용기 목록 테이블의 필요 수량 기반 출고 요청 자동 생성
- 출고 요청에 발주서 참조 정보 포함

#### 2.3.2 발주서 출고 승인
- 관리자/소유자가 발주서 기반 출고 요청 검토 및 승인
- 승인 시 식재료 및 용기 일괄 출고 처리

### 2.4 재고 실사 및 보정

#### 2.4.1 재고 실사 수행
- 품목별 실제 재고 수량 입력 기능
- 시스템 예상 수량과 실제 수량 비교 표시
- 차이 자동 계산 및 표시

#### 2.4.2 수량 보정
- 실사 결과에 따른 재고 수량 자동 보정
- 보정 내역 기록 및 추적 가능
- 보정 사유 및 메모 입력 기능

## 3. 데이터 구조

### 3.1 테이블 설계

#### 3.1.1 stock_items (재고 항목)
- `id`: UUID (PK)
- `company_id`: UUID (FK to companies)
- `item_type`: ENUM ('ingredient', 'container')
- `item_id`: UUID (FK to ingredients 또는 containers)
- `current_quantity`: DECIMAL
- `unit`: VARCHAR
- `last_updated`: TIMESTAMP
- `created_at`: TIMESTAMP

#### 3.1.2 stock_transactions (재고 거래 내역)
- `id`: UUID (PK)
- `stock_item_id`: UUID (FK to stock_items)
- `transaction_type`: ENUM ('incoming', 'outgoing', 'disposal', 'adjustment')
- `quantity`: DECIMAL
- `transaction_date`: TIMESTAMP
- `user_id`: UUID
- `reference_id`: UUID (nullable)
- `reference_type`: VARCHAR (nullable)
- `notes`: TEXT
- `created_at`: TIMESTAMP

#### 3.1.3 stock_verifications (재고 실사)
- `id`: UUID (PK)
- `stock_item_id`: UUID (FK to stock_items)
- `expected_quantity`: DECIMAL
- `actual_quantity`: DECIMAL
- `adjustment_quantity`: DECIMAL
- `verification_date`: TIMESTAMP
- `verified_by`: UUID
- `notes`: TEXT
- `created_at`: TIMESTAMP

#### 3.1.4 stock_approval_requests (재고 승인 요청)
- `id`: UUID (PK)
- `company_id`: UUID (FK to companies)
- `request_type`: ENUM ('incoming', 'outgoing', 'disposal')
- `status`: ENUM ('pending', 'approved', 'rejected')
- `requested_by`: UUID
- `approved_by`: UUID (nullable)
- `requested_at`: TIMESTAMP
- `processed_at`: TIMESTAMP (nullable)
- `notes`: TEXT

#### 3.1.5 stock_approval_items (승인 요청 항목)
- `id`: UUID (PK)
- `approval_request_id`: UUID (FK to stock_approval_requests)
- `stock_item_id`: UUID (FK to stock_items)
- `quantity`: DECIMAL
- `notes`: TEXT

## 4. UI 컴포넌트

### 4.1 재고 관리 페이지 레이아웃
- 네비게이션 바에 "재고 관리" 탭 추가
- 페이지 내에 4개의 탭 구성:
  - 재고 항목 탭
  - 거래 내역 탭
  - 재고 실사 탭
  - 승인 요청 탭

### 4.2 재고 항목 탭
- 재고 항목 목록 표시
- 검색 및 필터링 컨트롤
- 항목별 입고/출고/폐기 버튼

### 4.3 거래 내역 탭
- 거래 내역 목록 표시
- 날짜 범위, 거래 유형 필터
- 거래 상세 정보 표시

### 4.4 재고 실사 탭
- 실사 수행 폼: 품목 선택, 실제 수량 입력
- 실사 내역 목록
- 일괄 실사 기능

### 4.5 승인 요청 탭
- 승인 대기 요청 목록
- 요청 상세 정보 표시
- 관리자/소유자용 승인/거부 버튼

### 4.6 거래 다이얼로그
- 거래 유형에 따른 입력 폼
- 수량 및 메모 입력 필드
- 제출/취소 버튼

## 5. API 엔드포인트

### 5.1 재고 항목 API
- `GET /api/companies/[id]/stock/items`: 재고 항목 목록 조회
- `GET /api/companies/[id]/stock/items/[itemId]`: 특정 재고 항목 상세 조회

### 5.2 거래 API
- `POST /api/companies/[id]/stock/transactions`: 거래 요청 생성
- `GET /api/companies/[id]/stock/transactions`: 거래 내역 목록 조회
- `GET /api/companies/[id]/stock/transactions/[transactionId]`: 특정 거래 상세 조회

### 5.3 실사 API
- `POST /api/companies/[id]/stock/verifications`: 재고 실사 기록 생성
- `GET /api/companies/[id]/stock/verifications`: 실사 내역 목록 조회

### 5.4 승인 API
- `GET /api/companies/[id]/stock/approvals`: 승인 요청 목록 조회
- `PATCH /api/companies/[id]/stock/approvals/[requestId]`: 승인 요청 처리(승인/거부)

## 6. 권한 관리

### 6.1 역할별 권한
- **일반 사용자**:
  - 재고 항목 조회
  - 입고/출고/폐기 요청 생성 (직접 처리 불가)
  - 재고 실사 수행
  - 자신이 생성한 요청 조회

- **관리자/소유자**:
  - 모든 일반 사용자 권한
  - 승인 요청 처리(승인/거부)
  - 모든 요청 및 거래 내역 조회
  - 재고 관리 설정 변경

### 6.2 권한 검증
- 각 API 엔드포인트에서 사용자 역할 확인
- 승인 관련 작업은 관리자/소유자 역할 검증 후 처리
- 회사 소속 여부 검증하여 타 회사 데이터 접근 방지

## 7. 구현 계획

### 7.1 데이터베이스 구축
1. 필요한 테이블 및 관계 생성
2. 초기 데이터 마이그레이션

### 7.2 백엔드 구현
1. API 엔드포인트 구현
2. 권한 검증 로직 구현
3. 데이터 처리 및 비즈니스 로직 구현

### 7.3 프론트엔드 구현
1. 재고 관리 페이지 및 탭 구조 구현
2. 재고 항목 목록 및 상세 화면 구현
3. 거래 요청 및 승인 기능 구현
4. 실사 및 보정 기능 구현

### 7.4 통합 및 테스트
1. 백엔드-프론트엔드 통합
2. 기능 테스트 및 버그 수정
3. 사용자 피드백 수집 및 반영

## 8. 확장 가능성

### 8.1 향후 기능 추가 고려사항
- 재고 예측 및 알림 기능
- 바코드/QR 코드 스캔을 통한 재고 관리
- 발주 자동화 및 최적화
- 재고 보고서 및 분석 기능
- 공급업체 관리 연동

## 9. 기술적 고려사항

### 9.1 성능 및 확장성
- 대량의 재고 항목 및 거래 내역 처리를 위한 페이지네이션
- 실시간 업데이트를 위한 효율적인 쿼리 최적화
- 동시 접근 시 데이터 일관성 유지

### 9.2 보안
- 모든 API 요청에 대한 권한 검증
- 민감한 재고 데이터 보호
- 작업 이력 및 감사 추적 기능
