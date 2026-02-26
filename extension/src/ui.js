// UI 렌더링 함수
import { agentCharacters, agentDescriptions, getAgentCharacter, getAgentDescription } from './icons.js';
import { overlay, indicator, detailModal, isVisible, viewMode, state, indicatorPosition, availableAgentsCollapsed, setOverlay, setIndicator, setDetailModal, setIsVisible, setViewMode, setIndicatorPosition, setAvailableAgentsCollapsed } from './state.js';
import { escapeHtml, escapeAttr, formatDuration, formatTimestamp, extractAgentType, formatAgentName, getFileName } from './utils.js';

// 드래그 상태
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartRight = 0;
let dragStartBottom = 0;

// 상시 표시 미니 인디케이터 생성
export function createIndicator() {
  if (indicator) return;

  const el = document.createElement('div');
  el.id = 'agent-monitor-indicator';
  el.innerHTML = `
    <div class="indicator-dot"></div>
    <span class="indicator-text">Agent Monitor</span>
    <span class="indicator-count" style="display: none;">0</span>
  `;

  // 저장된 위치 적용
  el.style.right = `${indicatorPosition.right}px`;
  el.style.bottom = `${indicatorPosition.bottom}px`;

  document.body.appendChild(el);

  // 드래그 기능 설정
  setupIndicatorDrag(el);

  setIndicator(el);
  updateIndicator();
}

// 인디케이터 드래그 기능
function setupIndicatorDrag(el) {
  let hasMoved = false;

  const onMouseDown = (e) => {
    // 왼쪽 클릭만 처리
    if (e.button !== 0) return;

    isDragging = true;
    hasMoved = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartRight = indicatorPosition.right;
    dragStartBottom = indicatorPosition.bottom;

    el.style.cursor = 'grabbing';
    el.style.transition = 'none';
    e.preventDefault();

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;

    const deltaX = dragStartX - e.clientX;
    const deltaY = dragStartY - e.clientY;

    // 5px 이상 움직여야 드래그로 인식
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      hasMoved = true;
    }

    // 새 위치 계산 (화면 경계 체크)
    const newRight = Math.max(10, Math.min(window.innerWidth - el.offsetWidth - 10, dragStartRight + deltaX));
    const newBottom = Math.max(10, Math.min(window.innerHeight - el.offsetHeight - 10, dragStartBottom + deltaY));

    el.style.right = `${newRight}px`;
    el.style.bottom = `${newBottom}px`;
  };

  const onMouseUp = () => {
    if (!isDragging) return;

    isDragging = false;
    el.style.cursor = 'grab';
    el.style.transition = '';

    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);

    // 위치 저장
    const newRight = parseInt(el.style.right) || indicatorPosition.right;
    const newBottom = parseInt(el.style.bottom) || indicatorPosition.bottom;
    setIndicatorPosition({ right: newRight, bottom: newBottom });

    // 드래그가 아닌 클릭이면 오버레이 토글
    if (!hasMoved) {
      toggleOverlay();
    }
  };

  el.addEventListener('mousedown', onMouseDown);

  // 기존 click 이벤트 제거 (mouseup에서 처리)
  el.removeEventListener('click', toggleOverlay);
}

// 인디케이터 상태 업데이트
export function updateIndicator() {
  if (!indicator) return;

  const dot = indicator.querySelector('.indicator-dot');
  const text = indicator.querySelector('.indicator-text');
  const count = indicator.querySelector('.indicator-count');

  dot.classList.remove('connected', 'disconnected', 'working');

  if (!state.connected) {
    dot.classList.add('disconnected');
    text.textContent = 'Disconnected';
  } else if (state.agents.length > 0 || state.orchestrator.status === 'working') {
    dot.classList.add('working');
    text.textContent = `Working`;
    count.textContent = state.agents.length;
    count.style.display = state.agents.length > 0 ? 'inline' : 'none';
  } else {
    dot.classList.add('connected');
    text.textContent = 'Agent Monitor';
    count.style.display = 'none';
  }
}

