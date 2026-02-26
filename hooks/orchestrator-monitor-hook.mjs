#!/usr/bin/env node
/**
 * Orchestrator Monitor Hook
 *
 * UserPromptSubmit → 오케스트레이터 working 시작
 * Stop → 오케스트레이터 idle (응답 완료)
 */

import { appendFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

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
const LOG_FILE = '/tmp/orchestrator-monitor-hook.log';
const DEBUG = true;

function log(msg) {
  if (DEBUG) {
    appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
  }
}

const action = process.argv[2]; // 'start' (UserPromptSubmit) or 'stop' (Stop)
log(`Orchestrator hook called with action: ${action}`);

let input = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', async () => {
  log(`Received input: ${input.slice(0, 300)}`);

  try {
    const hookData = JSON.parse(input);
    await processHook(action, hookData);
  } catch (e) {
    log(`Error: ${e.message}`);
  }
  process.exit(0);
});

async function processHook(action, data) {
  log(`Processing orchestrator hook - action: ${action}`);

  let event;

  if (action === 'start') {
    // UserPromptSubmit - 사용자가 프롬프트 제출
    // 먼저 기존 running 에이전트들 정리 (이전 작업이 중단됐을 수 있음)
    await sendEvent({
      type: 'clear:agents',
      timestamp: new Date().toISOString(),
    });

    const prompt = data.prompt?.slice(0, 100) || '';
    event = {
      type: 'orchestrator:status',
      status: 'running',
      task: prompt || 'Processing request...',
      timestamp: new Date().toISOString(),
    };
  } else if (action === 'stop') {
    // Stop - Claude 응답 완료
    // stop_hook_active가 true면 이미 continue 중이므로 무시
    if (data.stop_hook_active) {
      log('Stop hook active, skipping to prevent loop');
      return;
    }

    event = {
      type: 'orchestrator:status',
      status: 'idle',
      task: '',
      timestamp: new Date().toISOString(),
    };
  }

  if (event) {
    log(`Sending orchestrator event: ${JSON.stringify(event)}`);
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
