#!/usr/bin/env node
/**
 * Agent Monitor Hook
 *
 * SubagentStart/SubagentStop 이벤트를 Agent Monitor 서버로 전송
 * - Start: description/prompt를 캐싱
 * - Stop: 캐싱된 description을 함께 전송
 */

import { appendFileSync, writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir, homedir } from 'os';
import { fileURLToPath } from 'url';

// shared 모듈에서 import
const __dirname = dirname(fileURLToPath(import.meta.url));
const { getAgentName, getAgentRole, normalizeAgentId } = await import(
  join(__dirname, '../shared/dist/index.js')
);

// 서버 URL: 환경변수 > 설정파일 > 기본값
function getServerUrl() {
  if (process.env.AGENT_MONITOR_URL) {
    return process.env.AGENT_MONITOR_URL;
  }
  const configPath = join(homedir(), '.claude', 'agent-monitor.json');
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      if (config.serverUrl) return config.serverUrl;
    } catch {}
  }
  return 'http://localhost:2026';
}

const SERVER_URL = getServerUrl();
const LOG_FILE = '/tmp/agent-monitor-hook.log';
const TASK_CACHE_DIR = join(tmpdir(), 'agent-monitor-tasks');
const DEBUG = true;

// 태스크 캐시 디렉토리 생성
try {
  if (!existsSync(TASK_CACHE_DIR)) {
    mkdirSync(TASK_CACHE_DIR, { recursive: true });
  }
} catch (e) {
  // 무시
}

function log(msg) {
  if (DEBUG) {
    appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
  }
}

// 태스크 설명 저장 (start 시점)
function saveTaskDescription(agentId, description) {
  try {
    const filePath = join(TASK_CACHE_DIR, `${agentId.replace(/[^a-zA-Z0-9-_]/g, '_')}.txt`);
    writeFileSync(filePath, description);
    log(`Saved task for ${agentId}: ${description.slice(0, 50)}...`);
  } catch (e) {
    log(`Failed to save task: ${e.message}`);
  }
}

// 태스크 설명 로드 및 삭제 (stop 시점)
function loadAndClearTaskDescription(agentId) {
  try {
    const filePath = join(TASK_CACHE_DIR, `${agentId.replace(/[^a-zA-Z0-9-_]/g, '_')}.txt`);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');
      unlinkSync(filePath); // 사용 후 삭제
      return content;
    }
  } catch (e) {
    log(`Failed to load task: ${e.message}`);
  }
  return '';
}

// 1시간 이상 된 오래된 캐시 파일 자동 정리 (hook 시작 시)
function cleanupOldCacheFiles() {
  try {
    if (!existsSync(TASK_CACHE_DIR)) {
      return;
    }

    const now = Date.now();
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const files = readdirSync(TASK_CACHE_DIR);

    for (const file of files) {
      try {
        const filePath = join(TASK_CACHE_DIR, file);
        const stats = statSync(filePath);
        const ageMs = now - stats.mtimeMs;

        if (ageMs > ONE_HOUR_MS) {
          unlinkSync(filePath);
          log(`Cleaned up old cache file: ${file} (age: ${Math.round(ageMs / 1000)}s)`);
        }
      } catch (e) {
        // 파일 정리 중 에러 발생 시 무시하고 계속 진행
        log(`Failed to cleanup file ${file}: ${e.message}`);
      }
    }
  } catch (e) {
    log(`Failed to cleanup cache files: ${e.message}`);
  }
}

// 에이전트 transcript에서 프롬프트 추출 (stop 시점)
function extractPromptFromTranscript(transcriptPath) {
  try {
    // .json -> .jsonl 로 변환
    const jsonlPath = transcriptPath?.replace(/\.json$/, '.jsonl');
    if (!jsonlPath || !existsSync(jsonlPath)) {
      log(`Transcript not found: ${jsonlPath}`);
      return '';
    }

    // 첫 줄 읽기 (프롬프트)
    const content = readFileSync(jsonlPath, 'utf-8');
    const firstLine = content.split('\n')[0];
    if (firstLine) {
      const parsed = JSON.parse(firstLine);
      // 첫 메시지의 content가 프롬프트
      const prompt = parsed.message?.content || '';
      log(`Extracted prompt from transcript: ${prompt.slice(0, 100)}`);
      return prompt.slice(0, 200);
    }
  } catch (e) {
    log(`Failed to extract prompt: ${e.message}`);
  }
  return '';
}

const action = process.argv[2]; // 'start' or 'stop'
log(`Hook called with action: ${action}`);

// Hook 시작 시 오래된 캐시 파일 정리
cleanupOldCacheFiles();

let input = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', async () => {
  log(`Received input: ${input.slice(0, 500)}`);

  try {
    const hookData = JSON.parse(input);
    await processHook(action, hookData);
  } catch (e) {
    log(`Error: ${e.message}`);
  }
  process.exit(0);
});

async function processHook(action, data) {
  log(`Processing hook - action: ${action}, data keys: ${Object.keys(data).join(', ')}`);

  // SubagentStart/SubagentStop 데이터 구조
  // { agent_id, agent_type, session_id, ... }
  const agentType = data.agent_type || data.subagent_type || 'unknown';
  const agentId = normalizeAgentId(agentType);
  const uniqueAgentId = data.agent_id || agentId; // Claude가 부여한 고유 ID 사용
  const description = data.description || '';
  const prompt = data.prompt?.slice(0, 200) || '';
  const taskDescription = description || prompt;

  let event;

  if (action === 'start') {
    // 시작 시점: description을 캐싱
    if (taskDescription) {
      saveTaskDescription(uniqueAgentId, taskDescription);
    }

    event = {
      type: 'task:start',
      agentId: uniqueAgentId,
      agentName: getAgentName(agentId),
      agentRole: getAgentRole(agentId),
      task: taskDescription,
      timestamp: new Date().toISOString(),
    };
  } else if (action === 'stop') {
    // 종료 시점: transcript에서 프롬프트 추출
    const transcriptPrompt = extractPromptFromTranscript(data.agent_transcript_path);
    const cachedTask = loadAndClearTaskDescription(uniqueAgentId);
    const finalTask = transcriptPrompt || cachedTask || taskDescription;
    const hasError = data.error || data.is_error;

    event = {
      type: 'task:end',
      agentId: uniqueAgentId,
      agentName: getAgentName(agentId),
      agentRole: getAgentRole(agentId),
      task: finalTask,
      status: hasError ? 'error' : 'completed',
      error: hasError ? (data.error || 'Unknown error') : undefined,
      timestamp: new Date().toISOString(),
    };
  }

  if (event) {
    log(`Sending event: ${JSON.stringify(event)}`);
    await sendEvent(event);
  }
}

async function sendEvent(event) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${SERVER_URL}/monitor/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      signal: controller.signal,
    });
    log(`Server response: ${response.status}`);
  } catch (e) {
    log(`Send failed: ${e.message}`);
  } finally {
    clearTimeout(timeout);
  }
}
