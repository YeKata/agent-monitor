/**
 * Agent Monitor - 공유 타입 정의
 */

// 에이전트 이벤트 타입
export type AgentEventType =
  | 'task:start'
  | 'task:end'
  | 'tool:call'
  | 'orchestrator:status'
  | 'clear:agents'
  | 'clear:all'
  | 'approval:waiting';

// 에이전트 상태
export type AgentStatus = 'running' | 'completed' | 'error';

// 오케스트레이터 상태
export type OrchestratorStatus = 'idle' | 'working';

// 에이전트 이벤트
export interface AgentEvent {
  type: AgentEventType;
  agentId?: string;
  agentName?: string;
  agentRole?: string;
  task?: string;
  status?: AgentStatus;
  error?: string;
  files?: string[];
  duration?: number;
  timestamp: string;
}

// 히스토리 항목
export interface HistoryItem {
  id: string;
  time: string;
  task: string;
  status: 'completed' | 'error';
  duration: number;
  agents: { id: string; name: string; role: string }[];
  files: string[];
}

// OMC 에이전트 상태 (subagent-tracking.json)
export interface OMCAgent {
  agent_id: string;
  agent_type: string;
  started_at: string;
  parent_mode: string;
  task_description?: string;
  status: 'running' | 'completed' | 'failed';
  completed_at?: string;
  duration_ms?: number;
  file_ownership?: string[];
}

// OMC 트래킹 상태
export interface OMCTrackingState {
  agents: OMCAgent[];
  total_spawned: number;
  total_completed: number;
  total_failed: number;
  last_updated: string;
}

// 사용 가능한 에이전트 정보
export interface AvailableAgentInfo {
  name: string;
  description: string;
  model?: string;
  source: 'omc' | 'custom';
}

// SSE 이벤트 타입
export type SSEEventType = 'agent' | 'orchestrator' | 'history' | 'init' | 'clear' | 'approval';

// SSE 이벤트
export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
}

// 모니터 상태 (SSE init 데이터)
export interface MonitorState {
  orchestrator: {
    status: OrchestratorStatus;
    task: string;
  };
  agents: AgentEvent[];
  history: HistoryItem[];
  availableAgents: AvailableAgentInfo[];
}
