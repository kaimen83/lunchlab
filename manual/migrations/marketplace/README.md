# 런치랩 마켓플레이스 마이그레이션

## 개요

이 디렉토리에는 런치랩 마켓플레이스 모듈 시스템을 위한 데이터베이스 마이그레이션 파일이 포함되어 있습니다. 각 마이그레이션 파일은 Supabase PostgreSQL 데이터베이스에 실행할 수 있는 SQL 문을 포함하고 있습니다.

## 마이그레이션 파일 목록

1. **01_marketplace_modules.sql**: 마켓플레이스 모듈 기본 정보 테이블
2. **02_module_features.sql**: 모듈별 기능 정보 테이블
3. **03_company_modules.sql**: 회사-모듈 구독 관계 테이블
4. **04_module_settings.sql**: 회사별 모듈 설정 테이블
5. **05_module_permissions.sql**: 모듈 권한 및 역할별 권한 테이블
6. **06_module_menu_items.sql**: 모듈 메뉴 아이템 및 회사별 메뉴 설정 테이블
7. **07_module_data_integration.sql**: 모듈 간 데이터 연동을 위한 테이블

## 실행 방법

### Supabase 스튜디오에서 실행

1. Supabase 프로젝트 콘솔에 로그인
2. SQL 에디터 메뉴 선택
3. 각 마이그레이션 파일의 내용을 복사하여 에디터에 붙여넣기
4. 파일 번호 순서대로 실행

### 로컬 개발 환경에서 실행

1. Supabase CLI 설치
   ```bash
   npm install -g supabase
   ```

2. 로컬 개발 환경 설정
   ```bash
   supabase init
   ```

3. 마이그레이션 실행
   ```bash
   supabase db push
   ```

## 테이블 관계도

```
marketplace_modules
  ↑
  ├─ module_features
  │
  ├─ module_permissions ─── role_module_permissions
  │
  ├─ module_menu_items ─── company_menu_settings
  │
  ├─ company_modules
  │
  ├─ module_settings
  │
  └─ module_data_permissions
         └─ module_events
```

## RLS (Row Level Security) 정책

모든 테이블에는 적절한 RLS 정책이 설정되어 있습니다:

- 모든 사용자: 일반적으로 활성화된 모듈 정보 읽기 권한
- 회사 구성원: 자신이 속한 회사의 모듈 구독 및 설정 정보 읽기 권한
- 회사 관리자/소유자: 회사의 모듈 구독 및 설정 관리 권한
- 시스템 관리자: 전체 시스템 관리 권한

## 테이블 인덱스

성능 향상을 위해 각 테이블에는 적절한 인덱스가 설정되어 있습니다.

## 트리거

업데이트 시간 자동 갱신을 위한 트리거가 대부분의 테이블에 설정되어 있습니다. 