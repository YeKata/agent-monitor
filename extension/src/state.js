// 상태 관리
export let overlay = null;
export let indicator = null;
export let detailModal = null;
export let isVisible = false;
export let viewMode = localStorage.getItem('agent-monitor-view-mode') || 'mini';

// 인디케이터 위치 (localStorage에서 복원)
const savedPosition = JSON.parse(localStorage.getItem('agent-monitor-position') || 'null');
export let indicatorPosition = savedPosition || { right: 20, bottom: 20 };

// 섹션 접힘 상태 (localStorage에서 복원)
export let availableAgentsCollapsed = localStorage.getItem('agent-monitor-available-collapsed') === 'true';

export const state = {
  connected: false,
  orchestrator: { status: 'idle', task: '' },
  agents: [],
  history: [],
  availableAgents: [],
  historyDisplayCount: 10, // 레이지 로딩용
};

export function setOverlay(el) { overlay = el; }
export function setIndicator(el) { indicator = el; }
export function setDetailModal(el) { detailModal = el; }
export function setIsVisible(val) { isVisible = val; }
export function setViewMode(val) {
  viewMode = val;
  localStorage.setItem('agent-monitor-view-mode', val);
}
export function setIndicatorPosition(pos) {
  indicatorPosition = pos;
  localStorage.setItem('agent-monitor-position', JSON.stringify(pos));
}
export function setAvailableAgentsCollapsed(val) {
  availableAgentsCollapsed = val;
  localStorage.setItem('agent-monitor-available-collapsed', val ? 'true' : 'false');
}
