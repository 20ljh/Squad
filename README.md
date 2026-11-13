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

구글 로그인 후 프로젝트를 만들고 팀원을 초대해, 회의 녹음을 올리면 받아쓰기·화자 확인·요약을 거쳐 결과 페이지가 만들어집니다. 결과는 Notion으로 내보내거나 Markdown으로 복사할 수 있습니다. 예시 프로젝트(`/p/sample`)는 로그인 없이 볼 수 있습니다.

## 받아쓰기 워커 (STT)

회의 녹음을 받아쓰고 화자를 나누고, 화자 확인이 끝난 회의를 Claude로 요약하는 Python 워커입니다. NVIDIA GPU가 있는 PC에서 실행하고, 웹 API로 작업을 가져갑니다.

```bash
# 처음 한 번 (squad 폴더에서): 설치 방법은 workers/stt/requirements.txt 맨 위 참고
# apps/web/.env 에 HF_TOKEN, ANTHROPIC_API_KEY, WORKER_TOKEN(웹과 같은 값) 필요, ffmpeg 필요
workers/stt/.venv/Scripts/python workers/stt/worker.py                       # 같은 PC의 웹(localhost:3000)
workers/stt/.venv/Scripts/python workers/stt/worker.py --web https://웹주소    # 다른 곳의 웹
```

회의 페이지에서 녹음을 올리면 워커가 가져가 받아쓴 문장을 실시간으로 보여 주고, 끝나면 "화자 확인" 단계로 넘어갑니다. 화자를 확정하면 같은 워커가 요약을 만들어 올립니다(웹 서버는 Claude를 직접 부르지 않음).

## 배포 (Azure VM + Docker Compose)

웹·DB·Nginx(HTTPS)를 VM 한 대에 Docker Compose로 올립니다. 설정 파일은 `infra/`에 있고, 같은 파일로 다른 VM에도 올릴 수 있습니다. 받아쓰기 워커는 GPU가 있는 PC에서 `--web https://배포주소`로 붙습니다.

```bash
# 처음 한 번: VM에 infra/env.prod.example 을 참고해 /opt/squad/.env 를 만들고
bash infra/deploy.sh                       # 이 PC에서 이미지를 빌드해 VM으로 보내고 다시 띄움
ssh <VM> 'sh /opt/squad/init-letsencrypt.sh'   # 처음 한 번 HTTPS 인증서 발급
bash infra/deploy.sh --config              # 설정 파일만 다시 올릴 때
```

로그인은 구글 계정으로만 합니다. 구글 OAuth 클라이언트와 Notion 공개 연동의 리디렉션 주소는 `{APP_URL}/api/auth/google/callback`, `{APP_URL}/api/notion/callback`입니다.

## 검사

```bash
npm run typecheck
npm run lint
npm run build
npm run test:e2e   # DB가 켜져 있어야 함. 처음 한 번: npx playwright install chromium
```
