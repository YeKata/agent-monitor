# Agent Monitor

Claude Code 에이전트 실시간 모니터링 크롬 확장 프로그램.

## 기능

- 실시간 에이전트 상태 모니터링
- 오케스트레이터 상태 표시
- 에이전트 작업 히스토리
- 드래그 가능한 인디케이터 (위치 저장)
- 접기/펼치기 가능한 Available Agents 섹션

## 요구사항

- Node.js 18+
- pnpm
- Chrome 브라우저
- Claude Code CLI

## 설치

### 1. 클론 및 빌드

```bash
git clone https://github.com/YeKata/agent-monitor.git
cd agent-monitor

# shared 모듈
cd shared && pnpm install && pnpm run build

# 서버
cd ../server && pnpm install && pnpm run build

# 확장 프로그램
cd ../extension && pnpm install && pnpm run build
```

### 2. Hook 설정

Hook 파일들을 `~/.claude/hooks/` 폴더에 심볼릭 링크로 연결합니다:

```bash
# hooks 폴더 생성 (없는 경우)
mkdir -p ~/.claude/hooks

# 심볼릭 링크 생성
ln -s $(pwd)/hooks/orchestrator-monitor-hook.mjs ~/.claude/hooks/
ln -s $(pwd)/hooks/agent-monitor-hook.mjs ~/.claude/hooks/
```

### 3. Claude Code 설정

`~/.claude/settings.json`에 hooks 설정을 추가합니다.

**중요:** `node` 경로는 본인의 환경에 맞게 수정하세요. `which node`로 확인 가능합니다.

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.claude/hooks/orchestrator-monitor-hook.mjs start"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.claude/hooks/orchestrator-monitor-hook.mjs stop"
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
            "command": "node ~/.claude/hooks/agent-monitor-hook.mjs start"
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
            "command": "node ~/.claude/hooks/agent-monitor-hook.mjs stop"
          }
        ]
      }
    ]
  }
}
```

**nvm 사용자:** node 경로를 절대 경로로 지정해야 합니다:

```bash
# node 경로 확인
which node
# 예: /Users/username/.nvm/versions/node/v22.16.0/bin/node

# settings.json에서 "node" 대신 절대 경로 사용
"command": "/Users/username/.nvm/versions/node/v22.16.0/bin/node ~/.claude/hooks/..."
```

### 4. 서버 실행

```bash
cd server
pnpm run start
```

서버: `http://localhost:2026`

### 5. 크롬 확장 설치

1. Chrome → `chrome://extensions` 접속
2. "개발자 모드" 활성화 (우측 상단)
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. `extension/` 폴더 선택

## 사용법

1. 서버가 실행 중인지 확인
2. 브라우저에서 아무 페이지나 열기
3. 우측 하단에 "Agent Monitor" 인디케이터가 표시됨
4. Claude Code에서 에이전트 작업 시작하면 자동으로 모니터링
5. 인디케이터 클릭하여 상세 오버레이 열기/닫기
6. 인디케이터는 드래그하여 위치 변경 가능

## 서버 URL 변경

기본값은 `http://localhost:2026`. 변경하려면:

```bash
# 환경변수
export AGENT_MONITOR_URL=http://your-server:port

# 또는 설정 파일
echo '{"serverUrl": "http://your-server:port"}' > ~/.claude/agent-monitor.json
```

## 문제 해결

### Hook이 동작하지 않는 경우

1. 로그 확인:
```bash
cat /tmp/agent-monitor-hook.log
cat /tmp/orchestrator-monitor-hook.log
```

2. 심볼릭 링크 확인:
```bash
ls -la ~/.claude/hooks/
```

3. shared 모듈 빌드 확인:
```bash
ls shared/dist/
```

### 서버 연결 실패

1. 서버가 실행 중인지 확인
2. 포트 2026이 사용 가능한지 확인
3. 브라우저 콘솔에서 `[Agent Monitor]` 로그 확인

## 구조

```
agent-monitor/
├── shared/          # 공유 타입 및 유틸리티
├── server/          # NestJS SSE 서버
├── extension/       # 크롬 확장 프로그램
└── hooks/           # Claude Code 훅
    ├── orchestrator-monitor-hook.mjs
    └── agent-monitor-hook.mjs
```

## 라이선스

MIT
