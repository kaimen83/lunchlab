# 재고관리 시스템 PRD (Product Requirements Document)

## 1. 개요

### 1.1 목적
본 문서는 LunchLab의 재고관리 시스템에 대한 요구사항과 기능을 정의합니다. 이 시스템은 식당 운영에 필요한 식재료와 용기의 재고를 효율적으로 관리하기 위한 것입니다.

### 1.2 범위
이 시스템은 다음을 포함합니다:
- 기존 등록된 식재료 및 용기의 재고 관리
- 입출고 관리
- 재고 알림 시스템
- 조리계획서와의 연동
- 재고 보고서 및 분석

### 1.3 용어 정의
- **재고 항목**: 기존 시스템에 등록된 식재료 또는 용기
- **트랜잭션**: 재고 변화를 기록하는 입고, 출고, 재고조정 등의 활동
- **최소 재고량**: 재고 알림이 발생하는 기준점
- **조리계획서**: 특정 날짜에 제공될 메뉴와 식수 정보를 담은 문서

## 2. 시스템 아키텍처

### 2.1 데이터베이스 구조

#### 2.1.1 재고 관리 테이블
```
- ingredient_inventory
  - id (PK)
  - company_id (FK)
  - ingredient_id (FK) - 기존 ingredients 테이블 참조
  - current_stock (decimal)
  - minimum_stock (decimal)
  - unit (varchar)
  - created_at (timestamp)
  - updated_at (timestamp)

- container_inventory
  - id (PK)
  - company_id (FK)
  - container_id (FK) - 기존 containers 테이블 참조
  - current_stock (integer)
  - minimum_stock (integer)
  - created_at (timestamp)
  - updated_at (timestamp)
```

#### 2.1.2 트랜잭션 관리 테이블
```
- ingredient_transactions
  - id (PK)
  - company_id (FK)
  - ingredient_id (FK) - 기존 ingredients 테이블 참조
  - transaction_type (enum: 'in', 'out', 'adjust')
  - quantity (decimal)
  - unit (varchar)
  - transaction_date (date)
  - notes (text)
  - user_id (FK)
  - created_at (timestamp)
  - expiry_date (date, nullable)
  - lot_number (varchar, nullable)
  - reference_id (varchar, nullable) - 연관 문서 ID (조리계획서 등)

- container_transactions
  - id (PK)
  - company_id (FK)
  - container_id (FK) - 기존 containers 테이블 참조
  - transaction_type (enum: 'in', 'out', 'adjust')
  - quantity (integer)
  - transaction_date (date)
  - notes (text)
  - user_id (FK)
  - created_at (timestamp)
  - reference_id (varchar, nullable) - 연관 문서 ID (조리계획서 등)
```

#### 2.1.3 유통기한 관리 테이블
```
- expiry_tracking
  - id (PK)
  - company_id (FK)
  - ingredient_id (FK) - 기존 ingredients 테이블 참조
  - transaction_id (FK)
  - batch_identifier (varchar)
  - quantity (decimal)
  - expiry_date (date)
  - remaining_quantity (decimal)
  - status (enum: 'active', 'consumed', 'expired', 'discarded')
  - created_at (timestamp)
  - updated_at (timestamp)
```

#### 2.1.4 재고 실사 관리 테이블
```
- inventory_audits
  - id (PK)
  - company_id (FK)
  - audit_name (varchar)
  - scheduled_date (date)
  - completed_date (date, nullable)
  - status (enum: 'planned', 'in_progress', 'completed', 'cancelled')
  - notes (text)
  - created_by (FK - user_id)
  - created_at (timestamp)
  - updated_at (timestamp)

- inventory_audit_items
  - id (PK)
  - audit_id (FK)
  - company_id (FK)
  - item_type (enum: 'ingredient', 'container')
  - item_id (FK - 아이템 타입에 따라 ingredient_id 또는 container_id)
  - expected_quantity (decimal)
  - actual_quantity (decimal, nullable)
  - unit (varchar)
  - variance (decimal, nullable)
  - variance_percentage (decimal, nullable)
  - status (enum: 'pending', 'counted', 'reconciled')
  - notes (text)
  - counted_by (FK - user_id, nullable)
  - counted_at (timestamp, nullable)

- inventory_audit_reconciliations
  - id (PK)
  - audit_id (FK)
  - company_id (FK)
  - item_type (enum: 'ingredient', 'container')
  - item_id (FK)
  - previous_quantity (decimal)
  - new_quantity (decimal)
  - adjustment_quantity (decimal)
  - reason (text)
  - transaction_id (FK - 생성된 트랜잭션 참조)
  - reconciled_by (FK - user_id)
  - reconciled_at (timestamp)
```

