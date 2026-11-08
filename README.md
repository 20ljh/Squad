# Squad

대학 조별과제·캡스톤 팀의 회의를 자동으로 정리하고 시각화한 뒤, 팀 Notion 페이지로 내보내는 웹 서비스입니다. 단국대학교 소프트웨어학과 졸업작품.

- 기획 배경과 결정 기록: [`docs/background.md`](./docs/background.md)
- 화면 기준 스크린샷: [`docs/design/screens/`](./docs/design/screens/)

## 지금 실행해보기

```bash
cd apps/web
npm install
npm run dev
# http://localhost:3000  메인 (프로젝트 만들기 · 초대 코드로 참여 · 이 기기의 내 프로젝트)
```

화면(UI)을 하나씩 만들어 가는 중입니다. 지금은 메인 화면만 있고, 백엔드(DB, STT, 요약, Notion 내보내기)는 아직 없습니다.

## 검사

```bash
npm run typecheck
npm run lint
npm run build
npm run test:e2e   # 처음 한 번: npx playwright install chromium
```
