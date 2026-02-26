# Agent Monitor

Claude Code 에이전트 실시간 모니터링 크롬 확장 프로그램.

## 기능

- 실시간 에이전트 상태 모니터링
- 오케스트레이터 상태 표시
- 에이전트 작업 히스토리
- 드래그 가능한 인디케이터 (위치 저장)
- **승인 대기 토스트 알림** - Claude가 승인을 기다릴 때 알림

## 설치

### 1. 의존성 설치 및 빌드

```bash
# shared 모듈
cd shared && pnpm install && pnpm run build

# 서버
cd ../server && pnpm install && pnpm run build

# 확장 프로그램
cd ../extension && pnpm install && pnpm run build
```

### 2. 서버 실행

```bash
cd server
pnpm run start
```

서버: `http://localhost:2026`

### 3. 크롬 확장 설치

1. Chrome → 확장 프로그램 → "압축해제된 확장 프로그램 로드"
2. `extension/` 폴더 선택

### 4. Hook 설정

`~/.claude/settings.json`에 추가:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node /path/to/hooks/orchestrator-monitor-hook.mjs start"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node /path/to/hooks/orchestrator-monitor-hook.mjs stop"
          }
        ]
      }
    ],
    "SubagentStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node /path/to/hooks/agent-monitor-hook.mjs start"
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node /path/to/hooks/agent-monitor-hook.mjs stop"
          }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node /path/to/hooks/notification-hook.mjs"
          }
        ]
      }
    ]
  }
}
```

Hook 파일들은 `hooks/` 폴더에 위치.

## 서버 URL 설정

기본값은 `http://localhost:2026`. 변경하려면:

```bash
# 환경변수
export AGENT_MONITOR_URL=http://your-server:port

# 또는 설정 파일
echo '{"serverUrl": "http://your-server:port"}' > ~/.claude/agent-monitor.json
```

## 구조

```
agent-monitor/
├── shared/          # 공유 타입 및 유틸리티
├── server/          # NestJS SSE 서버
├── extension/       # 크롬 확장 프로그램
└── hooks/           # Claude Code 훅
    ├── orchestrator-monitor-hook.mjs
    ├── agent-monitor-hook.mjs
    └── notification-hook.mjs
```