### 2.2 API 구조

#### 2.2.1 재고 관리 API
- `GET /api/companies/{companyId}/inventory/ingredients` - 모든 식재료 재고 조회
- `GET /api/companies/{companyId}/inventory/ingredients/{ingredientId}` - 특정 식재료 재고 조회
- `POST /api/companies/{companyId}/inventory/ingredients` - 식재료 재고 항목 생성
- `PUT /api/companies/{companyId}/inventory/ingredients/{ingredientId}` - 식재료 재고 정보 업데이트
- `DELETE /api/companies/{companyId}/inventory/ingredients/{ingredientId}` - 식재료 재고 항목 삭제

#### 2.2.2 용기 관리 API
- `GET /api/companies/{companyId}/inventory/containers` - 모든 용기 재고 조회
- `GET /api/companies/{companyId}/inventory/containers/{containerId}` - 특정 용기 재고 조회
- `POST /api/companies/{companyId}/inventory/containers` - 용기 재고 항목 생성
- `PUT /api/companies/{companyId}/inventory/containers/{containerId}` - 용기 재고 정보 업데이트
- `DELETE /api/companies/{companyId}/inventory/containers/{containerId}` - 용기 재고 항목 삭제

#### 2.2.3 트랜잭션 관리 API
- `GET /api/companies/{companyId}/inventory/ingredients/transactions` - 식재료 트랜잭션 내역 조회
- `GET /api/companies/{companyId}/inventory/containers/transactions` - 용기 트랜잭션 내역 조회
- `POST /api/companies/{companyId}/inventory/ingredients/transactions` - 식재료 트랜잭션 생성
- `POST /api/companies/{companyId}/inventory/containers/transactions` - 용기 트랜잭션 생성

#### 2.2.4 기타 API
- `GET /api/companies/{companyId}/inventory/dashboard` - 재고 대시보드 데이터
- `GET /api/companies/{companyId}/inventory/low-stock` - 재고 부족 항목 조회
- `GET /api/companies/{companyId}/inventory/expiring` - 유통기한 임박 항목 조회
- `POST /api/companies/{companyId}/inventory/batch-transactions` - 대량 트랜잭션 처리
- `GET /api/companies/{companyId}/inventory/reports` - 재고 보고서 생성

#### 2.2.5 재고 실사 API
- `GET /api/companies/{companyId}/inventory/audits` - 재고 실사 내역 조회
- `POST /api/companies/{companyId}/inventory/audits` - 새 재고 실사 계획 생성
- `GET /api/companies/{companyId}/inventory/audits/{auditId}` - 특정 실사 상세 조회
- `PUT /api/companies/{companyId}/inventory/audits/{auditId}` - 실사 정보 업데이트
- `POST /api/companies/{companyId}/inventory/audits/{auditId}/items` - 실사 항목 추가
- `GET /api/companies/{companyId}/inventory/audits/{auditId}/items` - 실사 항목 조회
- `PUT /api/companies/{companyId}/inventory/audits/{auditId}/items/{itemId}` - 실사 항목 결과 업데이트
- `POST /api/companies/{companyId}/inventory/audits/{auditId}/reconcile` - 실사 결과에 따른 재고 보정
- `GET /api/companies/{companyId}/inventory/audits/analytics` - 실사 분석 데이터 조회

## 3. 기능 요구사항

### 3.1 재고 관리 기본 기능