// 오버레이 생성
export function createOverlay() {
  if (overlay) return;

  const el = document.createElement('div');
  el.id = 'agent-monitor-overlay';

  document.body.appendChild(el);
  setOverlay(el);
  renderOverlay();

  el.addEventListener('click', (e) => {
    if (e.target.classList.contains('am-close') || e.target.id === 'agent-monitor-overlay') {
      hideOverlay();
    }
    if (e.target.closest('[data-action="toggle-mode"]')) {
      toggleViewMode();
    }
    if (e.target.closest('[data-action="toggle-available"]')) {
      toggleAvailableAgents();
    }
    const historyItem = e.target.closest('.am-history-item');
    if (historyItem && historyItem.dataset.history) {
      try {
        const item = JSON.parse(historyItem.dataset.history);
        showHistoryDetail(item);
      } catch (err) {
        console.error('Failed to parse history item:', err);
      }
    }
  });
}

// Available Agents 토글
function toggleAvailableAgents() {
  setAvailableAgentsCollapsed(!availableAgentsCollapsed);
  renderOverlay();
}

// Available Agents 개수
function getAvailableAgentCount() {
  const defaultAgentTypes = [
    'architect', 'executor', 'designer', 'explore',
    'researcher', 'scientist', 'planner', 'code-reviewer',
    'writer', 'vue-expert', 'ui-designer', 'mlops-engineer'
  ];

  if (state.availableAgents && state.availableAgents.length > 0) {
    return state.availableAgents.length;
  }
  return defaultAgentTypes.length;
}

// 오버레이 렌더링
export function renderOverlay() {
  if (!overlay) return;

  overlay.classList.toggle('mini-mode', viewMode === 'mini');

  overlay.innerHTML = `
    <div class="am-container">
      ${renderHeader()}
      ${renderOrchestrator()}
      ${state.agents.length > 0 ? `
        <div class="am-section-title">Active Agents</div>
        <div class="am-agents-grid">
          ${state.agents.map(agent => renderAgentCard(agent)).join('')}
        </div>
      ` : ''}
      <div class="am-section-title am-collapsible" data-action="toggle-available">
        <span class="am-collapse-icon">${availableAgentsCollapsed ? '▶' : '▼'}</span>
        Available Agents (${getAvailableAgentCount()})
      </div>
      ${!availableAgentsCollapsed ? `
        <div class="am-agents-grid">
          ${renderAllAgentsGrid()}
        </div>
      ` : ''}
      ${renderHistory()}
    </div>
  `;
}

// 헤더 렌더링
function renderHeader() {
  const modeIcon = viewMode === 'mini' ? '⇱' : '⇲';
  const modeTitle = viewMode === 'mini' ? 'Expand to Full Mode' : 'Collapse to Panel';

  return `
    <div class="am-header">
      <div class="am-header-left">
        <div class="am-status-dot ${state.connected ? 'connected' : 'disconnected'}"></div>
        <h1 class="am-title">Agent Monitor</h1>
      </div>
      <div class="am-header-right">
        <button class="am-mode-toggle" data-action="toggle-mode" title="${modeTitle}">${modeIcon}</button>
        <button class="am-close">&times;</button>
      </div>
    </div>
  `;
}

// 오케스트레이터 카드 렌더링
function renderOrchestrator() {
  const isWorking = state.orchestrator.status === 'working';
  const activeCount = state.agents.length;

  return `
    <div class="am-orchestrator-card ${isWorking ? 'working' : ''}">
      <div class="am-orchestrator-avatar">
        ${agentCharacters.orchestrator}
      </div>
      <div class="am-orchestrator-info">
        <div class="am-orchestrator-name">Orchestrator</div>
        <div class="am-orchestrator-role">${agentDescriptions.orchestrator}</div>
        <div class="am-orchestrator-status ${isWorking ? 'working' : 'idle'}">
          <span class="status-dot"></span>
          <span>${isWorking ? `Coordinating ${activeCount > 0 ? activeCount + ' agent' + (activeCount !== 1 ? 's' : '') : '...'}` : 'Idle'}</span>
        </div>
      </div>
    </div>
  `;
}

