/**
 * Agent Monitor - Monitor Service
 *
 * NestJS 서비스 - 의존성 조율 및 SSE 스트림 관리
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import * as os from 'os';

import type { AgentEvent, HistoryItem, AvailableAgentInfo, MonitorHealth, SSEEvent } from './types';
import { StateManager, EventProcessor, OMCWatcher, AgentLoader } from './logic';

@Injectable()
export class MonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MonitorService.name);
  private readonly historyFile = path.join(process.cwd(), 'history.json');
  private readonly homeDir = os.homedir();

  // 파일 감시
  private watcher: chokidar.FSWatcher | null = null;
  private watchedPaths: string[] = [];

  // 로직 모듈
  private readonly state: StateManager;
  private readonly eventProcessor: EventProcessor;
  private readonly omcWatcher: OMCWatcher;
  private readonly agentLoader: AgentLoader;

  // SSE 스트림
  readonly events$ = new Subject<SSEEvent>();

  // 메타데이터
  private startTime = Date.now();
  private lastEventTime: string | null = null;
  private sseConnectionCount = 0;

  constructor() {
    // StateManager 초기화
    this.state = new StateManager(100);

    // EventProcessor 초기화
    this.eventProcessor = new EventProcessor(this.state, {
      onAgentEvent: (data) => this.events$.next({ type: 'agent', data }),
      onOrchestratorEvent: (data) => this.events$.next({ type: 'orchestrator', data }),
      onHistoryEvent: (item) => {
        this.saveHistory();
        this.events$.next({ type: 'history', data: item });
      },
      onClearEvent: (data) => this.events$.next({ type: 'clear', data }),
    });

    // OMCWatcher 초기화
    this.omcWatcher = new OMCWatcher(fs, path, this.homeDir, {
      onTaskStart: (event) => {
        this.lastEventTime = new Date().toISOString();
        this.eventProcessor.handleTaskStart(event);
      },
      onTaskEnd: (event) => {
        this.lastEventTime = new Date().toISOString();
        this.eventProcessor.handleTaskEnd(event);
      },
      onOrchestratorStatusChange: (status, task) => {
        this.state.setOrchestratorStatus(status, task);
        this.events$.next({
          type: 'orchestrator',
          data: {
            status,
            task,
            timestamp: new Date().toISOString(),
          },
        });
      },
      onHistoryAdd: (item) => {
        const added = this.state.addToHistory(item);
        if (added) {
          this.saveHistory();
          this.events$.next({ type: 'history', data: item });
        }
      },
    });

    // AgentLoader 초기화
    this.agentLoader = new AgentLoader(fs, path, this.homeDir);
  }

  onModuleInit() {
    this.loadHistory();
    this.setupOMCWatcher();
    this.logger.log('Monitor Service initialized');
  }

  onModuleDestroy() {
    if (this.watcher) {
      this.watcher.close();
    }
  }

  // ===== Public API =====

  /**
   * 이벤트 수신 (Hook에서 POST로 호출)
   */
  handleEvent(event: AgentEvent): void {
    this.logger.debug(`Event received: ${event.type}`);
    this.lastEventTime = new Date().toISOString();
    this.eventProcessor.handleEvent(event);
  }

  /**
   * 현재 상태 반환 (SSE 초기 데이터)
   */
  getCurrentState() {
    return {
      orchestrator: {
        status: this.state.getOrchestratorStatus(),
        task: this.state.getCurrentTask(),
      },
      agents: this.state.getActiveAgentsArray(),
      history: this.state.getRecentHistory(20),
      availableAgents: this.agentLoader.loadAllAgents(),
    };
  }

  /**
   * 헬스체크
   */
  getHealth(): MonitorHealth {
    return {
      status: 'ok',
      sseConnections: this.sseConnectionCount,
      watchedFiles: this.watchedPaths.length,
      activeAgents: this.state.getActiveAgentCount(),
      lastEventTime: this.lastEventTime,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * SSE 연결 추적
   */
  incrementConnections(): void {
    this.sseConnectionCount++;
  }

  decrementConnections(): void {
    this.sseConnectionCount = Math.max(0, this.sseConnectionCount - 1);
  }

  getConnectionCount(): number {
    return this.sseConnectionCount;
  }

  getWatchedFiles(): string[] {
    return [...this.watchedPaths];
  }

  getActiveAgentCount(): number {
    return this.state.getActiveAgentCount();
  }

  getLastEventTime(): string | null {
    return this.lastEventTime;
  }

  // ===== Private Methods =====

  /**
   * OMC 상태 파일 감시 설정
   */
  private setupOMCWatcher(): void {
    const devDir = path.join(this.homeDir, 'dev');
    this.watchedPaths = this.omcWatcher.findOMCStatePaths(devDir);

    if (this.watchedPaths.length === 0) {
      this.logger.warn('No OMC state directories found');
      // 폴백: 폴링으로 주기적 검색
      setInterval(() => this.scanForOMCFiles(), 5000);
      return;
    }

    this.logger.log(`Watching OMC state files: ${this.watchedPaths.join(', ')}`);

    this.watcher = chokidar.watch(this.watchedPaths, {
      persistent: true,
      ignoreInitial: false,
      usePolling: true,
      interval: 500,
    });

    this.watcher.on('add', (filePath) => this.omcWatcher.handleFileChange(filePath));
    this.watcher.on('change', (filePath) => this.omcWatcher.handleFileChange(filePath));
    this.watcher.on('error', (error) => this.logger.error(`Watcher error: ${error}`));
  }

  /**
   * 주기적으로 새 OMC 파일 검색
   */
  private scanForOMCFiles(): void {
    const devDir = path.join(this.homeDir, 'dev');
    const newPaths = this.omcWatcher.findOMCStatePaths(devDir);

    for (const p of newPaths) {
      if (!this.watchedPaths.includes(p)) {
        if (this.watcher) {
          this.watcher.add(p);
          this.watchedPaths.push(p);
          this.logger.log(`Added new OMC file to watch: ${p}`);
        }
      }
    }
  }

  /**
   * 히스토리 로드
   */
  private loadHistory(): void {
    try {
      if (fs.existsSync(this.historyFile)) {
        const data = JSON.parse(fs.readFileSync(this.historyFile, 'utf-8'));

        const today = this.getLocalDateString();
        if (data.date !== today) {
          this.state.clearHistory();
          this.saveHistory();
          this.logger.log('History cleared (new day)');
        } else {
          this.state.setHistory(data.items || []);
          this.logger.log(`Loaded ${data.items?.length || 0} history items`);
        }
      }
    } catch {
      this.logger.warn('Failed to load history, starting fresh');
      this.state.clearHistory();
    }
  }

  /**
   * 히스토리 저장
   */
  private saveHistory(): void {
    try {
      const data = {
        date: this.getLocalDateString(),
        items: this.state.getHistory(),
      };
      fs.writeFileSync(this.historyFile, JSON.stringify(data, null, 2));
    } catch {
      this.logger.error('Failed to save history');
    }
  }

  /**
   * 로컬 날짜 문자열 반환 (YYYY-MM-DD)
   * UTC 대신 로컬 타임존 사용
   */
  private getLocalDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
