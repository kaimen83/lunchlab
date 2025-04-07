# 런치랩 API 문서화

## 개요

이 디렉토리에는 런치랩 서비스의 API에 대한 문서가 포함되어 있습니다. 문서는 마크다운 형식으로 작성되어 있으며, API 엔드포인트의 상세 정보와 사용 방법을 제공합니다.

## 디렉토리 구조

```
docs/
├── README.md                 # 현재 파일
└── api/                      # API 문서 디렉토리
    ├── index.md              # API 문서 메인 인덱스
    ├── marketplace-modules.md # 마켓플레이스 모듈 API 문서
    ├── company-modules.md    # 회사별 모듈 API 문서
    ├── testing.md            # API 테스트 가이드
    └── test_api.sh           # API 테스트 스크립트
```

## 문서 사용 방법

1. **API 탐색**: `api/index.md` 파일에서 시작하여 전체 API 목록을 확인할 수 있습니다.
2. **상세 API 정보**: 각 API의 상세 정보는 해당 카테고리의 마크다운 파일에서 확인할 수 있습니다.
3. **API 테스트**: `api/testing.md` 파일을 참고하여 API를 테스트하는 방법을 확인할 수 있습니다.

## API 테스트 스크립트 실행

API 테스트 스크립트를 실행하려면:

1. 스크립트에 실행 권한을 부여합니다:
   ```bash
   chmod +x docs/api/test_api.sh
   ```

2. 환경 변수를 설정합니다. 스크립트를 열어 다음 변수를 실제 값으로 업데이트합니다:
   ```bash
   BASE_URL="http://localhost:3000"
   AUTH_TOKEN="YOUR_AUTH_TOKEN"
   COMPANY_ID="your-company-id"
   MODULE_ID="your-module-id"
   ```

3. 스크립트를 실행합니다:
   ```bash
   ./docs/api/test_api.sh
   ```

## 문서 업데이트

API에 변경 사항이 있을 경우 해당 문서도 업데이트해야 합니다:

1. 새 API 엔드포인트가 추가되면 관련 카테고리 문서에 해당 정보를 추가합니다.
2. API 동작이 변경되면 관련 설명과 예제를 업데이트합니다.
3. 테스트 스크립트에도 새 API에 대한 테스트를 추가합니다.

## API 버전 관리

현재 API 버전은 v1입니다. API에 중요한 변경이 있을 때마다 문서에 변경 내역을 기록하고 필요한 경우 새 버전 문서를 생성합니다. 