#### 3.1.1 재고 항목 관리
- 사용자는 기존에 등록된 식재료 및 용기에 대한 재고 정보를 생성, 조회, 수정, 삭제할 수 있어야 함
- 각 재고 항목에는 현재 재고량, 최소 재고량, 단위(식재료의 경우) 정보가 포함되어야 함
- 시스템은 새로운 식재료나 용기가 추가될 때 자동으로 재고 항목을 생성할 수 있어야 함

#### 3.1.2 재고 트랜잭션 관리
- 사용자는 입고, 출고, 재고 조정 트랜잭션을 기록할 수 있어야 함
- 각 트랜잭션에는 날짜, 수량, 단위(식재료의 경우), 메모, 담당자 정보가 포함되어야 함
- 식재료 입고 시 유통기한 정보를 기록할 수 있어야 함
- 트랜잭션 기록 시 자동으로 현재 재고량이 업데이트되어야 함

#### 3.1.3 재고 검색 및 필터링
- 사용자는 이름, 코드, 카테고리, 재고 상태 등으로 재고 항목을 검색하고 필터링할 수 있어야 함
- 테이블과 카드 형식의 다양한 뷰 옵션을 제공해야 함
- 정렬 기능을 통해 다양한 기준으로 재고 목록을 정렬할 수 있어야 함

### 3.2 유통기한 관리

#### 3.2.1 유통기한 추적
- 식재료 입고 시 유통기한 정보를 기록하고 추적할 수 있어야 함
- FIFO(First In, First Out) 방식으로 재고 소비를 관리할 수 있어야 함
- 유통기한별 재고 상태를 조회할 수 있어야 함

#### 3.2.2 유통기한 알림
- 유통기한이 임박한 식재료에 대한 알림을 제공해야 함
- 사용자는 알림 기준(예: 3일 전, 1주일 전)을 설정할 수 있어야 함
- 유통기한 경과 식재료를 자동으로 감지하고 표시해야 함

### 3.3 재고 알림 시스템

#### 3.3.1 재고 부족 알림
- 재고량이 최소 재고량 이하로 떨어질 경우 알림을 제공해야 함
- 알림은 대시보드와 이메일을 통해 전달될 수 있어야 함
- 사용자는 알림 기준을 설정할 수 있어야 함

#### 3.3.2 재고 과잉 알림
- 일정 기간 동안 사용되지 않는 과잉 재고에 대한 알림을 제공해야 함
- 사용자는 과잉 재고 기준(예: 예상 사용량의 150% 이상)을 설정할 수 있어야 함

### 3.4 조리계획서 연동

#### 3.4.1 자동 재고 계산
- 조리계획서 정보를 기반으로 필요한 식재료('투입량')와 용기('필요 수량') 수량을 자동으로 계산해야 함
- 현재 재고와 비교하여 부족한 항목을 식별해야 함
- 조리계획서에서 직접 출고 처리를 할 수 있어야 함

#### 3.4.2 자동 출고 처리
- 조리계획서 확정 시 필요한 식재료와 용기를 자동으로 출고 처리할 수 있는 옵션을 제공해야 함
- 출고 처리 전 확인 단계를 포함해야 함
- 출고 후 실제 사용량과의 차이를 조정할 수 있는 기능을 제공해야 함

### 3.5 보고서 및 분석

#### 3.5.1 재고 보고서
- 현재 재고 상태 보고서
- 트랜잭션 내역 보고서
- 재고 변동 추이 보고서
- 유통기한 관리 보고서

#### 3.5.2 재고 분석
- 재고 회전율 분석
- 재고 비용 분석
- 낭비/손실 분석
- 사용 패턴 분석

### 3.6 재고 실사 관리

#### 3.6.1 정기 재고 실사
- 정기적(주간, 월간, 분기별 등)으로 실제 재고량을 조사하여 시스템에 기록할 수 있어야 함
- 실사 일정을 설정하고 알림을 받을 수 있어야 함
- 실사 담당자를 지정할 수 있어야 함
- 실사 결과를 CSV나 엑셀 형식으로 내보내거나 가져올 수 있어야 함

