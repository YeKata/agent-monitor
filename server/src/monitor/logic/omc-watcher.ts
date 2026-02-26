/**
 * Agent Monitor - OMC Watcher
 *
 * OMC 상태 파일 감시 및 처리
 */

import type { AgentEvent, OMCAgent, OMCTrackingState, HistoryItem } from '../types';
import { getAgentName, getAgentRole } from '../../../../shared/src';

/**
 * 파일 시스템 인터페이스 (테스트 가능성을 위해)
 */
export interface FileSystem {
  existsSync(path: string): boolean;
  readFileSync(path: string, encoding: BufferEncoding): string;
  readdirSync(path: string, options?: { withFileTypes: true }): Array<{ name: string; isDirectory(): boolean }>;
  statSync(path: string): { isDirectory(): boolean };
}

/**
 * 경로 유틸리티 인터페이스
 */
export interface PathUtils {
  join(...paths: string[]): string;
}

/**
 * OMC 파일 변경 콜백
 */
export interface OMCWatcherCallbacks {
  onTaskStart: (event: AgentEvent) => void;
  onTaskEnd: (event: AgentEvent) => void;
  onOrchestratorStatusChange: (status: 'idle' | 'working', task: string) => void;
  onHistoryAdd: (item: HistoryItem) => void;
}

/**
 * OMC 상태 파일 감시자
 *
 * 파일 시스템을 주입받아 테스트 가능하게 설계
 */
export class OMCWatcher {
  private previousOMCAgents = new Map<string, OMCAgent>();
  private currentOrchestratorStatus: 'idle' | 'working' = 'idle';

  constructor(
    private readonly fs: FileSystem,
    private readonly path: PathUtils,
    private readonly homeDir: string,
    private readonly callbacks: OMCWatcherCallbacks,
  ) {}

  /**
   * OMC 상태 파일 경로 찾기
   */
  findOMCStatePaths(baseDir?: string): string[] {
    const searchDir = baseDir || this.path.join(this.homeDir, 'dev');
    const paths: string[] = [];

    try {
      if (!this.fs.existsSync(searchDir)) return paths;

      const entries = this.fs.readdirSync(searchDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('.') && entry.name !== '.omc') continue;

        const fullPath = this.path.join(searchDir, entry.name);

        // .omc/state/subagent-tracking.json 확인
        const trackingFile = this.path.join(fullPath, '.omc', 'state', 'subagent-tracking.json');
        if (this.fs.existsSync(trackingFile)) {
          paths.push(trackingFile);
        }

        // 1단계 하위 디렉토리까지만 검색 (성능 고려)
        if (entry.name !== 'node_modules' && entry.name !== '.git') {
          try {
            const subEntries = this.fs.readdirSync(fullPath, { withFileTypes: true });
            for (const subEntry of subEntries) {
              if (!subEntry.isDirectory()) continue;
              const subTrackingFile = this.path.join(
                fullPath,
                subEntry.name,
                '.omc',
                'state',
                'subagent-tracking.json',
              );
              if (this.fs.existsSync(subTrackingFile)) {
                paths.push(subTrackingFile);
              }
            }
          } catch {
            // 권한 오류 등 무시
          }
        }
      }
    } catch {
      // 디렉토리 스캔 오류 무시
    }

    return paths;
  }

  /**
   * OMC 상태 파일 읽기 및 처리
   */
  handleFileChange(filePath: string): void {
    try {
      const content = this.fs.readFileSync(filePath, 'utf-8');
      const state: OMCTrackingState = JSON.parse(content);
      this.processState(state);
    } catch {
      // 파일 읽기 실패 무시
    }
  }

  /**
   * OMC 상태 처리
   */
  processState(state: OMCTrackingState): void {
    for (const agent of state.agents) {
      const previous = this.previousOMCAgents.get(agent.agent_id);

      if (!previous) {
        // 새 에이전트
        if (agent.status === 'running') {
          this.callbacks.onTaskStart({
            type: 'task:start',
            agentId: agent.agent_id,
            agentName: getAgentName(agent.agent_type),
            agentRole: getAgentRole(agent.agent_type),
            task: agent.task_description || '',
            timestamp: agent.started_at,
          });
        } else {
          // 이미 완료된 상태로 발견됨 - 히스토리에만 추가
          this.addToHistoryFromAgent(agent);
        }
      } else if (previous.status === 'running' && agent.status !== 'running') {
        // 상태 변경 (완료/실패)
        this.callbacks.onTaskEnd({
          type: 'task:end',
          agentId: agent.agent_id,
          agentName: getAgentName(agent.agent_type),
          agentRole: getAgentRole(agent.agent_type),
          task: agent.task_description || previous.task_description || '',
          status: agent.status === 'failed' ? 'error' : 'completed',
          duration: agent.duration_ms,
          files: agent.file_ownership,
          timestamp: agent.completed_at || new Date().toISOString(),
        });
      }

      this.previousOMCAgents.set(agent.agent_id, { ...agent });
    }

    // 오케스트레이터 상태 업데이트
    const runningAgents = state.agents.filter((a) => a.status === 'running');
    const newStatus = runningAgents.length > 0 ? 'working' : 'idle';

    if (newStatus !== this.currentOrchestratorStatus) {
      this.currentOrchestratorStatus = newStatus;
      const task = runningAgents[0]?.task_description || '';
      this.callbacks.onOrchestratorStatusChange(newStatus, task);
    }
  }

  /**
   * OMC 에이전트를 히스토리 아이템으로 변환
   */
  private addToHistoryFromAgent(agent: OMCAgent): void {
    if (agent.status === 'running') return;

    this.callbacks.onHistoryAdd({
      id: agent.agent_id,
      time: agent.completed_at || agent.started_at,
      task: agent.task_description || '',
      status: agent.status === 'failed' ? 'error' : 'completed',
      duration: agent.duration_ms || 0,
      agents: [
        {
          id: agent.agent_id,
          name: getAgentName(agent.agent_type),
          role: getAgentRole(agent.agent_type),
        },
      ],
      files: agent.file_ownership || [],
    });
  }

  /**
   * 이전 상태 초기화 (테스트용)
   */
  reset(): void {
    this.previousOMCAgents.clear();
    this.currentOrchestratorStatus = 'idle';
  }
}
