# Asiary 여행 장소 웹사이트

모바일 목록형 여행 장소 웹사이트. GitHub Pages + Google Sheets CSV + GitHub Actions로 무료 한도 내 운영합니다.

## 1. 로컬 미리보기

프로젝트 폴더에서 `python -m http.server 8000` 실행 후 `http://localhost:8000` 접속. `index.html`을 파일로 직접 열면 JSON fetch가 차단될 수 있습니다.

## 2. Google Sheets 만들기

1. 새 Google 스프레드시트를 만들고 `sample-places.csv`의 헤더를 첫 행에 붙여넣습니다.
2. 열 이름을 정확히 유지하세요: `id,city,area,category,name,local_name,address,map_url,blog_url,description,source,status`
3. `id`는 고유 값, `name`과 `city`는 필수. `source`는 `visited`, `researched`, `heard`, `unverified` 중 하나. `status`는 `public` 또는 `공개`일 때만 사이트에 표시됩니다. 나머지는 제외됩니다.
4. **중요: 공개용 시트에는 공개해도 되는 정보만 입력하세요.** Google Sheets의 '웹에 게시'는 문서/탭의 정보가 공개될 수 있습니다. 개인 메모, 미공개 계획, 개인정보를 넣지 마세요. 비공개 작업 시트와 공개 전용 스프레드시트를 분리하는 것을 권장합니다.
5. 파일 → 공유 → 웹에 게시 → **해당 시트 탭** 선택 → **CSV** 선택 → 게시. 생성된 `https://docs.google.com/spreadsheets/...` CSV 링크를 복사합니다. 계정/화면에 따라 메뉴명이 다를 수 있습니다.

## 3. GitHub Pages 배포

1. GitHub에서 **Public** 저장소를 새로 만들고 이 프로젝트의 **내용물**(숨김 `.github` 폴더 포함)을 저장소 루트에 업로드합니다.
2. Settings → Pages → Build and deployment → Source: **Deploy from a branch**, Branch: `main`, Folder: `/ (root)` → Save.
3. 공개 주소는 일반적으로 `https://사용자명.github.io/저장소명/`입니다. 배포까지 몇 분 걸릴 수 있습니다.
4. Settings → Secrets and variables → Actions → New repository secret → Name: `SHEET_CSV_URL`, Value: 위에서 복사한 CSV 링크.
5. Actions → **Sync Google Sheet** → Run workflow를 눌러 최초 동기화를 실행합니다. 이후 매시 17분·47분(UTC 기준)에 예약 실행됩니다. 예약 실행은 지연되거나 비활성화될 수 있으므로 정확한 반영 시각을 보장하지 않습니다.
6. 동기화가 성공하면 `data/places.json`이 자동 커밋되고 GitHub Pages가 새 내용을 배포합니다. 페이지 캐시 때문에 반영에 시간이 더 걸릴 수 있습니다.

## 4. 운영 팁

- 장소 추가: 공개용 시트에 새 행 입력, `status=public` 설정.
- 장소 숨김: `status=draft` 등으로 변경.
- 장소 삭제: 행 삭제. 단, 공개 장소가 0개가 되면 실수 방지를 위해 동기화가 중단됩니다.
- 지도 버튼: `map_url`에 직접 확인한 Google Maps/고덕지도 URL을 입력해야 표시됩니다. 링크가 비어 있으면 버튼도 표시되지 않습니다.
- 후기 버튼: `blog_url`을 입력한 장소에만 표시됩니다.
- 시트 게시 URL은 비밀 인증 수단이 아닙니다. GitHub Actions Secret에 넣어도 게시된 데이터 자체는 공개로 취급해야 합니다.
- 공개 저장소에는 API 비밀키나 개인정보를 올리지 마세요.
- 백업: 스프레드시트를 주기적으로 CSV로 내려받고, GitHub의 변경 이력을 활용하세요.

## 5. 폴더 구조

- `index.html`: 방문자 페이지
- `assets/style.css`: 모바일 디자인
- `assets/app.js`: 검색·필터·주소 복사·링크
- `data/places.json`: 웹사이트가 읽는 공개 데이터
- `scripts/sync_sheet.py`: CSV 검증 및 JSON 생성
- `.github/workflows/sync-sheet.yml`: 자동 갱신
- `sample-places.csv`: 입력 템플릿

## 주의

- 첫 배포에는 확인된 정보만 넣으세요. 포함된 2개 장소는 **예시**이며 지도·블로그 링크는 비워두었습니다.
- 자동 동기화는 GitHub Actions 및 Pages 사용 가능 여부, 저장소 설정, Google 게시 기능에 의존합니다.
- 외부 지도 서비스는 실제 URL을 제공해야 하며, 앱 자체에 지도 API 키는 필요하지 않습니다.
