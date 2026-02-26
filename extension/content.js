(function() {
  "use strict";
  let overlay = null;
  let indicator = null;
  let detailModal = null;
  let isVisible = false;
  let viewMode = localStorage.getItem("agent-monitor-view-mode") || "mini";
  const savedPosition = JSON.parse(localStorage.getItem("agent-monitor-position") || "null");
  let indicatorPosition = savedPosition || { right: 20, bottom: 20 };
  let availableAgentsCollapsed = localStorage.getItem("agent-monitor-available-collapsed") === "true";
  const state = {
    connected: false,
    orchestrator: { status: "idle", task: "" },
    agents: [],
    history: [],
    availableAgents: [],
    historyDisplayCount: 10
    // 레이지 로딩용
  };
  function setOverlay(el) {
    overlay = el;
  }
  function setIndicator(el) {
    indicator = el;
  }
  function setDetailModal(el) {
    detailModal = el;
  }
  function setIsVisible(val) {
    isVisible = val;
  }
  function setViewMode(val) {
    viewMode = val;
    localStorage.setItem("agent-monitor-view-mode", val);
  }
  function setIndicatorPosition(pos) {
    indicatorPosition = pos;
    localStorage.setItem("agent-monitor-position", JSON.stringify(pos));
  }
  function setAvailableAgentsCollapsed(val) {
    availableAgentsCollapsed = val;
    localStorage.setItem("agent-monitor-available-collapsed", val ? "true" : "false");
  }
  const agentCharacters = {
    orchestrator: `
    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <!-- Official Claude Logo from Bootstrap Icons -->
      <path fill="#D97757" d="m3.127 10.604 3.135-1.76.053-.153-.053-.085H6.11l-.525-.032-1.791-.048-1.554-.065-1.505-.08-.38-.081L0 7.832l.036-.234.32-.214.455.04 1.009.069 1.513.105 1.097.064 1.626.17h.259l.036-.105-.089-.065-.068-.064-1.566-1.062-1.695-1.121-.887-.646-.48-.327-.243-.306-.104-.67.435-.48.585.04.15.04.593.456 1.267.981 1.654 1.218.242.202.097-.068.012-.049-.109-.181-.9-1.626-.96-1.655-.428-.686-.113-.411a2 2 0 0 1-.068-.484l.496-.674L4.446 0l.662.089.279.242.411.94.666 1.48 1.033 2.014.302.597.162.553.06.17h.105v-.097l.085-1.134.157-1.392.154-1.792.052-.504.25-.605.497-.327.387.186.319.456-.045.294-.19 1.23-.37 1.93-.243 1.29h.142l.161-.16.654-.868 1.097-1.372.484-.545.565-.601.363-.287h.686l.505.751-.226.775-.707.895-.585.759-.839 1.13-.524.904.048.072.125-.012 1.897-.403 1.024-.186 1.223-.21.553.258.06.263-.218.536-1.307.323-1.533.307-2.284.54-.028.02.032.04 1.029.098.44.024h1.077l2.005.15.525.346.315.424-.053.323-.807.411-3.631-.863-.872-.218h-.12v.073l.726.71 1.331 1.202 1.667 1.55.084.383-.214.302-.226-.032-1.464-1.101-.565-.497-1.28-1.077h-.084v.113l.295.432 1.557 2.34.08.718-.112.234-.404.141-.444-.08-.911-1.28-.94-1.44-.759-1.291-.093.053-.448 4.821-.21.246-.484.186-.403-.307-.214-.496.214-.98.258-1.28.21-1.016.19-1.263.112-.42-.008-.028-.092.012-.953 1.307-1.448 1.957-1.146 1.227-.274.109-.477-.247.045-.44.266-.39 1.586-2.018.956-1.25.617-.723-.004-.105h-.036l-4.212 2.736-.75.096-.324-.302.04-.496.154-.162 1.267-.871z"/>
    </svg>
  `,
    architect: `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="25" y="25" width="50" height="50" fill="none" stroke="#a855f7" stroke-width="2"/>
      <rect x="30" y="30" width="40" height="40" fill="rgba(168,85,247,0.1)" stroke="#7c3aed" stroke-width="1.5"/>
      <line x1="25" y1="40" x2="75" y2="40" stroke="#a855f7" stroke-width="1" opacity="0.4"/>
      <line x1="25" y1="50" x2="75" y2="50" stroke="#a855f7" stroke-width="1" opacity="0.4"/>
      <line x1="25" y1="60" x2="75" y2="60" stroke="#a855f7" stroke-width="1" opacity="0.4"/>
      <line x1="40" y1="25" x2="40" y2="75" stroke="#a855f7" stroke-width="1" opacity="0.4"/>
      <line x1="50" y1="25" x2="50" y2="75" stroke="#a855f7" stroke-width="1" opacity="0.4"/>
      <line x1="60" y1="25" x2="60" y2="75" stroke="#a855f7" stroke-width="1" opacity="0.4"/>
      <circle cx="35" cy="35" r="3" fill="#a855f7"/>
      <circle cx="65" cy="35" r="3" fill="#a855f7"/>
      <circle cx="35" cy="65" r="3" fill="#a855f7"/>
      <circle cx="65" cy="65" r="3" fill="#a855f7"/>
      <rect x="42" y="42" width="16" height="16" fill="rgba(168,85,247,0.3)" stroke="#a855f7" stroke-width="2"/>
    </svg>
  `,
    executor: `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="25" y="30" width="50" height="45" fill="rgba(59,130,246,0.1)" stroke="#3b82f6" stroke-width="2"/>
      <rect x="25" y="30" width="50" height="8" fill="rgba(59,130,246,0.3)"/>
      <circle cx="30" cy="34" r="1.5" fill="#3b82f6"/>
      <circle cx="35" cy="34" r="1.5" fill="#3b82f6"/>
      <circle cx="40" cy="34" r="1.5" fill="#3b82f6"/>
      <path d="M32,45 L42,50 L32,55" fill="#3b82f6" opacity="0.8"/>
      <line x1="42" y1="50" x2="68" y2="50" stroke="#3b82f6" stroke-width="2"/>
      <path d="M68,45 L68,55 L73,50 Z" fill="#60a5fa"/>
      <line x1="32" y1="60" x2="55" y2="60" stroke="#3b82f6" stroke-width="1.5" opacity="0.6"/>
      <line x1="32" y1="65" x2="48" y2="65" stroke="#3b82f6" stroke-width="1.5" opacity="0.6"/>
      <rect x="32" y="68" width="8" height="3" fill="#60a5fa"/>
    </svg>
  `,
    designer: `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="28" y="28" width="20" height="20" fill="rgba(236,72,153,0.2)" stroke="#ec4899" stroke-width="2"/>
      <rect x="52" y="28" width="20" height="12" fill="rgba(236,72,153,0.15)" stroke="#ec4899" stroke-width="1.5"/>
      <rect x="52" y="44" width="20" height="20" fill="rgba(236,72,153,0.25)" stroke="#ec4899" stroke-width="2"/>
      <rect x="28" y="52" width="20" height="12" fill="rgba(236,72,153,0.15)" stroke="#ec4899" stroke-width="1.5"/>
      <line x1="28" y1="38" x2="48" y2="38" stroke="#ec4899" stroke-width="1" opacity="0.5"/>
      <line x1="38" y1="28" x2="38" y2="48" stroke="#ec4899" stroke-width="1" opacity="0.5"/>
      <line x1="52" y1="54" x2="72" y2="54" stroke="#ec4899" stroke-width="1" opacity="0.5"/>
      <line x1="62" y1="44" x2="62" y2="64" stroke="#ec4899" stroke-width="1" opacity="0.5"/>
      <circle cx="28" cy="28" r="2" fill="#ec4899"/>
      <circle cx="72" cy="28" r="2" fill="#ec4899"/>
      <circle cx="28" cy="64" r="2" fill="#ec4899"/>
      <circle cx="72" cy="64" r="2" fill="#ec4899"/>
    </svg>
  `,
    explore: `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="25" fill="rgba(20,184,166,0.1)" stroke="#14b8a6" stroke-width="2"/>
      <circle cx="50" cy="50" r="18" fill="none" stroke="#14b8a6" stroke-width="1" opacity="0.5"/>
      <circle cx="50" cy="50" r="11" fill="none" stroke="#14b8a6" stroke-width="1" opacity="0.5"/>
      <line x1="25" y1="50" x2="75" y2="50" stroke="#14b8a6" stroke-width="1.5" opacity="0.6"/>
      <line x1="50" y1="25" x2="50" y2="75" stroke="#14b8a6" stroke-width="1.5" opacity="0.6"/>
      <path d="M50,50 L70,35" stroke="#5eead4" stroke-width="2" opacity="0.8"/>
      <circle cx="70" cy="35" r="3" fill="#5eead4"/>
      <circle cx="38" cy="38" r="2" fill="#14b8a6"/>
      <circle cx="62" cy="58" r="2" fill="#14b8a6"/>
      <circle cx="45" cy="65" r="2" fill="#14b8a6"/>
      <circle cx="50" cy="50" r="4" fill="rgba(94,234,212,0.5)" stroke="#5eead4" stroke-width="1.5"/>
    </svg>
  `,
    researcher: `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="45" cy="45" r="20" fill="rgba(245,158,11,0.1)" stroke="#f59e0b" stroke-width="2"/>
      <circle cx="45" cy="45" r="14" fill="none" stroke="#f59e0b" stroke-width="1.5" opacity="0.5"/>
      <line x1="60" y1="60" x2="72" y2="72" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>
      <line x1="64" y1="64" x2="76" y2="76" stroke="#d97706" stroke-width="2" stroke-linecap="round"/>
      <rect x="36" y="38" width="18" height="14" fill="rgba(245,158,11,0.2)" stroke="#f59e0b" stroke-width="1"/>
      <line x1="38" y1="42" x2="52" y2="42" stroke="#f59e0b" stroke-width="1" opacity="0.6"/>
      <line x1="38" y1="45" x2="52" y2="45" stroke="#f59e0b" stroke-width="1" opacity="0.6"/>
      <line x1="38" y1="48" x2="48" y2="48" stroke="#f59e0b" stroke-width="1" opacity="0.6"/>
    </svg>
  `,
    scientist: `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="25" y="30" width="50" height="45" fill="rgba(6,182,212,0.05)" stroke="#06b6d4" stroke-width="2"/>
      <line x1="30" y1="70" x2="70" y2="70" stroke="#06b6d4" stroke-width="2"/>
      <line x1="30" y1="35" x2="30" y2="70" stroke="#06b6d4" stroke-width="2"/>
      <polyline points="30,65 38,58 46,55 54,48 62,52 70,42" fill="none" stroke="#22d3ee" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="30" cy="65" r="2.5" fill="#06b6d4"/>
      <circle cx="38" cy="58" r="2.5" fill="#06b6d4"/>
      <circle cx="46" cy="55" r="2.5" fill="#06b6d4"/>
      <circle cx="54" cy="48" r="2.5" fill="#06b6d4"/>
      <circle cx="62" cy="52" r="2.5" fill="#06b6d4"/>
      <circle cx="70" cy="42" r="2.5" fill="#22d3ee"/>
      <line x1="30" y1="50" x2="70" y2="50" stroke="#06b6d4" stroke-width="0.5" opacity="0.3"/>
      <line x1="50" y1="35" x2="50" y2="70" stroke="#06b6d4" stroke-width="0.5" opacity="0.3"/>
    </svg>
  `,
    planner: `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="28" y="28" width="44" height="44" fill="rgba(139,92,246,0.1)" stroke="#8b5cf6" stroke-width="2"/>
      <line x1="39" y1="28" x2="39" y2="72" stroke="#8b5cf6" stroke-width="1"/>
      <line x1="50" y1="28" x2="50" y2="72" stroke="#8b5cf6" stroke-width="1.5"/>
      <line x1="61" y1="28" x2="61" y2="72" stroke="#8b5cf6" stroke-width="1"/>
      <line x1="28" y1="39" x2="72" y2="39" stroke="#8b5cf6" stroke-width="1"/>
      <line x1="28" y1="50" x2="72" y2="50" stroke="#8b5cf6" stroke-width="1.5"/>
      <line x1="28" y1="61" x2="72" y2="61" stroke="#8b5cf6" stroke-width="1"/>
      <circle cx="33" cy="33" r="3" fill="#8b5cf6"/>
      <circle cx="67" cy="33" r="3" fill="#7c3aed"/>
      <circle cx="50" cy="50" r="4" fill="#c4b5fd"/>
      <rect x="31" y="64" width="4" height="4" fill="#8b5cf6"/>
      <rect x="59" y="64" width="4" height="4" fill="#7c3aed"/>
      <path d="M33,33 L50,50" stroke="#8b5cf6" stroke-width="1" opacity="0.4" stroke-dasharray="2,2"/>
      <path d="M67,33 L50,50" stroke="#7c3aed" stroke-width="1" opacity="0.4" stroke-dasharray="2,2"/>
    </svg>
  `,
    "code-reviewer": `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="25" y="30" width="50" height="45" fill="rgba(239,68,68,0.05)" stroke="#ef4444" stroke-width="2"/>
      <line x1="30" y1="38" x2="55" y2="38" stroke="#ef4444" stroke-width="1.5" opacity="0.4"/>
      <line x1="30" y1="45" x2="65" y2="45" stroke="#ef4444" stroke-width="1.5" opacity="0.4"/>
      <line x1="30" y1="52" x2="50" y2="52" stroke="#ef4444" stroke-width="1.5" opacity="0.4"/>
      <line x1="30" y1="59" x2="60" y2="59" stroke="#ef4444" stroke-width="1.5" opacity="0.4"/>
      <line x1="30" y1="66" x2="55" y2="66" stroke="#ef4444" stroke-width="1.5" opacity="0.4"/>
      <path d="M58,42 L62,47 L70,37" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="58" y1="56" x2="68" y2="66" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="68" y1="56" x2="58" y2="66" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="63" cy="61" r="8" fill="none" stroke="#ef4444" stroke-width="1.5"/>
    </svg>
  `,
    writer: `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="30" y="25" width="40" height="50" fill="rgba(16,185,129,0.1)" stroke="#10b981" stroke-width="2"/>
      <line x1="35" y1="32" x2="65" y2="32" stroke="#10b981" stroke-width="2"/>
      <line x1="35" y1="40" x2="65" y2="40" stroke="#10b981" stroke-width="1.5" opacity="0.6"/>
      <line x1="35" y1="46" x2="62" y2="46" stroke="#10b981" stroke-width="1.5" opacity="0.6"/>
      <line x1="35" y1="52" x2="60" y2="52" stroke="#10b981" stroke-width="1.5" opacity="0.6"/>
      <line x1="35" y1="58" x2="65" y2="58" stroke="#10b981" stroke-width="1.5" opacity="0.6"/>
      <line x1="35" y1="64" x2="58" y2="64" stroke="#10b981" stroke-width="1.5" opacity="0.6"/>
      <line x1="35" y1="70" x2="55" y2="70" stroke="#10b981" stroke-width="1.5" opacity="0.6"/>
      <path d="M65,58 L72,65" stroke="#059669" stroke-width="3" stroke-linecap="round"/>
      <polygon points="72,65 70,67 68,65 70,63" fill="#059669"/>
      <line x1="58" y1="64" x2="65" y2="58" stroke="#10b981" stroke-width="1.5" opacity="0.4" stroke-dasharray="2,2"/>
    </svg>
  `,
    "vue-expert": `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <polygon points="50,30 65,55 35,55" fill="rgba(66,184,131,0.2)" stroke="#42b883" stroke-width="2"/>
      <polygon points="50,35 60,52 40,52" fill="rgba(53,73,94,0.3)" stroke="#35495e" stroke-width="1.5"/>
      <rect x="35" y="60" width="30" height="15" fill="rgba(66,184,131,0.1)" stroke="#42b883" stroke-width="1.5"/>
      <line x1="35" y1="65" x2="65" y2="65" stroke="#42b883" stroke-width="1"/>
      <line x1="50" y1="60" x2="50" y2="75" stroke="#42b883" stroke-width="1"/>
      <path d="M50,52 L50,60" stroke="#42b883" stroke-width="2"/>
      <polygon points="50,60 48,57 52,57" fill="#42b883"/>
      <circle cx="40" cy="68" r="2" fill="#42b883"/>
      <circle cx="50" cy="68" r="2" fill="#42b883"/>
      <circle cx="60" cy="68" r="2" fill="#42b883"/>
    </svg>
  `,
    "ui-designer": `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="25" y="25" width="50" height="50" fill="rgba(255,107,107,0.05)" stroke="#ff6b6b" stroke-width="2"/>
      <rect x="25" y="25" width="50" height="10" fill="rgba(255,107,107,0.2)" stroke="#ff6b6b" stroke-width="1"/>
      <circle cx="30" cy="30" r="1.5" fill="#ff6b6b"/>
      <line x1="35" y1="30" x2="50" y2="30" stroke="#ff6b6b" stroke-width="1"/>
      <rect x="30" y="40" width="18" height="15" fill="rgba(255,107,107,0.15)" stroke="#ff6b6b" stroke-width="1.5"/>
      <rect x="52" y="40" width="18" height="15" fill="rgba(255,107,107,0.15)" stroke="#ff6b6b" stroke-width="1.5"/>
      <rect x="30" y="60" width="40" height="10" fill="rgba(255,107,107,0.1)" stroke="#ff6b6b" stroke-width="1"/>
      <line x1="32" y1="43" x2="46" y2="43" stroke="#ff6b6b" stroke-width="1" opacity="0.6"/>
      <line x1="32" y1="47" x2="44" y2="47" stroke="#ff6b6b" stroke-width="0.5" opacity="0.6"/>
      <line x1="32" y1="50" x2="46" y2="50" stroke="#ff6b6b" stroke-width="0.5" opacity="0.6"/>
    </svg>
  `,
    "mlops-engineer": `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="30" cy="35" r="4" fill="rgba(251,191,36,0.3)" stroke="#fbbf24" stroke-width="2"/>
      <circle cx="30" cy="50" r="4" fill="rgba(251,191,36,0.3)" stroke="#fbbf24" stroke-width="2"/>
      <circle cx="30" cy="65" r="4" fill="rgba(251,191,36,0.3)" stroke="#fbbf24" stroke-width="2"/>
      <circle cx="50" cy="30" r="4" fill="rgba(251,191,36,0.3)" stroke="#fbbf24" stroke-width="2"/>
      <circle cx="50" cy="45" r="4" fill="rgba(251,191,36,0.3)" stroke="#fbbf24" stroke-width="2"/>
      <circle cx="50" cy="60" r="4" fill="rgba(251,191,36,0.3)" stroke="#fbbf24" stroke-width="2"/>
      <circle cx="50" cy="75" r="4" fill="rgba(251,191,36,0.3)" stroke="#fbbf24" stroke-width="2"/>
      <circle cx="70" cy="42" r="4" fill="rgba(251,191,36,0.3)" stroke="#fbbf24" stroke-width="2"/>
      <circle cx="70" cy="58" r="4" fill="rgba(251,191,36,0.5)" stroke="#fbbf24" stroke-width="2.5"/>
      <line x1="30" y1="35" x2="50" y2="30" stroke="#fbbf24" stroke-width="1" opacity="0.3"/>
      <line x1="30" y1="50" x2="50" y2="45" stroke="#fbbf24" stroke-width="1" opacity="0.3"/>
      <line x1="30" y1="65" x2="50" y2="60" stroke="#fbbf24" stroke-width="1" opacity="0.3"/>
      <line x1="50" y1="45" x2="70" y2="42" stroke="#fbbf24" stroke-width="1" opacity="0.3"/>
      <line x1="50" y1="60" x2="70" y2="58" stroke="#fbbf24" stroke-width="1.5" opacity="0.6"/>
    </svg>
  `,
    analyst: `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="45" r="20" fill="rgba(99,102,241,0.1)" stroke="#6366f1" stroke-width="2"/>
      <path d="M50,45 L50,30 A15,15 0 0,1 62,53 Z" fill="rgba(99,102,241,0.3)" stroke="#6366f1" stroke-width="1"/>
      <path d="M50,45 L62,53 A15,15 0 0,1 38,53 Z" fill="rgba(129,140,248,0.3)" stroke="#818cf8" stroke-width="1"/>
      <path d="M50,45 L38,53 A15,15 0 0,1 50,30 Z" fill="rgba(165,180,252,0.3)" stroke="#a5b4fc" stroke-width="1"/>
      <circle cx="50" cy="45" r="3" fill="#6366f1"/>
      <rect x="35" y="62" width="30" height="15" fill="rgba(99,102,241,0.1)" stroke="#6366f1" stroke-width="1.5"/>
      <rect x="45" y="58" width="10" height="6" fill="#6366f1"/>
      <line x1="40" y1="68" x2="60" y2="68" stroke="#6366f1" stroke-width="1" opacity="0.5"/>
      <line x1="40" y1="72" x2="55" y2="72" stroke="#6366f1" stroke-width="1" opacity="0.5"/>
    </svg>
  `,
    critic: `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="30" y="65" width="40" height="8" fill="rgba(220,38,38,0.2)" stroke="#dc2626" stroke-width="2"/>
      <rect x="42" y="35" width="16" height="12" fill="rgba(220,38,38,0.3)" stroke="#dc2626" stroke-width="2" rx="2"/>
      <rect x="48" y="47" width="4" height="18" fill="#dc2626"/>
      <line x1="35" y1="58" x2="42" y2="55" stroke="#ef4444" stroke-width="2" opacity="0.6"/>
      <line x1="65" y1="58" x2="58" y2="55" stroke="#ef4444" stroke-width="2" opacity="0.6"/>
      <line x1="50" y1="55" x2="50" y2="60" stroke="#ef4444" stroke-width="2" opacity="0.6"/>
      <circle cx="35" cy="40" r="3" fill="none" stroke="#dc2626" stroke-width="1.5"/>
      <line x1="33" y1="40" x2="37" y2="40" stroke="#dc2626" stroke-width="1.5"/>
      <circle cx="65" cy="40" r="3" fill="none" stroke="#10b981" stroke-width="1.5"/>
      <path d="M63,40 L64.5,41.5 L67,38.5" stroke="#10b981" stroke-width="1.5" fill="none"/>
    </svg>
  `,
    "deep-executor": `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="30" y="25" width="40" height="12" fill="rgba(79,70,229,0.2)" stroke="#4f46e5" stroke-width="2"/>
      <rect x="30" y="40" width="40" height="12" fill="rgba(79,70,229,0.3)" stroke="#4f46e5" stroke-width="2"/>
      <rect x="30" y="55" width="40" height="12" fill="rgba(79,70,229,0.4)" stroke="#4f46e5" stroke-width="2"/>
      <rect x="30" y="70" width="40" height="12" fill="rgba(79,70,229,0.5)" stroke="#4f46e5" stroke-width="2"/>
      <path d="M50,37 L50,40" stroke="#818cf8" stroke-width="2"/>
      <path d="M50,52 L50,55" stroke="#818cf8" stroke-width="2"/>
      <path d="M50,67 L50,70" stroke="#818cf8" stroke-width="2"/>
      <circle cx="40" cy="31" r="2" fill="#818cf8"/>
      <circle cx="50" cy="46" r="2" fill="#818cf8"/>
      <circle cx="60" cy="61" r="2" fill="#818cf8"/>
      <circle cx="50" cy="76" r="3" fill="#4f46e5"/>
    </svg>
  `,
    "git-master": `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="35" cy="30" r="5" fill="rgba(249,115,22,0.3)" stroke="#f97316" stroke-width="2"/>
      <circle cx="50" cy="50" r="5" fill="rgba(249,115,22,0.3)" stroke="#f97316" stroke-width="2"/>
      <circle cx="65" cy="30" r="5" fill="rgba(249,115,22,0.3)" stroke="#f97316" stroke-width="2"/>
      <circle cx="50" cy="70" r="5" fill="rgba(249,115,22,0.5)" stroke="#f97316" stroke-width="2.5"/>
      <line x1="35" y1="35" x2="50" y2="45" stroke="#f97316" stroke-width="2"/>
      <line x1="65" y1="35" x2="50" y2="45" stroke="#f97316" stroke-width="2"/>
      <line x1="50" y1="55" x2="50" y2="65" stroke="#f97316" stroke-width="2"/>
      <path d="M47,62 L50,65 L53,62" stroke="#fb923c" stroke-width="2" fill="none"/>
      <circle cx="42" cy="40" r="2" fill="#fb923c"/>
      <circle cx="58" cy="40" r="2" fill="#fb923c"/>
    </svg>
  `,
    "qa-tester": `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="30" y="25" width="40" height="50" fill="rgba(34,197,94,0.1)" stroke="#22c55e" stroke-width="2"/>
      <rect x="35" y="32" width="8" height="8" fill="none" stroke="#22c55e" stroke-width="1.5"/>
      <path d="M37,36 L39,38 L43,33" stroke="#22c55e" stroke-width="2" fill="none"/>
      <line x1="48" y1="36" x2="65" y2="36" stroke="#22c55e" stroke-width="1.5" opacity="0.6"/>
      <rect x="35" y="45" width="8" height="8" fill="none" stroke="#22c55e" stroke-width="1.5"/>
      <path d="M37,49 L39,51 L43,46" stroke="#22c55e" stroke-width="2" fill="none"/>
      <line x1="48" y1="49" x2="62" y2="49" stroke="#22c55e" stroke-width="1.5" opacity="0.6"/>
      <rect x="35" y="58" width="8" height="8" fill="none" stroke="#ef4444" stroke-width="1.5"/>
      <line x1="37" y1="60" x2="41" y2="64" stroke="#ef4444" stroke-width="2"/>
      <line x1="41" y1="60" x2="37" y2="64" stroke="#ef4444" stroke-width="2"/>
      <line x1="48" y1="62" x2="60" y2="62" stroke="#22c55e" stroke-width="1.5" opacity="0.6"/>
      <circle cx="65" cy="68" r="6" fill="rgba(239,68,68,0.2)" stroke="#ef4444" stroke-width="1.5"/>
      <line x1="62" y1="65" x2="59" y2="62" stroke="#ef4444" stroke-width="1"/>
      <line x1="68" y1="65" x2="71" y2="62" stroke="#ef4444" stroke-width="1"/>
    </svg>
  `,
    "security-reviewer": `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M50,25 L70,35 L70,55 Q70,70 50,80 Q30,70 30,55 L30,35 Z" fill="rgba(239,68,68,0.1)" stroke="#ef4444" stroke-width="2"/>
      <path d="M50,32 L62,40 L62,52 Q62,62 50,70 Q38,62 38,52 L38,40 Z" fill="rgba(239,68,68,0.2)" stroke="#ef4444" stroke-width="1.5"/>
      <rect x="45" y="50" width="10" height="8" fill="#ef4444" rx="1"/>
      <path d="M47,50 L47,46 Q47,42 50,42 Q53,42 53,46 L53,50" fill="none" stroke="#ef4444" stroke-width="2"/>
      <circle cx="50" cy="53" r="1.5" fill="white"/>
      <rect x="49" y="53" width="2" height="3" fill="white"/>
      <circle cx="35" cy="45" r="2" fill="#ef4444"/>
      <circle cx="65" cy="45" r="2" fill="#ef4444"/>
    </svg>
  `,
    "tdd-guide": `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="30" r="10" fill="rgba(239,68,68,0.3)" stroke="#ef4444" stroke-width="2"/>
      <text x="50" y="34" font-size="10" fill="#ef4444" text-anchor="middle" font-weight="bold">R</text>
      <circle cx="35" cy="60" r="10" fill="rgba(34,197,94,0.3)" stroke="#22c55e" stroke-width="2"/>
      <text x="35" y="64" font-size="10" fill="#22c55e" text-anchor="middle" font-weight="bold">G</text>
      <circle cx="65" cy="60" r="10" fill="rgba(59,130,246,0.3)" stroke="#3b82f6" stroke-width="2"/>
      <text x="65" y="64" font-size="10" fill="#3b82f6" text-anchor="middle" font-weight="bold">R</text>
      <path d="M42,25 Q30,20 30,35 Q30,45 35,50" fill="none" stroke="#9ca3af" stroke-width="2"/>
      <path d="M45,60 Q50,70 60,65" fill="none" stroke="#9ca3af" stroke-width="2"/>
      <path d="M60,50 Q65,40 55,30" fill="none" stroke="#9ca3af" stroke-width="2"/>
      <polygon points="33,48 37,52 39,47" fill="#9ca3af"/>
      <polygon points="58,63 62,67 64,62" fill="#9ca3af"/>
      <polygon points="57,32 53,28 51,33" fill="#9ca3af"/>
    </svg>
  `,
    vision: `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="50" rx="25" ry="18" fill="rgba(147,51,234,0.1)" stroke="#9333ea" stroke-width="2"/>
      <circle cx="50" cy="50" r="12" fill="rgba(147,51,234,0.2)" stroke="#9333ea" stroke-width="2"/>
      <circle cx="50" cy="50" r="6" fill="#9333ea"/>
      <circle cx="53" cy="47" r="2" fill="white"/>
      <line x1="25" y1="40" x2="75" y2="40" stroke="#a855f7" stroke-width="1" opacity="0.3"/>
      <line x1="25" y1="50" x2="75" y2="50" stroke="#a855f7" stroke-width="1" opacity="0.3"/>
      <line x1="25" y1="60" x2="75" y2="60" stroke="#a855f7" stroke-width="1" opacity="0.3"/>
      <path d="M30,35 L25,35 L25,40" fill="none" stroke="#9333ea" stroke-width="2"/>
      <path d="M70,35 L75,35 L75,40" fill="none" stroke="#9333ea" stroke-width="2"/>
      <path d="M30,65 L25,65 L25,60" fill="none" stroke="#9333ea" stroke-width="2"/>
      <path d="M70,65 L75,65 L75,60" fill="none" stroke="#9333ea" stroke-width="2"/>
    </svg>
  `,
    "build-fixer": `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M35,30 L30,35 L45,50 L50,45 Z" fill="rgba(234,179,8,0.3)" stroke="#eab308" stroke-width="2"/>
      <circle cx="32" cy="32" r="8" fill="none" stroke="#eab308" stroke-width="2"/>
      <circle cx="60" cy="60" r="12" fill="rgba(234,179,8,0.2)" stroke="#eab308" stroke-width="2"/>
      <circle cx="60" cy="60" r="5" fill="white" stroke="#eab308" stroke-width="2"/>
      <rect x="58" y="46" width="4" height="6" fill="#eab308"/>
      <rect x="58" y="68" width="4" height="6" fill="#eab308"/>
      <rect x="46" y="58" width="6" height="4" fill="#eab308"/>
      <rect x="68" y="58" width="6" height="4" fill="#eab308"/>
      <line x1="35" y1="65" x2="40" y2="70" stroke="#ef4444" stroke-width="2"/>
      <line x1="40" y1="65" x2="35" y2="70" stroke="#ef4444" stroke-width="2"/>
      <path d="M32,75 L35,78 L42,71" stroke="#22c55e" stroke-width="2" fill="none"/>
    </svg>
  `,
    "airflow-specialist": `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="30" cy="35" r="8" fill="rgba(0,191,166,0.2)" stroke="#00bfa6" stroke-width="2"/>
      <circle cx="50" cy="50" r="8" fill="rgba(0,191,166,0.3)" stroke="#00bfa6" stroke-width="2"/>
      <circle cx="70" cy="35" r="8" fill="rgba(0,191,166,0.2)" stroke="#00bfa6" stroke-width="2"/>
      <circle cx="50" cy="70" r="8" fill="rgba(0,191,166,0.4)" stroke="#00bfa6" stroke-width="2.5"/>
      <path d="M35,40 L45,47" stroke="#00bfa6" stroke-width="2"/>
      <path d="M65,40 L55,47" stroke="#00bfa6" stroke-width="2"/>
      <path d="M50,58 L50,62" stroke="#00bfa6" stroke-width="2"/>
      <polygon points="45,45 47,49 43,48" fill="#00bfa6"/>
      <polygon points="55,45 57,48 53,49" fill="#00bfa6"/>
      <polygon points="48,62 52,62 50,66" fill="#00bfa6"/>
      <circle cx="30" cy="35" r="3" fill="#00bfa6"/>
      <path d="M28,35 L30,35 L30,32" stroke="white" stroke-width="1"/>
    </svg>
  `,
    "mlflow-specialist": `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="25" y="28" width="50" height="44" fill="rgba(13,148,136,0.1)" stroke="#0d9488" stroke-width="2"/>
      <rect x="25" y="28" width="50" height="10" fill="rgba(13,148,136,0.2)"/>
      <text x="30" y="36" font-size="6" fill="#0d9488">v1.0</text>
      <line x1="25" y1="48" x2="75" y2="48" stroke="#0d9488" stroke-width="1" opacity="0.5"/>
      <line x1="25" y1="58" x2="75" y2="58" stroke="#0d9488" stroke-width="1" opacity="0.5"/>
      <polyline points="30,65 40,58 50,60 60,52 70,45" fill="none" stroke="#14b8a6" stroke-width="2"/>
      <circle cx="70" cy="45" r="2.5" fill="#14b8a6"/>
      <rect x="58" y="30" width="12" height="6" fill="#0d9488" rx="1"/>
      <circle cx="64" cy="33" r="1" fill="white"/>
    </svg>
  `,
    "ml-reviewer": `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="28" y="28" width="44" height="44" fill="rgba(168,85,247,0.1)" stroke="#a855f7" stroke-width="2"/>
      <line x1="50" y1="28" x2="50" y2="72" stroke="#a855f7" stroke-width="1.5"/>
      <line x1="28" y1="50" x2="72" y2="50" stroke="#a855f7" stroke-width="1.5"/>
      <text x="39" y="42" font-size="10" fill="#22c55e" text-anchor="middle">TP</text>
      <text x="61" y="42" font-size="10" fill="#ef4444" text-anchor="middle">FP</text>
      <text x="39" y="64" font-size="10" fill="#ef4444" text-anchor="middle">FN</text>
      <text x="61" y="64" font-size="10" fill="#22c55e" text-anchor="middle">TN</text>
      <circle cx="50" cy="50" r="6" fill="rgba(168,85,247,0.3)" stroke="#a855f7" stroke-width="1.5"/>
      <text x="50" y="52" font-size="5" fill="#a855f7" text-anchor="middle">✓</text>
    </svg>
  `,
    "ui-reviewer": `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="25" y="25" width="50" height="50" fill="rgba(236,72,153,0.05)" stroke="#ec4899" stroke-width="2"/>
      <rect x="25" y="25" width="50" height="8" fill="rgba(236,72,153,0.2)"/>
      <circle cx="30" cy="29" r="1.5" fill="#ec4899"/>
      <circle cx="35" cy="29" r="1.5" fill="#ec4899"/>
      <circle cx="40" cy="29" r="1.5" fill="#ec4899"/>
      <rect x="30" y="38" width="18" height="12" fill="none" stroke="#ec4899" stroke-width="1.5" stroke-dasharray="2,2"/>
      <rect x="52" y="38" width="18" height="12" fill="none" stroke="#ec4899" stroke-width="1.5" stroke-dasharray="2,2"/>
      <rect x="30" y="55" width="40" height="15" fill="none" stroke="#ec4899" stroke-width="1.5" stroke-dasharray="2,2"/>
      <circle cx="48" cy="44" r="4" fill="none" stroke="#22c55e" stroke-width="1.5"/>
      <path d="M46,44 L47.5,45.5 L50,42" stroke="#22c55e" stroke-width="1.5" fill="none"/>
      <circle cx="70" cy="44" r="4" fill="none" stroke="#ef4444" stroke-width="1.5"/>
      <text x="70" y="47" font-size="8" fill="#ef4444" text-anchor="middle">!</text>
    </svg>
  `,
    // Default fallback
    default: `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="22" fill="rgba(100,120,200,0.1)" stroke="#6478c8" stroke-width="2"/>
      <circle cx="50" cy="50" r="15" fill="none" stroke="#6478c8" stroke-width="1.5" opacity="0.5"/>
      <circle cx="50" cy="50" r="8" fill="none" stroke="#6478c8" stroke-width="1" opacity="0.5"/>
      <circle cx="50" cy="50" r="3" fill="#6478c8"/>
      <line x1="50" y1="28" x2="50" y2="34" stroke="#6478c8" stroke-width="2"/>
      <line x1="72" y1="50" x2="66" y2="50" stroke="#6478c8" stroke-width="2"/>
      <line x1="50" y1="72" x2="50" y2="66" stroke="#6478c8" stroke-width="2"/>
      <line x1="28" y1="50" x2="34" y2="50" stroke="#6478c8" stroke-width="2"/>
    </svg>
  `
  };
  const agentDescriptions = {
    orchestrator: "Main Claude · 모든 에이전트를 지휘하는 중앙 조율자",
    architect: "Architecture Advisor · 코드 구조와 설계 결정을 담당",
    executor: "Code Executor · 실제 코드를 작성하고 실행",
    designer: "UI/UX Designer · 사용자 인터페이스 디자인",
    explore: "Code Scout · 코드베이스를 탐색하고 분석",
    scout: "Code Scout · 코드베이스를 탐색하고 분석",
    researcher: "Documentation Researcher · 문서와 API를 연구",
    scientist: "Data Scientist · 데이터 분석과 통계 처리",
    planner: "Strategic Planner · 프로젝트 계획과 전략 수립",
    "code-reviewer": "Code Reviewer · 코드 품질 검토",
    reviewer: "Code Reviewer · 코드 품질 검토",
    writer: "Technical Writer · 기술 문서 작성",
    "vue-expert": "Vue Specialist · Vue.js 전문가",
    "ui-designer": "UI Designer · 템플릿 구조와 스타일링",
    "mlops-engineer": "MLOps Engineer · ML 파이프라인 구축"
  };
  function getAgentCharacter(agentType) {
    const normalized = agentType.toLowerCase().replace(/[-_\s]+/g, "-").replace(/^explore-.*/, "explore").replace(/^architect-.*/, "architect").replace(/^executor-.*/, "executor").replace(/^designer-.*/, "designer").replace(/^researcher-.*/, "researcher").replace(/^scientist-.*/, "scientist").replace(/^security-reviewer.*/, "security-reviewer").replace(/^qa-tester.*/, "qa-tester").replace(/^build-fixer.*/, "build-fixer").replace(/^tdd-guide.*/, "tdd-guide").replace(/^git-master$/, "git-master").replace(/scout/, "explore");
    return agentCharacters[normalized] || agentCharacters.default;
  }
  function getAgentDescription(agentType) {
    const normalized = agentType.toLowerCase().replace(/[-_\s]+/g, "-").replace(/^explore-.*/, "explore").replace(/^architect-.*/, "architect").replace(/^executor-.*/, "executor").replace(/^designer-.*/, "designer").replace(/^researcher-.*/, "researcher").replace(/^scientist-.*/, "scientist").replace(/^security-reviewer.*/, "code-reviewer").replace(/^qa-tester.*/, "code-reviewer").replace(/^build-fixer.*/, "executor").replace(/^tdd-guide.*/, "code-reviewer").replace(/^git-master$/, "executor").replace(/scout/, "explore").replace(/reviewer/, "code-reviewer");
    return agentDescriptions[normalized] || "Specialized Agent · 특수 작업 수행";
  }
  function getFileName(path) {
    return path.split("/").pop() || path;
  }
  function formatDuration(ms) {
    if (!ms) return "";
    const seconds = Math.round(ms / 1e3);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  }
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  function escapeAttr(text) {
    return text.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
  }
  function formatTimestamp(timestamp) {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = /* @__PURE__ */ new Date();
    const diff = now - date;
    if (diff < 6e4) {
      return "just now";
    }
    if (diff < 36e5) {
      const minutes2 = Math.floor(diff / 6e4);
      return `${minutes2}m ago`;
    }
    if (diff < 864e5) {
      const hours2 = Math.floor(diff / 36e5);
      return `${hours2}h ago`;
    }
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${date.getMonth() + 1}/${date.getDate()} ${hours}:${minutes}`;
  }
  function extractAgentType(name) {
    if (!name) return "default";
    const lower = name.toLowerCase();
    if (lower.includes("architect")) return "architect";
    if (lower.includes("executor")) return "executor";
    if (lower.includes("designer") && lower.includes("ui")) return "ui-designer";
    if (lower.includes("designer")) return "designer";
    if (lower.includes("explore") || lower.includes("scout")) return "explore";
    if (lower.includes("researcher")) return "researcher";
    if (lower.includes("scientist")) return "scientist";
    if (lower.includes("planner")) return "planner";
    if (lower.includes("review") || lower.includes("qa") || lower.includes("security")) return "code-reviewer";
    if (lower.includes("writer")) return "writer";
    if (lower.includes("vue")) return "vue-expert";
    if (lower.includes("mlops")) return "mlops-engineer";
    if (lower.includes("git")) return "executor";
    return "default";
  }
  function formatAgentName(name) {
    if (!name) return "Agent";
    return name.replace(/[-_]/g, " ").split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  }
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartRight = 0;
  let dragStartBottom = 0;
  function createIndicator() {
    if (indicator) return;
    const el = document.createElement("div");
    el.id = "agent-monitor-indicator";
    el.innerHTML = `
    <div class="indicator-dot"></div>
    <span class="indicator-text">Agent Monitor</span>
    <span class="indicator-count" style="display: none;">0</span>
  `;
    el.style.right = `${indicatorPosition.right}px`;
    el.style.bottom = `${indicatorPosition.bottom}px`;
    document.body.appendChild(el);
    setupIndicatorDrag(el);
    setIndicator(el);
    updateIndicator();
  }
  function setupIndicatorDrag(el) {
    let hasMoved = false;
    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      isDragging = true;
      hasMoved = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragStartRight = indicatorPosition.right;
      dragStartBottom = indicatorPosition.bottom;
      el.style.cursor = "grabbing";
      el.style.transition = "none";
      e.preventDefault();
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    };
    const onMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = dragStartX - e.clientX;
      const deltaY = dragStartY - e.clientY;
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        hasMoved = true;
      }
      const newRight = Math.max(10, Math.min(window.innerWidth - el.offsetWidth - 10, dragStartRight + deltaX));
      const newBottom = Math.max(10, Math.min(window.innerHeight - el.offsetHeight - 10, dragStartBottom + deltaY));
      el.style.right = `${newRight}px`;
      el.style.bottom = `${newBottom}px`;
    };
    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      el.style.cursor = "grab";
      el.style.transition = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      const newRight = parseInt(el.style.right) || indicatorPosition.right;
      const newBottom = parseInt(el.style.bottom) || indicatorPosition.bottom;
      setIndicatorPosition({ right: newRight, bottom: newBottom });
      if (!hasMoved) {
        toggleOverlay();
      }
    };
    el.addEventListener("mousedown", onMouseDown);
    el.removeEventListener("click", toggleOverlay);
  }
  function updateIndicator() {
    if (!indicator) return;
    const dot = indicator.querySelector(".indicator-dot");
    const text = indicator.querySelector(".indicator-text");
    const count = indicator.querySelector(".indicator-count");
    dot.classList.remove("connected", "disconnected", "working");
    if (!state.connected) {
      dot.classList.add("disconnected");
      text.textContent = "Disconnected";
    } else if (state.agents.length > 0 || state.orchestrator.status === "working") {
      dot.classList.add("working");
      text.textContent = `Working`;
      count.textContent = state.agents.length;
      count.style.display = state.agents.length > 0 ? "inline" : "none";
    } else {
      dot.classList.add("connected");
      text.textContent = "Agent Monitor";
      count.style.display = "none";
    }
  }
  function createOverlay() {
    if (overlay) return;
    const el = document.createElement("div");
    el.id = "agent-monitor-overlay";
    document.body.appendChild(el);
    setOverlay(el);
    renderOverlay();
    el.addEventListener("click", (e) => {
      if (e.target.classList.contains("am-close") || e.target.id === "agent-monitor-overlay") {
        hideOverlay();
      }
      if (e.target.closest('[data-action="toggle-mode"]')) {
        toggleViewMode();
      }
      if (e.target.closest('[data-action="toggle-available"]')) {
        toggleAvailableAgents();
      }
      const historyItem = e.target.closest(".am-history-item");
      if (historyItem && historyItem.dataset.history) {
        try {
          const item = JSON.parse(historyItem.dataset.history);
          showHistoryDetail(item);
        } catch (err) {
          console.error("Failed to parse history item:", err);
        }
      }
    });
  }
  function toggleAvailableAgents() {
    setAvailableAgentsCollapsed(!availableAgentsCollapsed);
    renderOverlay();
  }
  function getAvailableAgentCount() {
    const defaultAgentTypes = [
      "architect",
      "executor",
      "designer",
      "explore",
      "researcher",
      "scientist",
      "planner",
      "code-reviewer",
      "writer",
      "vue-expert",
      "ui-designer",
      "mlops-engineer"
    ];
    if (state.availableAgents && state.availableAgents.length > 0) {
      return state.availableAgents.length;
    }
    return defaultAgentTypes.length;
  }
  function renderOverlay() {
    if (!overlay) return;
    overlay.classList.toggle("mini-mode", viewMode === "mini");
    overlay.innerHTML = `
    <div class="am-container">
      ${renderHeader()}
      ${renderOrchestrator()}
      ${state.agents.length > 0 ? `
        <div class="am-section-title">Active Agents</div>
        <div class="am-agents-grid">
          ${state.agents.map((agent) => renderAgentCard(agent)).join("")}
        </div>
      ` : ""}
      <div class="am-section-title am-collapsible" data-action="toggle-available">
        <span class="am-collapse-icon">${availableAgentsCollapsed ? "▶" : "▼"}</span>
        Available Agents (${getAvailableAgentCount()})
      </div>
      ${!availableAgentsCollapsed ? `
        <div class="am-agents-grid">
          ${renderAllAgentsGrid()}
        </div>
      ` : ""}
      ${renderHistory()}
    </div>
  `;
  }
  function renderHeader() {
    const modeIcon = viewMode === "mini" ? "⇱" : "⇲";
    const modeTitle = viewMode === "mini" ? "Expand to Full Mode" : "Collapse to Panel";
    return `
    <div class="am-header">
      <div class="am-header-left">
        <div class="am-status-dot ${state.connected ? "connected" : "disconnected"}"></div>
        <h1 class="am-title">Agent Monitor</h1>
      </div>
      <div class="am-header-right">
        <button class="am-mode-toggle" data-action="toggle-mode" title="${modeTitle}">${modeIcon}</button>
        <button class="am-close">&times;</button>
      </div>
    </div>
  `;
  }
  function renderOrchestrator() {
    const isWorking = state.orchestrator.status === "working";
    const activeCount = state.agents.length;
    return `
    <div class="am-orchestrator-card ${isWorking ? "working" : ""}">
      <div class="am-orchestrator-card-header" style="display: flex; align-items: center; gap: 16px;">
        <div class="am-orchestrator-avatar">
          ${agentCharacters.orchestrator}
        </div>
        <div class="am-orchestrator-info">
          <div class="am-orchestrator-name">Orchestrator</div>
          <div class="am-orchestrator-role">${agentDescriptions.orchestrator}</div>
        </div>
      </div>
      <div class="am-orchestrator-footer">
        <span class="am-orchestrator-status ${isWorking ? "working" : "idle"}">
          <span class="status-dot"></span>
          <span>${isWorking ? `Coordinating ${activeCount > 0 ? activeCount + " agent" + (activeCount !== 1 ? "s" : "") : "..."}` : "Idle"}</span>
        </span>
      </div>
    </div>
  `;
  }
  function renderAgentCard(agent) {
    const agentType = extractAgentType(agent.agentName || agent.agentId || agent.agentRole);
    const character = getAgentCharacter(agentType);
    const description = getAgentDescription(agentType);
    const displayName = formatAgentName(agent.agentName || agentType);
    return `
    <div class="am-agent-card ${agent.status || "running"} running" data-type="${agentType}">
      <div class="am-agent-card-header">
        <div class="am-agent-avatar">
          ${character}
        </div>
        <div class="am-agent-info">
          <div class="am-agent-name">${escapeHtml(displayName)}</div>
          <div class="am-agent-role">${escapeHtml(description)}</div>
        </div>
      </div>
      ${agent.task ? `
        <div class="am-agent-task">${escapeHtml(agent.task)}</div>
      ` : ""}
      ${agent.files && agent.files.length > 0 ? `
        <div class="am-agent-files">
          ${agent.files.slice(-3).map((f) => `
            <a href="vscode://file${f}" class="am-file-tag" title="${escapeHtml(f)}">
              ${escapeHtml(getFileName(f))}
            </a>
          `).join("")}
        </div>
      ` : ""}
      <div class="am-agent-footer">
        <span class="am-agent-status-badge ${agent.status || "running"}">
          ${agent.status === "completed" ? "✓ Completed" : agent.status === "error" ? "✗ Error" : "⟳ Running"}
        </span>
        ${agent.duration ? `
          <span class="am-agent-duration">${formatDuration(agent.duration)}</span>
        ` : ""}
      </div>
    </div>
  `;
  }
  function renderAllAgentsGrid() {
    const defaultAgentTypes = [
      "architect",
      "executor",
      "designer",
      "explore",
      "researcher",
      "scientist",
      "planner",
      "code-reviewer",
      "writer",
      "vue-expert",
      "ui-designer",
      "mlops-engineer"
    ];
    let agentList;
    if (state.availableAgents && state.availableAgents.length > 0) {
      agentList = state.availableAgents;
    } else {
      agentList = defaultAgentTypes.map((type) => ({
        name: type,
        description: getAgentDescription(type),
        source: "default"
      }));
    }
    return agentList.map((agent) => {
      const type = agent.name;
      const character = getAgentCharacter(type);
      const description = agent.description || getAgentDescription(type);
      const displayName = formatAgentName(type);
      const sourceLabel = agent.source === "custom" ? "★" : "";
      return `
      <div class="am-agent-card idle" data-type="${type}">
        <div class="am-agent-card-header">
          <div class="am-agent-avatar">
            ${character}
          </div>
          <div class="am-agent-info">
            <div class="am-agent-name">${escapeHtml(displayName)}${sourceLabel ? ` <span class="am-custom-badge">${sourceLabel}</span>` : ""}</div>
            <div class="am-agent-role">${escapeHtml(description)}</div>
          </div>
        </div>
        <div class="am-agent-footer">
          <span class="am-agent-status-badge idle">Standby</span>
          ${agent.model ? `<span class="am-agent-model ${agent.model.toLowerCase()}">${agent.model}</span>` : ""}
        </div>
      </div>
    `;
    }).join("");
  }
  function renderHistory() {
    if (!state.history || state.history.length === 0) {
      return "";
    }
    const displayedHistory = state.history.slice(0, state.historyDisplayCount);
    return `
    <div class="am-history-section">
      <div class="am-section-title">Recent History (${state.history.length})</div>
      <div class="am-history-list" id="am-history-list">
        ${displayedHistory.map((item) => renderHistoryItem(item)).join("")}
      </div>
    </div>
  `;
  }
  function renderHistoryItem(item) {
    var _a, _b, _c, _d;
    const icon = item.status === "completed" ? "✓" : item.status === "error" ? "✗" : "⟳";
    const agentName = formatAgentName(((_b = (_a = item.agents) == null ? void 0 : _a[0]) == null ? void 0 : _b.name) || item.agentName || item.agentType || "Agent");
    const agentRole = ((_d = (_c = item.agents) == null ? void 0 : _c[0]) == null ? void 0 : _d.role) || item.agentRole || "";
    const timeStr = formatTimestamp(item.timestamp || item.time);
    const itemId = item.id || item.agentId || Math.random().toString(36).substr(2, 9);
    return `
    <div class="am-history-item ${item.status || "completed"}" data-history-id="${itemId}" data-history='${escapeAttr(JSON.stringify(item))}'>
      <div class="am-history-icon">${icon}</div>
      <div class="am-history-content">
        <div class="am-history-agent">${escapeHtml(agentName)}${agentRole ? ` · ${escapeHtml(agentRole)}` : ""}</div>
        <div class="am-history-task">${escapeHtml(item.task || item.message || "Completed")}</div>
        <div class="am-history-meta">
          <span class="am-history-time">${timeStr}</span>
          ${item.duration ? `<span class="am-history-duration">${formatDuration(item.duration)}</span>` : ""}
        </div>
      </div>
    </div>
  `;
  }
  function toggleViewMode() {
    const newMode = viewMode === "full" ? "mini" : "full";
    setViewMode(newMode);
    renderOverlay();
  }
  function setupHistoryScroll() {
    const historyList = document.getElementById("am-history-list");
    if (!historyList) return;
    historyList.addEventListener("scroll", () => {
      const { scrollTop, scrollHeight, clientHeight } = historyList;
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        if (state.historyDisplayCount < state.history.length) {
          state.historyDisplayCount += 10;
          renderHistoryItems();
        }
      }
    });
  }
  function renderHistoryItems() {
    const historyList = document.getElementById("am-history-list");
    if (!historyList) return;
    const displayedHistory = state.history.slice(0, state.historyDisplayCount);
    historyList.innerHTML = displayedHistory.map((item) => renderHistoryItem(item)).join("");
  }
  function showOverlay() {
    if (!overlay) createOverlay();
    state.historyDisplayCount = 10;
    renderOverlay();
    setupHistoryScroll();
    overlay.classList.add("am-visible");
    setIsVisible(true);
    try {
      chrome.runtime.sendMessage({ type: "getState" }, (response) => {
        if (chrome.runtime.lastError) {
          console.log("[Agent Monitor] Extension context invalidated, please refresh the page");
          return;
        }
        if (response == null ? void 0 : response.success) {
          state.orchestrator = response.data.orchestrator;
          state.agents = response.data.agents;
          state.history = response.data.history;
          state.availableAgents = response.data.availableAgents || [];
          state.connected = true;
          console.log("[Agent Monitor] getState received, availableAgents:", state.availableAgents.length);
          renderOverlay();
          setupHistoryScroll();
        }
      });
    } catch (e) {
      console.log("[Agent Monitor] Extension context invalidated, please refresh the page");
    }
  }
  function hideOverlay() {
    if (overlay) {
      overlay.classList.remove("am-visible");
    }
    setIsVisible(false);
  }
  function toggleOverlay() {
    if (isVisible) {
      hideOverlay();
    } else {
      showOverlay();
    }
  }
  function showHistoryDetail(item) {
    var _a, _b, _c, _d;
    const agentName = formatAgentName(((_b = (_a = item.agents) == null ? void 0 : _a[0]) == null ? void 0 : _b.name) || item.agentName || item.agentType || "Agent");
    const agentRole = ((_d = (_c = item.agents) == null ? void 0 : _c[0]) == null ? void 0 : _d.role) || item.agentRole || "";
    const fullTime = new Date(item.timestamp || item.time).toLocaleString();
    const modal = document.createElement("div");
    modal.className = "am-detail-modal";
    modal.innerHTML = `
    <div class="am-detail-content">
      <div class="am-detail-header">
        <div class="am-detail-title">
          <h3>${escapeHtml(agentName)}</h3>
        </div>
        <button class="am-detail-close">&times;</button>
      </div>
      <div class="am-detail-body">
        <div class="am-detail-meta">
          <div class="am-detail-meta-item">
            <span class="am-detail-label">Role</span>
            <span class="am-detail-value">${escapeHtml(agentRole || "Agent")}</span>
          </div>
          <div class="am-detail-meta-item">
            <span class="am-detail-label">Status</span>
            <span class="am-detail-status ${item.status || "completed"}">${item.status === "error" ? "✗ Error" : "✓ Completed"}</span>
          </div>
          <div class="am-detail-meta-item">
            <span class="am-detail-label">Duration</span>
            <span class="am-detail-value">${item.duration ? formatDuration(item.duration) : "-"}</span>
          </div>
          <div class="am-detail-meta-item">
            <span class="am-detail-label">Time</span>
            <span class="am-detail-value">${fullTime}</span>
          </div>
        </div>
        <div class="am-detail-row">
          <span class="am-detail-label">Task</span>
          <div class="am-detail-value task">${escapeHtml(item.task || item.message || "No task description")}</div>
        </div>
        ${item.files && item.files.length > 0 ? `
          <div class="am-detail-row">
            <span class="am-detail-label">Files</span>
            <div class="am-detail-value">${item.files.map((f) => `<div>• ${escapeHtml(f)}</div>`).join("")}</div>
          </div>
        ` : ""}
        ${item.error ? `
          <div class="am-detail-row">
            <span class="am-detail-label">Error</span>
            <div class="am-detail-value task" style="border-color: rgba(255,71,87,0.5); color: #ff4757;">${escapeHtml(item.error)}</div>
          </div>
        ` : ""}
      </div>
    </div>
  `;
    document.body.appendChild(modal);
    setDetailModal(modal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target.closest(".am-detail-close")) {
        closeHistoryDetail();
      }
    });
  }
  function closeHistoryDetail() {
    if (detailModal) {
      detailModal.remove();
      setDetailModal(null);
    }
  }
  window.toggleViewMode = toggleViewMode;
  function setupMessageHandler() {
    try {
      chrome.runtime.onMessage.addListener((message) => {
        var _a, _b, _c;
        try {
          switch (message.type) {
            case "toggle":
              toggleOverlay();
              break;
            case "connection":
              state.connected = message.status === "connected";
              updateIndicator();
              renderOverlay();
              break;
            case "init":
              console.log("[Agent Monitor] Init received, availableAgents:", ((_a = message.data.availableAgents) == null ? void 0 : _a.length) || 0);
              state.orchestrator = message.data.orchestrator;
              state.agents = message.data.agents;
              state.history = message.data.history;
              state.availableAgents = message.data.availableAgents || [];
              state.connected = true;
              updateIndicator();
              renderOverlay();
              if (state.orchestrator.status === "working" || state.agents.length > 0) {
                showOverlay();
              }
              break;
            case "orchestrator":
              state.orchestrator = message.data;
              updateIndicator();
              renderOverlay();
              if (message.data.status === "working") {
                showOverlay();
              }
              break;
            case "agent":
              handleAgentMessage(message.data);
              break;
            case "history":
              state.history.unshift(message.data);
              state.history = state.history.slice(0, 20);
              renderOverlay();
              break;
            case "clear":
              if (((_b = message.data) == null ? void 0 : _b.target) === "agents") {
                state.agents = [];
              } else if (((_c = message.data) == null ? void 0 : _c.target) === "all") {
                state.agents = [];
                state.orchestrator = { status: "idle", task: "" };
              }
              updateIndicator();
              renderOverlay();
              break;
          }
        } catch (e) {
          console.log("[Agent Monitor] Error handling message:", e.message);
        }
      });
    } catch (e) {
      console.log("[Agent Monitor] Extension context invalidated");
    }
  }
  function handleAgentMessage(data) {
    try {
      const agentIndex = state.agents.findIndex((a) => a.agentId === data.agentId);
      if (data.status === "running") {
        if (agentIndex === -1) {
          state.agents.push(data);
        } else {
          state.agents[agentIndex] = data;
        }
        updateIndicator();
        renderOverlay();
        showOverlay();
      } else {
        if (agentIndex !== -1 || data.status === "completed" || data.status === "error") {
          const historyEntry = {
            agentId: data.agentId,
            agentName: data.agentName,
            agentType: extractAgentType(data.agentName || data.agentId),
            task: data.task,
            status: data.status,
            duration: data.duration,
            timestamp: Date.now()
          };
          state.history.unshift(historyEntry);
          state.history = state.history.slice(0, 20);
        }
        if (agentIndex !== -1) {
          state.agents[agentIndex] = data;
          updateIndicator();
          renderOverlay();
          setTimeout(() => {
            try {
              state.agents = state.agents.filter((a) => a.agentId !== data.agentId);
              updateIndicator();
              renderOverlay();
              if (state.agents.length === 0 && state.orchestrator.status === "idle") {
                setTimeout(hideOverlay, 2e3);
              }
            } catch (e) {
            }
          }, 3e3);
        }
      }
    } catch (e) {
      console.log("[Agent Monitor] Error handling agent message:", e.message);
    }
  }
  function safeSendMessage(message, callback) {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.log("[Agent Monitor] Extension context invalidated, please refresh the page");
          return;
        }
        if (callback) callback(response);
      });
    } catch (e) {
      console.log("[Agent Monitor] Extension context invalidated, please refresh the page");
    }
  }
  function init() {
    safeSendMessage({ type: "getConnectionStatus" }, (response) => {
      if (response) {
        state.connected = response.connected;
      }
      createIndicator();
      updateIndicator();
    });
    safeSendMessage({ type: "getState" }, (response) => {
      if (response == null ? void 0 : response.success) {
        state.orchestrator = response.data.orchestrator;
        state.agents = response.data.agents;
        state.history = response.data.history;
        state.availableAgents = response.data.availableAgents || [];
        state.connected = true;
        console.log("[Agent Monitor] Initial state loaded, availableAgents:", state.availableAgents.length);
        updateIndicator();
      }
    });
    setupMessageHandler();
  }
  init();
})();
