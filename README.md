# Squad

대학 조별과제·캡스톤 팀의 회의를 자동으로 정리하고 시각화한 뒤, 팀 Notion 페이지로 내보내는 웹 서비스입니다. 단국대학교 소프트웨어학과 졸업작품.

- 기획 배경과 결정 기록: [`docs/background.md`](./docs/background.md)
- 화면 기준 스크린샷: [`docs/design/screens/`](./docs/design/screens/)

## 지금 실행해보기

Docker Desktop(또는 Docker)이 켜져 있어야 합니다.

```bash
cd apps/web
cp ../../.env.example .env   # 처음 한 번
npm install
npm run db:up        # PostgreSQL 컨테이너 실행 (docker-compose.yml)
npm run db:migrate   # 테이블 만들기
npm run db:seed      # 예시 데이터 넣기
npm run dev
# http://localhost:3000                          메인 (프로젝트 만들기 · 초대 코드로 참여 · 내 프로젝트)
# http://localhost:3000/projects/new             프로젝트 만들기
# http://localhost:3000/p/sample                 프로젝트 메인 · 팀 대시보드 (예시 데이터)
# http://localhost:3000/p/sample/meetings/m3     회의 결과 (DB의 예시 회의)
# http://localhost:3000/p/rec-test/meetings/stt-test   실제 회의 녹음의 받아쓰기·요약 시험 결과
```

회의 결과는 DB(PostgreSQL + Prisma)에서 읽고, 대시보드는 아직 예시 데이터입니다. 로그인, 음성 업로드, Notion 내보내기는 만드는 중입니다.

## 검사

```bash
npm run typecheck
npm run lint
npm run build
npm run test:e2e   # DB가 켜져 있어야 함. 처음 한 번: npx playwright install chromium
```