#### 3.6.2 재고 보정 기능
- 실사 결과와 시스템 재고량의 차이를 비교하여 표시해야 함
- 차이가 있는 항목에 대해 일괄 보정 또는 개별 보정을 수행할 수 있어야 함
- 보정 사유를 입력하고 기록할 수 있어야 함
- 보정 내역은 별도의 트랜잭션('adjust' 유형)으로 기록되어야 함

#### 3.6.3 재고 실사 이력 관리
- 과거 실사 기록을 조회하고 분석할 수 있어야 함
- 실사별 차이 분석 보고서를 생성할 수 있어야 함
- 반복적으로 차이가 발생하는 항목을 식별하여 관리 개선에 활용할 수 있어야 함

#### 3.6.4 재고 불일치 원인 분석
- 시스템은 재고 불일치 패턴을 분석하고 가능한 원인을 제안해야 함
- 불일치가 자주 발생하는 항목에 대한 특별 관리 기능을 제공해야 함
- 재고 관리 프로세스 개선을 위한 인사이트를 제공해야 함

## 4. 사용자 인터페이스 요구사항

### 4.1 네비게이션 구조
- 좌측 네비게이션 바에 "재고 관리" 메뉴 추가
- 하위 메뉴: 대시보드, 식재료 재고, 용기 재고, 트랜잭션 내역, 보고서

### 4.2 대시보드 페이지
- 재고 요약 정보
- 재고 부족 항목 알림
- 유통기한 임박 항목 알림
- 최근 트랜잭션 내역
- 빠른 액션 버튼 (입고, 출고, 재고 조정)

### 4.3 재고 목록 페이지
- 테이블/카드 뷰 전환 옵션
- 검색 및 필터링 컨트롤
- 정렬 옵션
- 항목별 액션 버튼 (상세보기, 입고, 출고, 조정)
- 상태별 시각적 표시 (정상, 부족, 과잉)

### 4.4 재고 상세 페이지
- 재고 항목 기본 정보
- 현재 재고 상태 시각화
- 트랜잭션 히스토리
- 재고 추이 그래프
- 연관 메뉴/조리계획서 목록

### 4.5 트랜잭션 입력 모달
- 트랜잭션 유형 선택 (입고, 출고, 조정)
- 수량 및 단위 입력
- 날짜 선택
- 유통기한 입력 (식재료 입고 시)
- 메모 입력
- 다중 항목 트랜잭션 옵션

### 4.6 재고 실사 인터페이스

#### 4.6.1 실사 계획 페이지
- 실사 일정 설정 및 관리
- 담당자 지정 기능
- 실사 대상 항목 선택 (전체, 카테고리별, 개별 항목)
- 과거 실사 내역 조회

#### 4.6.2 재고 실사 수행 페이지
- 모바일 친화적인 입력 인터페이스
- 바코드/QR 코드 스캔 지원 (가능한 경우)
- 실측 수량 입력 폼
- 현재 시스템 재고량 표시
- 메모 및 특이사항 입력 필드

#### 4.6.3 재고 보정 페이지
- 실사 결과와 시스템 재고의 차이 표시
- 색상 코드를 통한 차이 심각도 표시 (예: 빨간색=심각한 차이, 노란색=경미한 차이)
- 일괄 보정 및 개별 보정 옵션
- 보정 사유 입력 필드
- 보정 내역 미리보기 및 확인

#### 4.6.4 실사 분석 대시보드
- 실사 결과 요약 시각화
- 시간에 따른 재고 정확도 추이 그래프
- 가장 빈번하게 차이가 발생하는 항목 순위
- 재고 관리 개선을 위한 제안 표시

## 5. 비기능적 요구사항

### 5.1 성능 요구사항
- 페이지 로딩 시간: 3초 이내
- 트랜잭션 처리 시간: 1초 이내
- 동시 사용자 지원: 최소 50명
- 트랜잭션 기록 저장: 최소 5년간

### 5.2 보안 요구사항
- 역할 기반 접근 제어 (RBAC)
- 트랜잭션 기록의 무결성 보장
- 중요 재고 변경에 대한 감사 추적
- 데이터 백업 및 복구 계획

