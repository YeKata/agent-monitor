#!/usr/bin/env node
/**
 * Agent Monitor - Notification Hook
 *
 * Claude Code의 Notification 이벤트를 감지하여 Agent Monitor 서버로 전송
 * - "Waiting for your approval" 등의 승인 대기 상태 감지
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
const LOG_FILE = '/tmp/agent-monitor-notification.log';
const DEBUG = true;

function log(msg) {
  if (DEBUG) {
    appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
  }
}

log('Notification hook started');

let input = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', async () => {
  log(`Received input: ${input.slice(0, 500)}`);

  try {
    const hookData = JSON.parse(input);
    await processNotification(hookData);
  } catch (e) {
    log(`Error: ${e.message}`);
  }
  process.exit(0);
});

async function processNotification(data) {
  log(`Processing notification: ${JSON.stringify(data).slice(0, 300)}`);

  // Notification 데이터 구조
  // { title: string, message: string, ... }
  const title = data.title || '';
  const message = data.message || '';
  const fullText = `${title} ${message}`.toLowerCase();

  // 승인 대기 상태 감지
  const isApprovalWaiting =
    fullText.includes('approval') ||
    fullText.includes('permission') ||
    fullText.includes('waiting') ||
    fullText.includes('confirm') ||
    fullText.includes('allow') ||
    fullText.includes('plan mode');

  if (isApprovalWaiting) {
    const event = {
      type: 'approval:waiting',
      title: title,
      message: message,
      timestamp: new Date().toISOString(),
    };

    log(`Sending approval event: ${JSON.stringify(event)}`);
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
