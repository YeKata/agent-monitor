// Agent Monitor - Background Service Worker

const SERVER_URL = 'http://localhost:2026';
const SSE_TIMEOUT_MS = 60000; // 60초 무응답 시 재연결
let eventSource = null;
let isConnected = false;
let heartbeatTimer = null;

// 연결 상태 관리
function connect() {
  if (eventSource) {
    eventSource.close();
  }
  clearHeartbeatTimer();

  eventSource = new EventSource(`${SERVER_URL}/monitor/stream`);

  eventSource.onopen = () => {
    isConnected = true;
    console.log('[Agent Monitor] Connected to server');
    broadcastToTabs({ type: 'connection', status: 'connected' });
    resetHeartbeatTimer();
  };

  eventSource.onmessage = (event) => {
    resetHeartbeatTimer(); // 메시지 받을 때마다 타이머 리셋
    try {
      const data = JSON.parse(event.data);
      console.log('[Agent Monitor] SSE received:', data.type, data.data?.availableAgents?.length || 0);
      broadcastToTabs(data);
    } catch (e) {
      console.error('[Agent Monitor] Parse error:', e);
    }
  };

  eventSource.onerror = () => {
    isConnected = false;
    clearHeartbeatTimer();
    console.log('[Agent Monitor] Connection lost, retrying in 5s...');
    broadcastToTabs({ type: 'connection', status: 'disconnected' });

    eventSource.close();
    setTimeout(connect, 5000);
  };
}

// 타임아웃 관리: 서버 heartbeat가 30초마다 오므로 60초 무응답 시 재연결
function resetHeartbeatTimer() {
  clearHeartbeatTimer();
  heartbeatTimer = setTimeout(() => {
    console.log('[Agent Monitor] SSE timeout, reconnecting...');
    if (eventSource) {
      eventSource.close();
    }
    isConnected = false;
    broadcastToTabs({ type: 'connection', status: 'disconnected' });
    setTimeout(connect, 1000);
  }, SSE_TIMEOUT_MS);
}

function clearHeartbeatTimer() {
  if (heartbeatTimer) {
    clearTimeout(heartbeatTimer);
    heartbeatTimer = null;
  }
}

// 모든 탭에 메시지 전송
async function broadcastToTabs(message) {
  const tabs = await chrome.tabs.query({});
  tabs.forEach((tab) => {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, message).catch(() => {
        // 탭이 content script를 로드하지 않은 경우 무시
      });
    }
  });
}

// 확장 프로그램 아이콘 클릭 시 오버레이 토글
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'toggle' });
    } catch (e) {
      // Content script가 로드되지 않은 탭 (chrome://, edge:// 등)
      console.log('[Agent Monitor] Cannot toggle on this tab');
    }
  }
});

// 시작 시 연결
connect();

// Content script에서 상태 요청 시
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getState') {
    fetch(`${SERVER_URL}/monitor/state`)
      .then((res) => res.json())
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // async response
  }

  if (message.type === 'getConnectionStatus') {
    sendResponse({ connected: isConnected });
  }
});
