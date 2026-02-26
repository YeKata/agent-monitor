// 메시지 핸들러
import { state } from './state.js';
import { createIndicator, updateIndicator, renderOverlay, showOverlay, hideOverlay, toggleOverlay } from './ui.js';
import { extractAgentType } from './utils.js';

// 메시지 수신 핸들러
export function setupMessageHandler() {
  chrome.runtime.onMessage.addListener((message) => {
    switch (message.type) {
      case 'toggle':
        toggleOverlay();
        break;

      case 'connection':
        state.connected = message.status === 'connected';
        updateIndicator();
        renderOverlay();
        break;

      case 'init':
        console.log('[Agent Monitor] Init received, availableAgents:', message.data.availableAgents?.length || 0);
        state.orchestrator = message.data.orchestrator;
        state.agents = message.data.agents;
        state.history = message.data.history;
        state.availableAgents = message.data.availableAgents || [];
        state.connected = true;
        updateIndicator();
        renderOverlay();
        if (state.orchestrator.status === 'working' || state.agents.length > 0) {
          showOverlay();
        }
        break;

      case 'orchestrator':
        state.orchestrator = message.data;
        updateIndicator();
        renderOverlay();
        if (message.data.status === 'working') {
          showOverlay();
        }
        break;

      case 'agent':
        handleAgentMessage(message.data);
        break;

      case 'history':
        state.history.unshift(message.data);
        state.history = state.history.slice(0, 20);
        renderOverlay();
        break;

      case 'clear':
        if (message.data?.target === 'agents') {
          state.agents = [];
        } else if (message.data?.target === 'all') {
          state.agents = [];
          state.orchestrator = { status: 'idle', task: '' };
        }
        updateIndicator();
        renderOverlay();
        break;

      case 'approval':
        showApprovalToast(message.data);
        break;
    }
  });
}

// 승인 대기 토스트 표시
function showApprovalToast(data) {
  // 기존 토스트가 있으면 제거
  const existing = document.getElementById('agent-monitor-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'agent-monitor-toast';
  toast.innerHTML = `
    <div class="toast-icon">⚠️</div>
    <div class="toast-content">
      <div class="toast-title">${data.title || 'Approval Required'}</div>
      <div class="toast-message">${data.message || 'Claude is waiting for your input'}</div>
    </div>
  `;

  document.body.appendChild(toast);

  // 애니메이션 후 표시
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // 5초 후 자동 제거
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 5000);

  // 클릭 시 즉시 제거
  toast.addEventListener('click', () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  });
}

// 에이전트 메시지 처리
function handleAgentMessage(data) {
  const agentIndex = state.agents.findIndex((a) => a.agentId === data.agentId);

  if (data.status === 'running') {
    if (agentIndex === -1) {
      state.agents.push(data);
    } else {
      state.agents[agentIndex] = data;
    }
    updateIndicator();
    renderOverlay();
    showOverlay();
  } else {
    // 완료/에러 시 히스토리에 추가
    if (agentIndex !== -1 || data.status === 'completed' || data.status === 'error') {
      const historyEntry = {
        agentId: data.agentId,
        agentName: data.agentName,
        agentType: extractAgentType(data.agentName || data.agentId),
        task: data.task,
        status: data.status,
        duration: data.duration,
        timestamp: Date.now(),
      };
      state.history.unshift(historyEntry);
      state.history = state.history.slice(0, 20);
    }

    // 완료/에러 시 잠시 보여주고 제거
    if (agentIndex !== -1) {
      state.agents[agentIndex] = data;
      updateIndicator();
      renderOverlay();
      setTimeout(() => {
        state.agents = state.agents.filter((a) => a.agentId !== data.agentId);
        updateIndicator();
        renderOverlay();
        if (state.agents.length === 0 && state.orchestrator.status === 'idle') {
          setTimeout(hideOverlay, 2000);
        }
      }, 3000);
    }
  }
}

// 초기화
export function init() {
  // 초기 연결 상태 확인 및 인디케이터 생성
  chrome.runtime.sendMessage({ type: 'getConnectionStatus' }, (response) => {
    if (response) {
      state.connected = response.connected;
    }
    createIndicator();
    updateIndicator();
  });

  // 초기 상태 로드
  chrome.runtime.sendMessage({ type: 'getState' }, (response) => {
    if (response?.success) {
      state.orchestrator = response.data.orchestrator;
      state.agents = response.data.agents;
      state.history = response.data.history;
      state.availableAgents = response.data.availableAgents || [];
      state.connected = true;
      console.log('[Agent Monitor] Initial state loaded, availableAgents:', state.availableAgents.length);
      updateIndicator();
    }
  });

  // 메시지 핸들러 설정
  setupMessageHandler();
}
