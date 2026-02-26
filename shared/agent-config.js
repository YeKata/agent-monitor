/**
 * Agent Monitor - Shared Agent Configuration
 *
 * 에이전트 이름과 역할 매핑을 중앙 관리
 * 서버, 훅, 클라이언트에서 공통으로 사용
 */

// 에이전트 표시 이름 매핑
export const AGENT_NAMES = {
  // OMC 에이전트
  'architect': 'Archie',
  'architect-low': 'Archie',
  'architect-medium': 'Archie',
  'executor': 'Exec',
  'executor-low': 'Exec',
  'executor-high': 'Exec',
  'designer': 'Desi',
  'designer-low': 'Desi',
  'designer-high': 'Desi',
  'explore': 'Scout',
  'explore-medium': 'Scout',
  'explore-high': 'Scout',
  'reviewer': 'Rex',
  'researcher': 'Reese',
  'researcher-low': 'Reese',
  'scientist': 'Sci',
  'scientist-low': 'Sci',
  'scientist-high': 'Sci',
  'planner': 'Plan',
  'code-reviewer': 'Rex',
  'code-reviewer-low': 'Rex',
  'security-reviewer': 'Guard',
  'security-reviewer-low': 'Guard',
  'build-fixer': 'Fix',
  'build-fixer-low': 'Fix',
  'tdd-guide': 'TDD',
  'tdd-guide-low': 'TDD',
  'writer': 'Writer',
  'vision': 'Vision',
  'git-master': 'Git',
  'qa-tester': 'QA',
  'qa-tester-high': 'QA',
  'deep-executor': 'Deep',
  'analyst': 'Analyst',
  'critic': 'Critic',
  // 커스텀 에이전트
  'vue-expert': 'Vue',
  'ui-designer': 'UI',
  'mlops-engineer': 'ML',
  'code-reviewer-custom': 'Review',
  // 빌트인
  'Explore': 'Scout',
  'Plan': 'Plan',
  'Bash': 'Shell',
  'general-purpose': 'General',
};

// 에이전트 역할 설명 매핑
export const AGENT_ROLES = {
  // OMC 에이전트
  'architect': 'Architecture Advisor',
  'architect-low': 'Architecture Advisor',
  'architect-medium': 'Architecture Advisor',
  'executor': 'Code Executor',
  'executor-low': 'Code Executor',
  'executor-high': 'Code Executor',
  'designer': 'UI/UX Designer',
  'designer-low': 'UI/UX Designer',
  'designer-high': 'UI/UX Designer',
  'explore': 'Codebase Explorer',
  'explore-medium': 'Codebase Explorer',
  'explore-high': 'Codebase Explorer',
  'reviewer': 'Code Reviewer',
  'researcher': 'Documentation Researcher',
  'researcher-low': 'Documentation Researcher',
  'scientist': 'Data Scientist',
  'scientist-low': 'Data Scientist',
  'scientist-high': 'Data Scientist',
  'planner': 'Strategic Planner',
  'code-reviewer': 'Code Reviewer',
  'code-reviewer-low': 'Code Reviewer',
  'security-reviewer': 'Security Reviewer',
  'security-reviewer-low': 'Security Reviewer',
  'build-fixer': 'Build Fixer',
  'build-fixer-low': 'Build Fixer',
  'tdd-guide': 'TDD Guide',
  'tdd-guide-low': 'TDD Guide',
  'writer': 'Technical Writer',
  'vision': 'Visual Analyzer',
  'git-master': 'Git Expert',
  'qa-tester': 'QA Tester',
  'qa-tester-high': 'QA Tester',
  'deep-executor': 'Deep Executor',
  'analyst': 'Pre-Planning Analyst',
  'critic': 'Plan Critic',
  // 커스텀 에이전트
  'vue-expert': 'Vue Expert',
  'ui-designer': 'UI Designer',
  'mlops-engineer': 'MLOps Engineer',
  'code-reviewer-custom': 'Code Reviewer',
  // 빌트인
  'Explore': 'Explorer',
  'Plan': 'Planner',
  'Bash': 'Shell Command',
  'general-purpose': 'General Purpose',
};

/**
 * 에이전트 타입에서 표시 이름 추출
 */
export function getAgentName(agentId) {
  return AGENT_NAMES[agentId] || agentId;
}

/**
 * 에이전트 타입에서 역할 설명 추출
 */
export function getAgentRole(agentId) {
  return AGENT_ROLES[agentId] || 'Agent';
}

/**
 * 에이전트 타입 정규화 (oh-my-claudecode: 접두사 제거)
 */
export function normalizeAgentId(agentType) {
  if (agentType.includes(':')) {
    return agentType.split(':').pop();
  }
  return agentType;
}