// 에이전트 카드 렌더링 (활성 상태)
function renderAgentCard(agent) {
  const agentType = extractAgentType(agent.agentName || agent.agentId || agent.agentRole);
  const character = getAgentCharacter(agentType);
  const description = getAgentDescription(agentType);
  const displayName = formatAgentName(agent.agentName || agentType);

  return `
    <div class="am-agent-card ${agent.status || 'running'} running" data-type="${agentType}">
      <div class="am-agent-card-header">
        <div class="am-agent-avatar">
          ${character}
        </div>
        <div class="am-agent-info">
          <div class="am-agent-name">${escapeHtml(displayName)}</div>
          <div class="am-agent-role">${escapeHtml(description)}</div>
        </div>
      </div>
      ${agent.task ? `
        <div class="am-agent-task">${escapeHtml(agent.task)}</div>
      ` : ''}
      ${agent.files && agent.files.length > 0 ? `
        <div class="am-agent-files">
          ${agent.files.slice(-3).map(f => `
            <a href="vscode://file${f}" class="am-file-tag" title="${escapeHtml(f)}">
              ${escapeHtml(getFileName(f))}
            </a>
          `).join('')}
        </div>
      ` : ''}
      <div class="am-agent-footer">
        <span class="am-agent-status-badge ${agent.status || 'running'}">
          ${agent.status === 'completed' ? '✓ Completed' : agent.status === 'error' ? '✗ Error' : '⟳ Running'}
        </span>
        ${agent.duration ? `
          <span class="am-agent-duration">${formatDuration(agent.duration)}</span>
        ` : ''}
      </div>
    </div>
  `;
}

// 전체 에이전트 그리드 렌더링
function renderAllAgentsGrid() {
  const defaultAgentTypes = [
    'architect', 'executor', 'designer', 'explore',
    'researcher', 'scientist', 'planner', 'code-reviewer',
    'writer', 'vue-expert', 'ui-designer', 'mlops-engineer'
  ];

  let agentList;
  if (state.availableAgents && state.availableAgents.length > 0) {
    agentList = state.availableAgents;
  } else {
    agentList = defaultAgentTypes.map(type => ({
      name: type,
      description: getAgentDescription(type),
      source: 'default'
    }));
  }

  return agentList.map(agent => {
    const type = agent.name;
    const character = getAgentCharacter(type);
    const description = agent.description || getAgentDescription(type);
    const displayName = formatAgentName(type);
    const sourceLabel = agent.source === 'custom' ? '★' : '';

    return `
      <div class="am-agent-card idle" data-type="${type}">
        <div class="am-agent-card-header">
          <div class="am-agent-avatar">
            ${character}
          </div>
          <div class="am-agent-info">
            <div class="am-agent-name">${escapeHtml(displayName)}${sourceLabel ? ` <span class="am-custom-badge">${sourceLabel}</span>` : ''}</div>
            <div class="am-agent-role">${escapeHtml(description)}</div>
          </div>
        </div>
        <div class="am-agent-footer">
          <span class="am-agent-status-badge idle">Standby</span>
          ${agent.model ? `<span class="am-agent-model ${agent.model.toLowerCase()}">${agent.model}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// 히스토리 렌더링
function renderHistory() {
  if (!state.history || state.history.length === 0) {
    return '';
  }

  const displayedHistory = state.history.slice(0, state.historyDisplayCount);

  return `
    <div class="am-history-section">
      <div class="am-section-title">Recent History (${state.history.length})</div>
      <div class="am-history-list" id="am-history-list">
        ${displayedHistory.map(item => renderHistoryItem(item)).join('')}
      </div>
    </div>
  `;
}

// 히스토리 아이템 렌더링
function renderHistoryItem(item) {
  const icon = item.status === 'completed' ? '✓' : item.status === 'error' ? '✗' : '⟳';
  const agentName = formatAgentName(item.agents?.[0]?.name || item.agentName || item.agentType || 'Agent');
  const agentRole = item.agents?.[0]?.role || item.agentRole || '';
  const timeStr = formatTimestamp(item.timestamp || item.time);
  const itemId = item.id || item.agentId || Math.random().toString(36).substr(2, 9);

  return `
    <div class="am-history-item ${item.status || 'completed'}" data-history-id="${itemId}" data-history='${escapeAttr(JSON.stringify(item))}'>
      <div class="am-history-icon">${icon}</div>
      <div class="am-history-content">
        <div class="am-history-agent">${escapeHtml(agentName)}${agentRole ? ` · ${escapeHtml(agentRole)}` : ''}</div>
        <div class="am-history-task">${escapeHtml(item.task || item.message || 'Completed')}</div>
        <div class="am-history-meta">
          <span class="am-history-time">${timeStr}</span>
          ${item.duration ? `<span class="am-history-duration">${formatDuration(item.duration)}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

// 뷰 모드 토글
export function toggleViewMode() {
  const newMode = viewMode === 'full' ? 'mini' : 'full';
  setViewMode(newMode);
  renderOverlay();
}

// 히스토리 스크롤 레이지 로딩 설정
export function setupHistoryScroll() {
  const historyList = document.getElementById('am-history-list');
  if (!historyList) return;

  historyList.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = historyList;
    // 하단 50px 이내로 스크롤하면 더 로드
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      if (state.historyDisplayCount < state.history.length) {
        state.historyDisplayCount += 10;
        renderHistoryItems();
      }
    }
  });
}

// 히스토리 아이템만 다시 렌더링 (전체 오버레이 리렌더 방지)
function renderHistoryItems() {
  const historyList = document.getElementById('am-history-list');
  if (!historyList) return;

  const displayedHistory = state.history.slice(0, state.historyDisplayCount);
  historyList.innerHTML = displayedHistory.map(item => renderHistoryItem(item)).join('');
}

// 오버레이 표시/숨김
export function showOverlay() {
  if (!overlay) createOverlay();
  state.historyDisplayCount = 10; // 오버레이 열 때 초기화
  renderOverlay();
  setupHistoryScroll();
  overlay.classList.add('am-visible');
  setIsVisible(true);

  try {
    chrome.runtime.sendMessage({ type: 'getState' }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('[Agent Monitor] Extension context invalidated, please refresh the page');
        return;
      }
      if (response?.success) {
        state.orchestrator = response.data.orchestrator;
        state.agents = response.data.agents;
        state.history = response.data.history;
        state.availableAgents = response.data.availableAgents || [];
        state.connected = true;
        console.log('[Agent Monitor] getState received, availableAgents:', state.availableAgents.length);
        renderOverlay();
        setupHistoryScroll();
      }
    });
  } catch (e) {
    console.log('[Agent Monitor] Extension context invalidated, please refresh the page');
  }
}

