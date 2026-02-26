/**
 * Agent Monitor Server - 타입 정의
 *
 * shared 모듈의 타입을 re-export하고 서버 전용 타입을 추가
 */

// shared 타입 re-export
export type {
  AgentEventType,
  AgentStatus,
  OrchestratorStatus,
  AgentEvent,
  HistoryItem,
  OMCAgent,
  OMCTrackingState,
  AvailableAgentInfo,
  SSEEventType,
  SSEEvent,
  MonitorState,
} from '../../../../shared/src/types';

// 서버 전용 타입
export interface FileSystem {
  existsSync(path: string): boolean;
  readFileSync(path: string, encoding: BufferEncoding): string;
  writeFileSync(path: string, data: string): void;
  readdirSync(path: string, options?: { withFileTypes: true }): Array<{ name: string; isDirectory(): boolean }>;
  statSync(path: string): { isDirectory(): boolean };
}

export interface PathUtils {
  join(...paths: string[]): string;
}

export interface SSEConnection {
  id: string;
  connectedAt: Date;
}

export interface MonitorHealth {
  status: 'ok' | 'degraded' | 'error';
  sseConnections: number;
  watchedFiles: number;
  activeAgents: number;
  lastEventTime: string | null;
  uptime: number;
}
