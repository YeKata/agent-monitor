/**
 * Agent Monitor - Agent Loader
 *
 * 사용 가능한 에이전트 목록 로드
 */

import { parseMarkdownMetadata } from '../../../../shared/src';
import type { AvailableAgentInfo, FileSystem, PathUtils } from '../types';

/**
 * 에이전트 로더
 *
 * OMC 플러그인 및 사용자 커스텀 에이전트를 로드
 */
export class AgentLoader {
  constructor(
    private readonly fs: FileSystem,
    private readonly path: PathUtils,
    private readonly homeDir: string,
  ) {}

  /**
   * 모든 사용 가능한 에이전트 로드
   */
  loadAllAgents(): AvailableAgentInfo[] {
    const agents: AvailableAgentInfo[] = [];

    // 1. OMC 플러그인 에이전트 로드
    const omcAgentsDir = this.findOMCAgentsDir();
    if (omcAgentsDir) {
      const omcAgents = this.loadAgentsFromDir(omcAgentsDir, 'omc');
      agents.push(...omcAgents);
    }

    // 2. 사용자 커스텀 에이전트 로드
    const customAgentsDir = this.path.join(this.homeDir, '.claude', 'agents');
    if (this.fs.existsSync(customAgentsDir)) {
      const customAgents = this.loadAgentsFromDir(customAgentsDir, 'custom');
      agents.push(...customAgents);
    }

    return agents;
  }

  /**
   * OMC 플러그인 에이전트 디렉토리 찾기
   */
  findOMCAgentsDir(): string | null {
    const pluginCacheDir = this.path.join(
      this.homeDir,
      '.claude',
      'plugins',
      'cache',
      'omc',
      'oh-my-claudecode',
    );

    try {
      if (!this.fs.existsSync(pluginCacheDir)) return null;

      // 버전 디렉토리 중 가장 최신 버전 찾기
      const entries = this.fs.readdirSync(pluginCacheDir, { withFileTypes: true });
      const versions = entries
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

      if (versions.length === 0) return null;

      const agentsDir = this.path.join(pluginCacheDir, versions[0], 'agents');
      return this.fs.existsSync(agentsDir) ? agentsDir : null;
    } catch {
      return null;
    }
  }

  /**
   * 디렉토리에서 에이전트 정보 로드
   */
  loadAgentsFromDir(dir: string, source: 'omc' | 'custom'): AvailableAgentInfo[] {
    const agents: AvailableAgentInfo[] = [];

    try {
      const entries = this.fs.readdirSync(dir, { withFileTypes: true });
      const files = entries.filter((e) => !e.isDirectory() && e.name.endsWith('.md')).map((e) => e.name);

      for (const file of files) {
        const filePath = this.path.join(dir, file);
        const agentName = file.replace('.md', '');

        // 템플릿 파일 제외
        if (agentName === 'base-agent' || agentName.startsWith('template')) continue;

        try {
          const content = this.fs.readFileSync(filePath, 'utf-8');
          const parsed = parseMarkdownMetadata(content);

          agents.push({
            name: agentName,
            description: parsed.description || `${agentName} agent`,
            model: parsed.model,
            source,
          });
        } catch {
          // 개별 파일 파싱 실패는 무시
        }
      }
    } catch {
      // 디렉토리 읽기 실패
    }

    return agents;
  }
}
