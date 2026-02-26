/**
 * Agent Monitor - 에이전트 설정
 *
 * 에이전트 이름과 역할을 동적으로 생성
 * 하드코딩 없이 agent_type에서 자동 추출
 */

// 에이전트 이름/역할 캐시 (동적 생성된 값 저장)
const agentNameCache: Record<string, string> = {};
const agentRoleCache: Record<string, string> = {};

/**
 * 에이전트 ID를 사람이 읽기 좋은 이름으로 변환
 * 예: "general-purpose" -> "General Purpose"
 *     "code-reviewer-low" -> "Code Reviewer"
 *     "architect" -> "Architect"
 */
function formatAgentName(agentId: string): string {
  // 티어 접미사 제거 (-low, -medium, -high)
  const baseName = agentId.replace(/-(low|medium|high)$/, '');

  // kebab-case를 Title Case로 변환
  return baseName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * 에이전트 ID에서 역할 설명 생성
 * 예: "code-reviewer" -> "Code Reviewer"
 *     "general-purpose" -> "General Purpose Agent"
 */
function formatAgentRole(agentId: string): string {
  const baseName = agentId.replace(/-(low|medium|high)$/, '');

  const roleMap: Record<string, string> = {
    'general-purpose': 'General Purpose Agent',
    explore: 'Codebase Explorer',
    plan: 'Implementation Planner',
    bash: 'Command Executor',
  };

  // 특수 케이스 처리
  const lowerBase = baseName.toLowerCase();
  if (roleMap[lowerBase]) {
    return roleMap[lowerBase];
  }

  // 기본: Title Case 변환
  return baseName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * 에이전트 타입 정규화 (oh-my-claudecode: 접두사 제거)
 */
export function normalizeAgentId(agentType: string): string {
  if (agentType.includes(':')) {
    return agentType.split(':').pop() || agentType;
  }
  return agentType;
}

/**
 * 에이전트 타입에서 표시 이름 추출 (동적 생성)
 */
export function getAgentName(agentId: string): string {
  const normalized = normalizeAgentId(agentId);

  // 캐시 확인
  if (agentNameCache[normalized]) {
    return agentNameCache[normalized];
  }

  // 동적 생성 후 캐시
  const name = formatAgentName(normalized);
  agentNameCache[normalized] = name;
  return name;
}

/**
 * 에이전트 타입에서 역할 설명 추출 (동적 생성)
 */
export function getAgentRole(agentId: string): string {
  const normalized = normalizeAgentId(agentId);

  // 캐시 확인
  if (agentRoleCache[normalized]) {
    return agentRoleCache[normalized];
  }

  // 동적 생성 후 캐시
  const role = formatAgentRole(normalized);
  agentRoleCache[normalized] = role;
  return role;
}

/**
 * 에이전트 타입이 알려진 에이전트인지 확인
 * (동적 생성이므로 항상 true - 모든 에이전트를 처리 가능)
 */
export function isKnownAgent(_agentId: string): boolean {
  return true;
}

/**
 * 캐시된 에이전트 타입 목록 반환
 */
export function getAllAgentTypes(): string[] {
  return Object.keys(agentNameCache);
}
