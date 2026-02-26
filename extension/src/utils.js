// 유틸리티 함수

export function getFileName(path) {
  return path.split('/').pop() || path;
}

export function formatDuration(ms) {
  if (!ms) return '';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function escapeAttr(text) {
  return text.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

export function formatTimestamp(timestamp) {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) {
    return 'just now';
  }

  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }

  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${date.getMonth() + 1}/${date.getDate()} ${hours}:${minutes}`;
}

// 에이전트 타입 추출 (정규화)
export function extractAgentType(name) {
  if (!name) return 'default';

  const lower = name.toLowerCase();

  if (lower.includes('architect')) return 'architect';
  if (lower.includes('executor')) return 'executor';
  if (lower.includes('designer') && lower.includes('ui')) return 'ui-designer';
  if (lower.includes('designer')) return 'designer';
  if (lower.includes('explore') || lower.includes('scout')) return 'explore';
  if (lower.includes('researcher')) return 'researcher';
  if (lower.includes('scientist')) return 'scientist';
  if (lower.includes('planner')) return 'planner';
  if (lower.includes('review') || lower.includes('qa') || lower.includes('security')) return 'code-reviewer';
  if (lower.includes('writer')) return 'writer';
  if (lower.includes('vue')) return 'vue-expert';
  if (lower.includes('mlops')) return 'mlops-engineer';
  if (lower.includes('git')) return 'executor';

  return 'default';
}

// 에이전트 이름 포맷팅
export function formatAgentName(name) {
  if (!name) return 'Agent';

  return name
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
