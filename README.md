# 가계부 💰

심플한 한국어 가계부 웹앱입니다. 별도 서버나 설치 없이 브라우저만으로 동작합니다.

## 미리보기

- 수입 / 지출 내역 기록 및 수정
- 주간 / 월간 / 직접 기간 설정 필터
- 카테고리별 통계 차트
- 결제 수단(현금 / 카드) 분류 및 카드별 합계
- 데이터는 브라우저 `localStorage`에 자동 저장

## 실행 방법

### 방법 1 — 파일 직접 열기

```
index.html 파일을 브라우저로 열면 바로 실행됩니다.
```

### 방법 2 — 로컬 서버로 실행 (권장)

```bash
# Python 3
python -m http.server 3000

# Node.js (npx)
npx serve .
```

브라우저에서 `http://localhost:3000` 접속

### 방법 3 — GitHub Pages 배포

1. 이 저장소를 Fork 하거나 본인 계정에 Push
2. GitHub 저장소 → Settings → Pages
3. Source: `main` 브랜치, `/ (root)` 폴더 선택
4. 저장 후 `https://<username>.github.io/<repo>` 로 접속

## 카테고리

**지출** — 식료품비, 외식비, 화장품+잡화, 생필품, 구독, 교통비, 유흥, 선물, 기타 비용

**수입** — 아르바이트, 금융/체크할인, 생활비, 구독비, 기타 수입

## 파일 구조

```
budget-app/
├── index.html   # 레이아웃 및 마크업
├── style.css    # 스타일시트
├── app.js       # 데이터 로직 및 렌더링
└── README.md
```

## 데이터 저장

모든 데이터는 브라우저의 `localStorage`에 저장됩니다.  
다른 기기에서 데이터를 공유하려면 브라우저의 내보내기/동기화 기능을 사용하거나,  
별도 백엔드(예: Firebase, Supabase)를 `app.js`의 `loadFromStorage` / `saveToStorage` 함수에 연결하세요.

## 라이선스

MIT
