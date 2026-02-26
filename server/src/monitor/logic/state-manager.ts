/**
 * Agent Monitor - State Manager
 *
 * 에이전트 상태와 히스토리를 관리하는 순수 로직
 */

import type { AgentEvent, HistoryItem, OrchestratorStatus } from '../types';

export interface MonitorStateData {
  activeAgents: Map<string, AgentEvent>;
  orchestratorStatus: OrchestratorStatus;
  currentTask: string;
  history: HistoryItem[];
}

/**
 * 모니터 상태 관리 클래스
 *
 * 의존성 없이 순수하게 상태만 관리
 */
export class StateManager {
  private activeAgents = new Map<string, AgentEvent>();
  private orchestratorStatus: OrchestratorStatus = 'idle';
  private currentTask = '';
  private history: HistoryItem[] = [];
  private maxHistorySize: number;

  constructor(maxHistorySize = 100) {
    this.maxHistorySize = maxHistorySize;
  }

  // ===== Active Agents =====

  getActiveAgents(): Map<string, AgentEvent> {
    return new Map(this.activeAgents);
  }

  getActiveAgentsArray(): AgentEvent[] {
    return Array.from(this.activeAgents.values());
  }

  getActiveAgentCount(): number {
    return this.activeAgents.size;
  }

  getAgent(agentId: string): AgentEvent | undefined {
    return this.activeAgents.get(agentId);
  }

  addAgent(agentId: string, event: AgentEvent): void {
    this.activeAgents.set(agentId, event);
  }

  updateAgent(agentId: string, updates: Partial<AgentEvent>): AgentEvent | undefined {
    const agent = this.activeAgents.get(agentId);
    if (agent) {
      const updated = { ...agent, ...updates };
      this.activeAgents.set(agentId, updated);
      return updated;
    }
    return undefined;
  }

  removeAgent(agentId: string): AgentEvent | undefined {
    const agent = this.activeAgents.get(agentId);
    this.activeAgents.delete(agentId);
    return agent;
  }

  clearAllAgents(): void {
    this.activeAgents.clear();
  }

  hasActiveAgents(): boolean {
    return this.activeAgents.size > 0;
  }

  // ===== Orchestrator Status =====

  getOrchestratorStatus(): OrchestratorStatus {
    return this.orchestratorStatus;
  }

  getCurrentTask(): string {
    return this.currentTask;
  }

  setOrchestratorStatus(status: OrchestratorStatus, task = ''): void {
    this.orchestratorStatus = status;
    this.currentTask = task;
  }

  isOrchestratorWorking(): boolean {
    return this.orchestratorStatus === 'working';
  }

  // ===== History =====

  getHistory(): HistoryItem[] {
    return [...this.history];
  }

  getRecentHistory(count: number): HistoryItem[] {
    return this.history.slice(0, count);
  }

  addToHistory(item: HistoryItem): boolean {
    // 중복 체크
    if (this.history.some((h) => h.id === item.id)) {
      return false;
    }

    this.history.unshift(item);

    // 최대 크기 제한
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }

    return true;
  }

  setHistory(history: HistoryItem[]): void {
    this.history = history.slice(0, this.maxHistorySize);
  }

  clearHistory(): void {
    this.history = [];
  }

  // ===== Snapshot =====

  getSnapshot(): MonitorStateData {
    return {
      activeAgents: new Map(this.activeAgents),
      orchestratorStatus: this.orchestratorStatus,
      currentTask: this.currentTask,
      history: [...this.history],
    };
  }

  restoreSnapshot(data: MonitorStateData): void {
    this.activeAgents = new Map(data.activeAgents);
    this.orchestratorStatus = data.orchestratorStatus;
    this.currentTask = data.currentTask;
    this.history = [...data.history];
  }

  // ===== Reset =====

  reset(): void {
    this.activeAgents.clear();
    this.orchestratorStatus = 'idle';
    this.currentTask = '';
    this.history = [];
  }
}
