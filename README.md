# Chess Site

온라인 체스 게임 웹사이트입니다.

## 프로젝트 구조

```
chess-site/
├── src/
│   ├── config/              # 설정 파일
│   │   └── env.js          # 환경 변수 설정
│   ├── controllers/         # 요청 핸들러
│   │   └── room.controller.js
│   ├── middleware/          # 미들웨어
│   │   ├── errorHandler.js  # 에러 처리
│   │   └── requestLogger.js # 요청 로깅
│   ├── routes/              # 라우트 정의
│   │   └── index.js        # API 라우트
│   ├── services/            # 비즈니스 로직
│   │   ├── lobby.service.js
│   │   └── room.service.js
│   ├── utils/               # 유틸리티
│   │   └── logger.js        # 로깅 시스템
│   ├── ws/                  # WebSocket
│   │   ├── server.js        # WebSocket 서버
│   │   └── eventHandlers.js # 이벤트 핸들러
│   └── app.js              # 메인 애플리케이션
├── public/                  # 정적 파일
│   ├── lobby.html
│   └── room.html
├── package.json
└── .env.example            # 환경 변수 예제
```

## 설치

```bash
# 의존성 설치
npm install

# .env 파일 생성
cp .env.example .env
```

## 실행

```bash
# 개발 모드
npm run start:dev

# 프로덕션 모드
npm run start
```

## 환경 변수

`.env` 파일에 다음을 설정할 수 있습니다:

```
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug
```

## 기능

- **로비**: 플레이어 매칭 시스템
- **방**: 실시간 체스 게임
- **WebSocket**: 실시간 통신

## 개선 사항

### 리팩터링 완료

1. ✅ **프로젝트 구조 개선**

   - 계층별 분리 (config, controllers, services, middleware, utils, ws, routes)
   - 관심사 분리

2. ✅ **에러 처리**

   - 글로벌 에러 핸들러 미들웨어
   - 구조화된 에러 응답

3. ✅ **환경 설정**

   - dotenv를 통한 환경 변수 관리
   - config 파일 중앙화

4. ✅ **로깅 시스템**

   - 구조화된 로거 유틸리티
   - 요청 로깅 미들웨어
   - 컬러 코드된 콘솔 출력

5. ✅ **WebSocket 개선**

   - 네임스페이스 기반 이벤트 핸들러 분리
   - 이벤트 핸들러 모듈화
   - 에러 처리 추가

6. ✅ **미들웨어**
   - 요청 로깅
   - 에러 핸들링
   - CORS 지원

## API 엔드포인트

- `GET /health` - 헬스 체크

## WebSocket 이벤트

### 기본 네임스페이스

- `connection` - 클라이언트 연결
- `disconnect` - 클라이언트 연결 해제

### Lobby 네임스페이스 (`/lobby`)

- `join_lobby` - 로비 참가
- `leave_lobby` - 로비 퇴장
- `player_joined` - 플레이어 참가 알림
- `player_left` - 플레이어 퇴장 알림

### Room 네임스페이스 (`/room`)

- `join_room` - 방 참가
- `move` - 체스 이동
- `leave_room` - 방 퇴장
- `player_joined` - 플레이어 참가 알림
- `player_left` - 플레이어 퇴장 알림

## 라이선스

MIT