export function hideOverlay() {
  if (overlay) {
    overlay.classList.remove('am-visible');
  }
  setIsVisible(false);
}

export function toggleOverlay() {
  if (isVisible) {
    hideOverlay();
  } else {
    showOverlay();
  }
}

// 히스토리 상세 모달 표시
export function showHistoryDetail(item) {
  const agentName = formatAgentName(item.agents?.[0]?.name || item.agentName || item.agentType || 'Agent');
  const agentRole = item.agents?.[0]?.role || item.agentRole || '';
  const fullTime = new Date(item.timestamp || item.time).toLocaleString();

  const modal = document.createElement('div');
  modal.className = 'am-detail-modal';
  modal.innerHTML = `
    <div class="am-detail-content">
      <div class="am-detail-header">
        <div class="am-detail-title">
          <h3>${escapeHtml(agentName)}</h3>
        </div>
        <button class="am-detail-close">&times;</button>
      </div>
      <div class="am-detail-body">
        <div class="am-detail-meta">
          <div class="am-detail-meta-item">
            <span class="am-detail-label">Role</span>
            <span class="am-detail-value">${escapeHtml(agentRole || 'Agent')}</span>
          </div>
          <div class="am-detail-meta-item">
            <span class="am-detail-label">Status</span>
            <span class="am-detail-status ${item.status || 'completed'}">${item.status === 'error' ? '✗ Error' : '✓ Completed'}</span>
          </div>
          <div class="am-detail-meta-item">
            <span class="am-detail-label">Duration</span>
            <span class="am-detail-value">${item.duration ? formatDuration(item.duration) : '-'}</span>
          </div>
          <div class="am-detail-meta-item">
            <span class="am-detail-label">Time</span>
            <span class="am-detail-value">${fullTime}</span>
          </div>
        </div>
        <div class="am-detail-row">
          <span class="am-detail-label">Task</span>
          <div class="am-detail-value task">${escapeHtml(item.task || item.message || 'No task description')}</div>
        </div>
        ${item.files && item.files.length > 0 ? `
          <div class="am-detail-row">
            <span class="am-detail-label">Files</span>
            <div class="am-detail-value">${item.files.map(f => `<div>• ${escapeHtml(f)}</div>`).join('')}</div>
          </div>
        ` : ''}
        ${item.error ? `
          <div class="am-detail-row">
            <span class="am-detail-label">Error</span>
            <div class="am-detail-value task" style="border-color: rgba(255,71,87,0.5); color: #ff4757;">${escapeHtml(item.error)}</div>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  setDetailModal(modal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.closest('.am-detail-close')) {
      closeHistoryDetail();
    }
  });
}

export function closeHistoryDetail() {
  if (detailModal) {
    detailModal.remove();
    setDetailModal(null);
  }
}

// 전역 함수로 노출
window.toggleViewMode = toggleViewMode;
