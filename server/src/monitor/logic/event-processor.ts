/**
 * Agent Monitor - Event Processor
 *
 * 에이전트 이벤트 처리 로직
 */

import type { AgentEvent, HistoryItem, OrchestratorStatus } from '../types';
import type { StateManager } from './state-manager';

export interface EventProcessorCallbacks {
  onAgentEvent: (data: any) => void;
  onOrchestratorEvent: (data: any) => void;
  onHistoryEvent: (item: HistoryItem) => void;
  onClearEvent: (data: { target: string; timestamp: string }) => void;
}

/**
 * 이벤트 처리기
 *
 * StateManager를 통해 상태를 관리하고,
 * 콜백을 통해 외부에 이벤트를 전달
 */
export class EventProcessor {
  constructor(
    private readonly state: StateManager,
    private readonly callbacks: EventProcessorCallbacks,
  ) {}

  /**
   * 이벤트 라우팅
   */
  handleEvent(event: AgentEvent): void {
    switch (event.type) {
      case 'orchestrator:status':
        this.handleOrchestratorStatus(event);
        break;
      case 'task:start':
        this.handleTaskStart(event);
        break;
      case 'task:end':
        this.handleTaskEnd(event);
        break;
      case 'tool:call':
        this.handleToolCall(event);
        break;
      case 'clear:agents':
        this.handleClearAgents();
        break;
      case 'clear:all':
        this.handleClearAll();
        break;
    }
  }

  /**
   * 오케스트레이터 상태 변경
   */
  handleOrchestratorStatus(event: AgentEvent): void {
    const status: OrchestratorStatus = event.status === 'running' ? 'working' : 'idle';
    const task = event.task || '';

    this.state.setOrchestratorStatus(status, task);

    this.callbacks.onOrchestratorEvent({
      status,
      task,
      timestamp: event.timestamp,
    });
  }

  /**
   * 태스크 시작
   */
  handleTaskStart(event: AgentEvent): void {
    if (!event.agentId) return;

    const agentEvent: AgentEvent = {
      ...event,
      status: 'running',
    };

    this.state.addAgent(event.agentId, agentEvent);

    // 오케스트레이터 상태도 업데이트
    if (!this.state.isOrchestratorWorking()) {
      this.state.setOrchestratorStatus('working', event.task || '');
    }

    this.callbacks.onAgentEvent({
      agentId: event.agentId,
      agentName: event.agentName,
      agentRole: event.agentRole,
      task: event.task,
      status: 'running',
      files: event.files || [],
      timestamp: event.timestamp,
    });
  }

  /**
   * 태스크 종료
   */
  handleTaskEnd(event: AgentEvent): void {
    if (!event.agentId) return;

    const startEvent = this.state.getAgent(event.agentId);
    this.state.removeAgent(event.agentId);

    const agentName = event.agentName || startEvent?.agentName || '';
    const agentRole = event.agentRole || startEvent?.agentRole || '';
    const task = event.task || startEvent?.task || '';
    const files = event.files || startEvent?.files || [];
    const status = event.status || 'completed';

    this.callbacks.onAgentEvent({
      agentId: event.agentId,
      agentName,
      agentRole,
      task,
      status,
      error: event.error,
      files,
      duration: event.duration,
      timestamp: event.timestamp,
    });

    // 히스토리에 추가
    const historyItem: HistoryItem = {
      id: event.agentId,
      time: event.timestamp,
      task,
      status: status === 'error' ? 'error' : 'completed',
      duration: event.duration || 0,
      agents: [
        {
          id: event.agentId,
          name: agentName,
          role: agentRole,
        },
      ],
      files,
    };

    const added = this.state.addToHistory(historyItem);
    if (added) {
      this.callbacks.onHistoryEvent(historyItem);
    }

    // 모든 에이전트가 완료되면 오케스트레이터 idle
    if (!this.state.hasActiveAgents()) {
      this.state.setOrchestratorStatus('idle', '');
      this.callbacks.onOrchestratorEvent({
        status: 'idle',
        task: '',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 도구 호출 (파일 목록 업데이트)
   */
  handleToolCall(event: AgentEvent): void {
    if (!event.agentId || !event.files) return;

    const agent = this.state.getAgent(event.agentId);
    if (agent) {
      this.state.updateAgent(event.agentId, {
        files: [...(agent.files || []), ...event.files],
      });
    }
  }

  /**
   * 에이전트 초기화
   */
  handleClearAgents(): void {
    this.state.clearAllAgents();

    this.callbacks.onClearEvent({
      target: 'agents',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 전체 초기화
   */
  handleClearAll(): void {
    this.state.reset();

    this.callbacks.onClearEvent({
      target: 'all',
      timestamp: new Date().toISOString(),
    });
  }
}
