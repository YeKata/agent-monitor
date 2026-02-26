// 메시지 핸들러
import { state } from './state.js';
import { createIndicator, updateIndicator, renderOverlay, showOverlay, hideOverlay, toggleOverlay } from './ui.js';
import { extractAgentType } from './utils.js';

// 메시지 수신 핸들러
export function setupMessageHandler() {
  try {
    chrome.runtime.onMessage.addListener((message) => {
      try {
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
        }
      } catch (e) {
        console.log('[Agent Monitor] Error handling message:', e.message);
      }
    });
  } catch (e) {
    console.log('[Agent Monitor] Extension context invalidated');
  }
}

// 에이전트 메시지 처리
function handleAgentMessage(data) {
  try {
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
          try {
            state.agents = state.agents.filter((a) => a.agentId !== data.agentId);
            updateIndicator();
            renderOverlay();
            if (state.agents.length === 0 && state.orchestrator.status === 'idle') {
              setTimeout(hideOverlay, 2000);
            }
          } catch (e) {
            // Extension context may be invalidated
          }
        }, 3000);
      }
    }
  } catch (e) {
    console.log('[Agent Monitor] Error handling agent message:', e.message);
  }
}

// 안전한 메시지 전송 (extension context 무효화 처리)
function safeSendMessage(message, callback) {
  try {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.log('[Agent Monitor] Extension context invalidated, please refresh the page');
        return;
      }
      if (callback) callback(response);
    });
  } catch (e) {
    console.log('[Agent Monitor] Extension context invalidated, please refresh the page');
  }
}

// 초기화
export function init() {
  // 초기 연결 상태 확인 및 인디케이터 생성
  safeSendMessage({ type: 'getConnectionStatus' }, (response) => {
    if (response) {
      state.connected = response.connected;
    }
    createIndicator();
    updateIndicator();
  });

  // 초기 상태 로드
  safeSendMessage({ type: 'getState' }, (response) => {
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