### 5.3 확장성 요구사항
- 다양한 식재료 및 용기 유형 지원
- 향후 다중 지점/매장 지원 가능성
- 외부 시스템 (POS, 발주 시스템 등)과의 통합 가능성

### 5.4 사용성 요구사항
- 직관적인 사용자 인터페이스
- 모바일 장치에서의 사용성 보장
- 사용자 가이드 및 도움말 제공
- 오류 메시지의 명확성

## 6. 구현 계획

### 6.1 단계별 구현 계획

#### 6.1.1 1단계: 데이터베이스 및 기본 API 구현 (1-2주)
- 데이터베이스 스키마 설계 및 마이그레이션 생성
- 기본 CRUD API 엔드포인트 구현
- 기존 식재료/용기 관리 시스템과의 연동 설정

#### 6.1.2 2단계: 기본 UI 구현 (2-3주)
- 네비게이션 구조 업데이트
- 재고 대시보드 페이지 구현
- 재고 목록 페이지 구현
- 재고 상세 페이지 구현
- 트랜잭션 입력 모달 구현

#### 6.1.3 3단계: 고급 기능 구현 (2-3주)
- 유통기한 관리 기능
- 재고 알림 시스템
- 조리계획서 연동
- 재고 실사 기본 기능 구현 (실사 계획, 수행, 보정)

#### 6.1.4 4단계: 보고서 및 분석 기능 (2-3주)
- 재고 보고서 생성
- 재고 분석 기능
- 데이터 시각화
- 재고 실사 분석 대시보드 구현

#### 6.1.5 5단계: 최적화 및 테스트 (1-2주)
- 성능 최적화
- 사용자 테스트
- 피드백 반영
- 문서화

### 6.2 필요 리소스
- 프론트엔드 개발자: 1-2명
- 백엔드 개발자: 1-2명
- UI/UX 디자이너: 1명
- QA 엔지니어: 1명
- 프로젝트 관리자: 1명

### 6.3 기술 스택
- 프론트엔드: Next.js, React, Tailwind CSS, ShadCN
- 백엔드: Next.js API Routes
- 데이터베이스: Supabase
- 상태 관리: React Context API / Zustand
- 차트 및 시각화: Chart.js / Recharts
- 인증: Clerk

## 7. 테스트 계획

### 7.1 단위 테스트
- 재고 계산 로직 테스트
- 트랜잭션 처리 로직 테스트
- 유통기한 관리 로직 테스트

### 7.2 통합 테스트
- API 엔드포인트 테스트
- 데이터베이스 상호작용 테스트
- 조리계획서 연동 테스트

### 7.3 사용자 테스트
- 사용자 인터페이스 테스트
- 사용성 테스트
- 성능 테스트

## 8. 배포 및 유지보수 계획

### 8.1 배포 전략
- 단계적 롤아웃
- 베타 테스트 기간 운영
- 사용자 교육 및 가이드 제공

### 8.2 유지보수 계획
- 정기적인 기능 업데이트
- 버그 수정 및 개선
- 사용자 피드백 수집 및 반영
- 성능 모니터링 및 최적화

## 9. 위험 요소 및 대응 방안

### 9.1 식별된 위험 요소
- 데이터 마이그레이션 복잡성
- 사용자 적응 기간
- 성능 이슈 (대량 트랜잭션 처리)
- 기존 시스템과의 통합 문제

### 9.2 대응 방안
- 상세한 마이그레이션 계획 수립
- 충분한 사용자 교육 및 가이드 제공
- 성능 테스트 및 최적화
- 단계적 통합 접근 방식

## 10. 성공 기준

### 10.1 정량적 기준
- 재고 부족으로 인한 운영 중단 사례 50% 감소
- 유통기한 경과로 인한 폐기 비용 30% 감소
- 재고 관리 시간 40% 절감
- 사용자 만족도 80% 이상 달성

### 10.2 정성적 기준
- 재고 가시성 향상
- 의사결정 프로세스 개선
- 조리계획 및 메뉴 관리와의 원활한 통합
- 사용자 경험 향상 