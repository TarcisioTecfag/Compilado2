document.addEventListener('DOMContentLoaded', async () => {
  let appData = { products: [], sheetTables: [] };
  try {
    const response = await fetch('data.json');
    if (response.ok) {
      appData = await response.json();
    }
  } catch (error) {
    console.warn('Não foi possível carregar data.json', error);
  }

  window.appData = appData;

const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatThread = document.getElementById('chat-thread');
const interactionLog = document.getElementById('interaction-log');
const userForm = document.getElementById('user-form');
const userList = document.getElementById('user-list');
const userGroupSelect = document.getElementById('user-group');
const groupForm = document.getElementById('group-form');
const groupList = document.getElementById('group-list');
const userCard = document.getElementById('user-card');
const groupCard = document.getElementById('group-card');
const userSettingsCard = document.getElementById('user-settings-card');
const userStatusCard = document.getElementById('user-status-card');
const profileButton = document.getElementById('profile-button');
const topbar = document.querySelector('.topbar');
const navDrawer = document.getElementById('nav-drawer');
const drawerUsername = document.getElementById('drawer-username');
const homeView = document.getElementById('home-view');
const adminOverlay = document.getElementById('admin-overlay');
const closeAdminButton = document.getElementById('close-admin');
const monitoringPanel = document.getElementById('monitoring-panel');
const adminNavItem = document.querySelector('[data-action="admin"]');
const settingsNavItem = document.querySelector('[data-action="settings"]');
const statusLabel = document.querySelector('.status-label');
const reloadButton = document.getElementById('reload-button');
const clearChatButton = document.getElementById('clear-chat');
const userSettingsForm = document.getElementById('user-settings-form');
const editNameInput = document.getElementById('edit-name');
const editEmailInput = document.getElementById('edit-email');
const editPasswordInput = document.getElementById('edit-password');
const userSettingsFeedback = document.getElementById('user-settings-feedback');
const userStatusList = document.getElementById('user-status-list');
const notificationButton = document.getElementById('notification-button');
const notificationBadge = document.getElementById('notification-badge');
const notificationPopup = document.getElementById('notification-popup');
const notificationList = document.getElementById('notification-list');
const closeNotifications = document.getElementById('close-notifications');
const settingsPanel = document.getElementById('settings-panel');
const closeSettingsButton = document.getElementById('close-settings');
const muteToggle = document.getElementById('mute-toggle');
const statusButtons = Array.from(document.querySelectorAll('.status-pill'));
const statusChip = document.getElementById('user-status');
const toast = document.createElement('div');
let toastTimeout = null;

const STORAGE_KEYS = {
  users: 'tecfag:users',
  groups: 'tecfag:groups',
  session: 'tecfag:session',
  monitoring: 'tecfag:monitoring',
  notifications: 'tecfag:notifications',
};

const HISTORY_PREFIX = 'tecfag:history:';
const MONITOR_PREFIX = 'tecfag:monitor:';
const PREF_PREFIX = 'tecfag:prefs:';
const NOTIFICATION_GLOBAL_KEY = 'tecfag:notifications:global';

const defaultGroups = [
  { name: 'Operações', permissions: ['painel', 'perguntas'] },
  { name: 'Supervisão', permissions: ['painel', 'usuarios', 'perguntas'] },
];

const defaultUsers = [
  { name: 'Ana Ribeiro', email: 'ana@empresa.com', password: '123', role: 'gestor', group: 'Supervisão' },
  { name: 'Carlos Lima', email: 'carlos@empresa.com', password: '123', role: 'operador', group: 'Operações' },
  { name: 'Tarcisio', email: 'suporte2@tecfag.com.br', password: '123', role: 'admin', group: 'Supervisão' },
];

const thinkingMessages = [
  'Pensando',
  'Qual máquina é a melhor opção para envasar?',
  'Qual a produtividade das seladoras?',
  'Como posso convencer o cliente a comprar usando a técnica SPICED?',
  'Por que manutenção corretiva exige um profissional?',
  'Quais são as etapas da Técnica SPICED?',
];

const replies = [
  'Claro! Posso detalhar um plano passo a passo para isso.',
  'Aqui estão os pontos principais que você deve considerar.',
  'Precisa de um exemplo de código ou fluxograma? Eu posso ajudar.',
  'Vou monitorar e avisar qualquer anomalia enquanto trabalha nisso.',
];

let groups = [];
let users = [];
let currentUser = null;
let currentHistory = [];
let monitoringHistory = [];
let notificationState = { entries: [], unread: 0 };
let preferences = {};
let selectedUserIndex = null;
let lastNotificationCount = 0;
let notificationAudioCtx = null;
let drawerOpen = false;
let scrollHidden = false;
let lastScrollY = window.scrollY;

toast.className = 'toast';
document.body.appendChild(toast);
if (editEmailInput) {
  editEmailInput.dataset.locked = 'true';
  editEmailInput.disabled = true;
}

function ensureSeededUsers(list) {
  const updated = [...list];

  defaultUsers.forEach((seed) => {
    const index = updated.findIndex((u) => u.email.toLowerCase() === seed.email.toLowerCase());
    if (index === -1) {
      updated.push(seed);
      return;
    }

    const existing = updated[index];
    updated[index] = {
      ...existing,
      name: seed.name,
      email: seed.email,
      password: seed.password,
      role: seed.role,
      group: seed.group,
    };
  });

  return updated;
}

function isAdminUser(user = currentUser) {
  return !!user && user.role === 'admin';
}

function toggleAdminCards(visible) {
  [userCard, groupCard, userSettingsCard, userStatusCard].forEach((card) => {
    if (card) card.classList.toggle('hidden', !visible);
  });

  [userForm, groupForm, userSettingsForm].forEach((form) => {
    if (!form) return;
    [...form.elements].forEach((el) => {
      if (el.tagName !== 'BUTTON' && el.type !== 'button') {
        const isLocked = el.dataset.locked === 'true';
        el.disabled = isLocked ? true : !visible;
      }
    });
    if (form === userSettingsForm && editEmailInput) {
      editEmailInput.disabled = true;
    }
  });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 1800);
}

function showAccessWarning() {
  showToast('Apenas administradores podem acessar estas opções.');
}

function applyTopbarVisibility() {
  if (!topbar) return;
  const shouldHide = drawerOpen || scrollHidden;
  topbar.classList.toggle('topbar--hidden', shouldHide);
}

function playNotificationSound() {
  if (!isAdminUser() || preferences.muteNotifications) return;
  try {
    if (!notificationAudioCtx) {
      notificationAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = notificationAudioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 1180;
    gain.gain.setValueAtTime(0.14, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.42);
  } catch (e) {
    /* ignore playback errors */
  }
}

function loadGroups() {
  const stored = localStorage.getItem(STORAGE_KEYS.groups);
  return stored ? JSON.parse(stored) : [...defaultGroups];
}

function persistGroups() {
  localStorage.setItem(STORAGE_KEYS.groups, JSON.stringify(groups));
}

function loadUsers() {
  const stored = localStorage.getItem(STORAGE_KEYS.users);
  return stored ? JSON.parse(stored) : [...defaultUsers];
}

function persistUsers() {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
}

function historyKey(email) {
  return `${HISTORY_PREFIX}${email}`;
}

function loadHistory(email) {
  const stored = localStorage.getItem(historyKey(email));
  return stored ? JSON.parse(stored) : [];
}

function persistHistory(email, history) {
  localStorage.setItem(historyKey(email), JSON.stringify(history));
}

function monitoringKey(email) {
  return `${MONITOR_PREFIX}${email}`;
}

function loadMonitoring(email) {
  const stored = localStorage.getItem(monitoringKey(email));
  return stored ? JSON.parse(stored) : [];
}

function persistMonitoring(email, history) {
  localStorage.setItem(monitoringKey(email), JSON.stringify(history));
}

function prefKey(email) {
  return `${PREF_PREFIX}${email}`;
}

function loadPreferences(email) {
  const stored = localStorage.getItem(prefKey(email));
  return stored ? JSON.parse(stored) : {};
}

function persistPreferences(email, preferences) {
  localStorage.setItem(prefKey(email), JSON.stringify(preferences));
}

function ensurePreferencesForUser(user) {
  if (!user) return { status: 'online', muteNotifications: false, active: true };
  const stored = loadPreferences(user.email) || {};
  const withDefaults = {
    status: stored.status || 'online',
    muteNotifications: !!stored.muteNotifications,
    active: stored.active !== false,
  };
  persistPreferences(user.email, withDefaults);
  return withDefaults;
}

function ensureAllUserPreferences() {
  users.forEach((user) => ensurePreferencesForUser(user));
}

function ensurePreferences() {
  if (!currentUser) return {};
  preferences = ensurePreferencesForUser(currentUser);
  return preferences;
}

function setStatus(status) {
  if (!currentUser) return;
  preferences.status = status;
  persistPreferences(currentUser.email, preferences);
  renderStatus();
  renderUserStatusBoard();
}

function setUserActive(email, active) {
  if (!email) return;
  const currentPrefs = ensurePreferencesForUser({ email });
  const updated = { ...currentPrefs, active };
  persistPreferences(email, updated);
  if (currentUser && currentUser.email === email) {
    preferences = updated;
    renderStatus();
  }
  renderUserStatusBoard();
}

function renderStatus() {
  if (!statusChip) return;
  const labels = {
    online: 'Online',
    ausente: 'Ausente',
    offline: 'Offline',
  };
  statusChip.textContent = labels[preferences.status] || 'Online';
  statusButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.status === preferences.status);
  });
  if (muteToggle) muteToggle.checked = !!preferences.muteNotifications;
}

function loadNotifications() {
  const stored = localStorage.getItem(NOTIFICATION_GLOBAL_KEY);
  if (!stored) return { entries: [], unread: 0 };
  const parsed = JSON.parse(stored);
  return {
    entries: parsed.entries || [],
    unread: parsed.unread || 0,
  };
}

function persistNotifications(state) {
  localStorage.setItem(NOTIFICATION_GLOBAL_KEY, JSON.stringify(state));
}

function init() {
  groups = loadGroups();
  users = ensureSeededUsers(loadUsers());
  ensureAllUserPreferences();
  renderGroups();
  populateGroupOptions();
  renderUsers();
  restoreSession();
  persistUsers();
  startThinkingRotation();
}

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.password !== password) {
    showLoginError('E-mail ou senha inválidos. Verifique suas credenciais.');
    return;
  }

  completeLogin(user);
});

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!currentUser) return;
  const message = chatInput.value.trim();
  if (!message) return;
  chatInput.value = '';
  addInteraction(currentUser.name || 'Operador', message, 'user');
  setTimeout(() => {
    const response = generateReply(message);
    addInteraction('Assistente', response, 'bot');
  }, 400);
});

groupForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!isAdminUser()) {
    showAccessWarning();
    return;
  }
  const groupName = document.getElementById('group-name').value.trim();
  const selectedPerms = [...groupForm.querySelectorAll('input[type="checkbox"]:checked')].map((c) => c.value);
  if (!groupName || selectedPerms.length === 0) return;
  groups.push({ name: groupName, permissions: selectedPerms });
  persistGroups();
  document.getElementById('group-name').value = '';
  groupForm.querySelectorAll('input[type="checkbox"]').forEach((c) => (c.checked = false));
  groupForm.querySelector('input[value="painel"]').checked = true;
  renderGroups();
  populateGroupOptions();
});

userForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!isAdminUser()) {
    showAccessWarning();
    return;
  }
  const name = document.getElementById('user-name').value.trim();
  const email = document.getElementById('user-email').value.trim();
  const password = document.getElementById('user-password').value.trim();
  const role = document.getElementById('user-role').value;
  const group = document.getElementById('user-group').value;
  if (!name || !email || !group || !password) return;
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    alert('Já existe um usuário com este e-mail.');
    return;
  }
  users.push({ name, email, password, role, group });
  ensurePreferencesForUser({ email, name });
  persistUsers();
  userForm.reset();
  populateGroupOptions();
  renderUsers();
});

profileButton.addEventListener('click', () => {
  drawerOpen = navDrawer.classList.toggle('open');
  if (drawerOpen) {
    scrollHidden = true;
  }
  applyTopbarVisibility();
});

document.addEventListener('click', (event) => {
  if (!drawerOpen) return;
  const target = event.target;
  const clickedInsideDrawer = navDrawer && navDrawer.contains(target);
  const clickedProfile = target === profileButton;
  if (clickedInsideDrawer || clickedProfile) return;
  drawerOpen = false;
  navDrawer.classList.remove('open');
  scrollHidden = false;
  applyTopbarVisibility();
});

navDrawer.addEventListener('click', (event) => {
  if (event.target.matches('.nav-item')) {
    const action = event.target.getAttribute('data-action');
    handleNavAction(action);
  }
});

if (closeAdminButton) {
  closeAdminButton.addEventListener('click', () => {
    hideAdminPanel();
    scrollHidden = false;
    applyTopbarVisibility();
  });
}

if (closeSettingsButton) {
  closeSettingsButton.addEventListener('click', closeSettingsPanel);
}

if (muteToggle) {
  muteToggle.addEventListener('change', () => {
    if (!currentUser) return;
    preferences.muteNotifications = muteToggle.checked;
    persistPreferences(currentUser.email, preferences);
  });
}

statusButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    if (!currentUser) return;
    setStatus(btn.dataset.status);
  });
});

document.querySelectorAll('.inactive').forEach((btn) => {
  btn.addEventListener('click', (event) => {
    event.preventDefault();
    showToast('Trabalhando nisso!');
  });
});

if (reloadButton) {
  reloadButton.addEventListener('click', () => location.reload());
}

if (clearChatButton) {
  clearChatButton.addEventListener('click', clearChatHistory);
}

if (notificationButton) {
  notificationButton.addEventListener('click', () => {
    if (!isAdminUser()) {
      showAccessWarning();
      return;
    }
    notificationState = loadNotifications();
    notificationPopup.classList.toggle('hidden');
    if (!notificationPopup.classList.contains('hidden')) {
      renderNotificationPopup();
      notificationState.unread = 0;
      persistNotifications(notificationState);
      updateNotificationBadge();
    }
  });
}

if (closeNotifications) {
  closeNotifications.addEventListener('click', () => {
    notificationPopup.classList.add('hidden');
  });
}

window.addEventListener('scroll', () => {
  const current = window.scrollY;
  const delta = current - lastScrollY;
  if (Math.abs(delta) < 6) return;
  if (!drawerOpen) {
    if (delta > 0 && current > 10) {
      scrollHidden = true;
    } else if (delta < 0) {
      scrollHidden = false;
    }
    applyTopbarVisibility();
  }
  lastScrollY = current;
});

userSettingsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!isAdminUser() || selectedUserIndex === null) {
    showAccessWarning();
    return;
  }
  const name = editNameInput.value.trim();
  const password = editPasswordInput.value.trim();
  if (!name) {
    userSettingsFeedback.textContent = 'Informe um nome para salvar.';
    return;
  }

  const user = users[selectedUserIndex];
  if (!user) return;
  user.name = name;
  if (password) {
    user.password = password;
  }
  persistUsers();
  if (currentUser && currentUser.email === user.email) {
    currentUser = { ...currentUser, name: user.name, password: user.password };
    drawerUsername.textContent = currentUser.name;
  }
  editPasswordInput.value = '';
  userSettingsFeedback.textContent = 'Dados do usuário atualizados.';
  renderUsers();
});

function handleNavAction(action) {
  switch (action) {
    case 'home':
      showHomeView();
      closeSettingsPanel();
      break;
    case 'admin':
      if (!isAdminUser()) {
        showAccessWarning();
        break;
      }
      closeSettingsPanel();
      showAdminView();
      break;
    case 'settings':
      openSettingsPanel();
      break;
    case 'logout':
      logoutUser();
      break;
    default:
      break;
  }
  drawerOpen = false;
  navDrawer.classList.remove('open');
  scrollHidden = false;
  applyTopbarVisibility();
}

function showLoginError(message) {
  loginError.textContent = message;
  loginError.classList.remove('hidden');
}

function completeLogin(user) {
  currentUser = user;
  loginError.classList.add('hidden');
  document.body.classList.remove('login-active');
  loginSection.classList.add('hidden');
  appSection.classList.remove('hidden');
  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify({ email: user.email }));
  drawerUsername.textContent = user.name;
  applyPermissions();
  loadUserHistory();
  showHomeView();
}

function restoreSession() {
  const session = localStorage.getItem(STORAGE_KEYS.session);
  if (!session) return;
  const { email } = JSON.parse(session);
  const user = users.find((u) => u.email === email);
  if (user) {
    completeLogin(user);
  }
}

function loadUserHistory() {
  if (!currentUser) return;
  currentHistory = loadHistory(currentUser.email);
  monitoringHistory = loadMonitoring(currentUser.email);
  notificationState = loadNotifications();
  lastNotificationCount = notificationState.unread || 0;
  ensurePreferences();
  renderStatus();
  chatThread.innerHTML = '';
  interactionLog.innerHTML = '';
  resetUserEditForm();
  if (currentHistory.length === 0) {
    addInteraction('Assistente', 'Olá! Estou pronta para ajudar com seu trabalho de hoje.', 'bot');
  } else {
    currentHistory.forEach((entry) => renderMessage(entry));
  }
  refreshLog();
  updateNotificationBadge({ silent: true });
}

function addInteraction(from, content, type = 'bot') {
  if (!currentUser) return;
  const entry = { from, content, type, timestamp: new Date().toISOString() };
  currentHistory.push(entry);
  persistHistory(currentUser.email, currentHistory);
  monitoringHistory.push(entry);
  persistMonitoring(currentUser.email, monitoringHistory);
  if (type === 'user') {
    addNotificationEntry(content, currentUser?.name || 'Usuário');
  }
  renderMessage(entry);
  refreshLog();
}

function clearChatHistory() {
  if (!currentUser) return;
  currentHistory = [];
  persistHistory(currentUser.email, currentHistory);
  chatThread.innerHTML = '';
  showToast('Histórico do chat limpo.');
}

function renderMessage(entry) {
  const bubble = document.createElement('div');
  bubble.className = `bubble ${entry.type}`;

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = `${entry.from} • ${formatTime(entry.timestamp)}`;

  bubble.appendChild(meta);
  bubble.appendChild(document.createTextNode(entry.content));
  chatThread.appendChild(bubble);
  chatThread.scrollTop = chatThread.scrollHeight;
}

function refreshLog() {
  interactionLog.innerHTML = '';
  [...monitoringHistory].reverse().forEach((entry) => renderLogRow(entry));
}

function renderLogRow(entry) {
  const row = document.createElement('div');
  row.className = 'log-row';
  row.innerHTML = `<span>${entry.from}</span><span>${truncate(entry.content, 42)}</span>`;
  interactionLog.appendChild(row);
}

function addNotificationEntry(content, author) {
  const existing = loadNotifications();
  const entry = {
    content,
    timestamp: new Date().toISOString(),
    user: author,
  };
  existing.entries.push(entry);
  existing.unread = (existing.unread || 0) + 1;
  notificationState = existing;
  persistNotifications(notificationState);
  updateNotificationBadge();
}

function updateNotificationBadge({ silent = false } = {}) {
  if (!notificationBadge) return;
  notificationState = loadNotifications();
  if (!isAdminUser()) {
    notificationBadge.classList.add('hidden');
    lastNotificationCount = notificationState.unread || 0;
    return;
  }
  const previous = lastNotificationCount;
  const count = notificationState.unread || 0;
  notificationBadge.textContent = count;
  notificationBadge.classList.toggle('hidden', count === 0);
  if (!silent && count > previous) {
    playNotificationSound();
  }
  lastNotificationCount = count;
}

function renderNotificationPopup() {
  if (!notificationList) return;
  notificationState = loadNotifications();
  notificationList.innerHTML = '';
  if (!notificationState.entries.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Nenhuma pergunta registrada ainda.';
    notificationList.appendChild(empty);
    return;
  }

  [...notificationState.entries].reverse().forEach((entry) => {
    const row = document.createElement('div');
    row.className = 'notification-row';
    const date = new Date(entry.timestamp);
    const dateLabel = `${date.toLocaleDateString('pt-BR')} • ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    row.innerHTML = `
      <div class="notification-row__meta">
        <strong>${entry.user}</strong>
        <span class="muted">${dateLabel}</span>
      </div>
      <p>${entry.content}</p>
    `;
    notificationList.appendChild(row);
  });
}

function truncate(text, limit) {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}...`;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function generateReply(message) {
  const base = replies[Math.floor(Math.random() * replies.length)];
  return `${base} (sobre: ${message})`;
}

function startThinkingRotation() {
  if (!statusLabel) return;
  let index = 0;
  statusLabel.textContent = thinkingMessages[index];
  setInterval(() => {
    index = (index + 1) % thinkingMessages.length;
    statusLabel.classList.remove('status-animate');
    void statusLabel.offsetWidth;
    statusLabel.textContent = thinkingMessages[index];
    statusLabel.classList.add('status-animate');
  }, 5000);
}

function startEditingUser(index) {
  selectedUserIndex = index;
  const user = users[index];
  if (!user) return;
  editNameInput.value = user.name;
  editEmailInput.value = user.email;
  editPasswordInput.value = '';
  userSettingsFeedback.textContent = 'Editando usuário selecionado.';
}

function resetUserEditForm() {
  selectedUserIndex = null;
  editNameInput.value = '';
  editEmailInput.value = '';
  editPasswordInput.value = '';
  userSettingsFeedback.textContent = 'Selecione um usuário na lista para editar.';
}

function renderUserStatusBoard() {
  if (!userStatusList || !isAdminUser()) return;

  userStatusList.innerHTML = '';
  const statusLabels = {
    online: 'Online',
    ausente: 'Ausente',
    offline: 'Offline',
    inactive: 'Inativo',
  };

  const orderedUsers = [...users].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  orderedUsers.forEach((user) => {
    const prefs = ensurePreferencesForUser(user);
    const status = prefs.status || 'online';
    const active = prefs.active !== false;

    const row = document.createElement('div');
    row.className = 'status-row';

    const info = document.createElement('div');
    info.className = 'status-row__info';
    info.innerHTML = `<strong>${user.name}</strong><span class="muted">${user.email}</span>`;

    const badge = document.createElement('span');
    const badgeState = active ? status : 'inactive';
    badge.className = `status-indicator status-indicator--${badgeState}`;
    badge.textContent = statusLabels[badgeState] || 'Online';

    const actions = document.createElement('div');
    actions.className = 'status-row__actions';

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'status-toggle';
    toggleBtn.textContent = active ? 'Inativar' : 'Ativar';
    toggleBtn.addEventListener('click', () => setUserActive(user.email, !active));

    actions.append(badge, toggleBtn);
    row.append(info, actions);
    userStatusList.appendChild(row);
  });

  if (!users.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Nenhum usuário cadastrado ainda.';
    userStatusList.appendChild(empty);
  }
}

function renderUsers() {
  userList.innerHTML = '';
  if (!isAdminUser()) {
    return;
  }
  users.forEach((user, index) => {
    const card = document.createElement('div');
    card.className = 'user-card';

    const header = document.createElement('header');
    header.innerHTML = `<strong>${user.name}</strong><span class="tag">${user.role}</span>`;

    const details = document.createElement('p');
    details.className = 'muted';
    details.textContent = `${user.email} • Grupo: ${user.group}`;

    const actions = document.createElement('div');
    actions.className = 'actions-row';

    const roleSelect = document.createElement('select');
    ['operador', 'gestor', 'admin'].forEach((roleOpt) => {
      const option = document.createElement('option');
      option.value = roleOpt;
      option.textContent = roleOpt.charAt(0).toUpperCase() + roleOpt.slice(1);
      if (roleOpt === user.role) option.selected = true;
      roleSelect.appendChild(option);
    });
    roleSelect.addEventListener('change', (e) => {
      if (!isAdminUser()) {
        showAccessWarning();
        renderUsers();
        return;
      }
      users[index].role = e.target.value;
      persistUsers();
      renderUsers();
    });

    const editBtn = document.createElement('button');
    editBtn.className = 'icon-btn secondary';
    editBtn.textContent = 'Editar';
    editBtn.addEventListener('click', () => {
      if (!isAdminUser()) {
        showAccessWarning();
        return;
      }
      startEditingUser(index);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-btn';
    deleteBtn.textContent = 'Excluir';
    deleteBtn.addEventListener('click', () => {
      if (!isAdminUser()) {
        showAccessWarning();
        return;
      }
      users.splice(index, 1);
      persistUsers();
      if (selectedUserIndex === index || selectedUserIndex >= users.length) {
        resetUserEditForm();
      }
      renderUsers();
    });

    actions.append(roleSelect, editBtn, deleteBtn);
    card.append(header, details, actions);
    userList.appendChild(card);
  });

  renderUserStatusBoard();
}

function renderGroups() {
  groupList.innerHTML = '';
  if (!isAdminUser()) {
    return;
  }
  groups.forEach((group, index) => {
    const card = document.createElement('div');
    card.className = 'group-card';

    const header = document.createElement('header');
    header.innerHTML = `<strong>${group.name}</strong><span class="tag">${group.permissions.length} permissões</span>`;

    const perms = document.createElement('div');
    perms.className = 'group-perms';
    group.permissions.forEach((perm) => {
      const p = document.createElement('span');
      p.className = 'tag';
      p.textContent = perm;
      perms.appendChild(p);
    });

    const actions = document.createElement('div');
    actions.className = 'actions-row';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-btn';
    deleteBtn.textContent = 'Excluir';
    deleteBtn.addEventListener('click', () => {
      if (!isAdminUser()) {
        showAccessWarning();
        return;
      }
      groups.splice(index, 1);
      persistGroups();
      renderGroups();
      populateGroupOptions();
    });

    actions.append(deleteBtn);
    card.append(header, perms, actions);
    groupList.appendChild(card);
  });
}

function populateGroupOptions() {
  const current = userGroupSelect.value;
  userGroupSelect.innerHTML = '';
  groups.forEach((g) => {
    const option = document.createElement('option');
    option.value = g.name;
    option.textContent = g.name;
    userGroupSelect.appendChild(option);
  });
  if (groups.length > 0) {
    userGroupSelect.value = current && groups.some((g) => g.name === current) ? current : groups[0].name;
  }
}

function applyPermissions() {
  const adminOnly = isAdminUser();
  if (adminNavItem) {
    adminNavItem.classList.toggle('nav-item--disabled', !adminOnly);
    adminNavItem.disabled = !adminOnly;
  }
  if (monitoringPanel) monitoringPanel.classList.toggle('hidden', !adminOnly);
  if (notificationButton) notificationButton.classList.toggle('hidden', !adminOnly);
  if (notificationPopup && !adminOnly) notificationPopup.classList.add('hidden');
  homeView.classList.toggle('single-column', !adminOnly);
  if (!adminOnly) {
    hideAdminPanel();
  }
  toggleAdminCards(adminOnly);
  if (adminOnly) {
    renderUsers();
    renderGroups();
  }
  updateNotificationBadge({ silent: true });
}

function showHomeView() {
  homeView.classList.remove('hidden');
  hideAdminPanel();
}

function showAdminView() {
  if (!isAdminUser()) {
    showAccessWarning();
    showHomeView();
    return;
  }
  if (adminOverlay) {
    adminOverlay.classList.remove('hidden');
    adminOverlay.classList.add('open');
  }
}

function hideAdminPanel() {
  if (!adminOverlay) return;
  adminOverlay.classList.add('hidden');
  adminOverlay.classList.remove('open');
}

function openSettingsPanel() {
  if (!settingsPanel) return;
  ensurePreferences();
  renderStatus();
  settingsPanel.classList.remove('hidden');
}

function closeSettingsPanel() {
  if (!settingsPanel) return;
  settingsPanel.classList.add('hidden');
}

function logoutUser() {
  currentUser = null;
  currentHistory = [];
  monitoringHistory = [];
  notificationState = { entries: [], unread: 0 };
  preferences = {};
  localStorage.removeItem(STORAGE_KEYS.session);
  appSection.classList.add('hidden');
  loginSection.classList.remove('hidden');
  document.body.classList.add('login-active');
  navDrawer.classList.remove('open');
  drawerOpen = false;
  scrollHidden = false;
  hideAdminPanel();
  closeSettingsPanel();
  applyTopbarVisibility();
  loginError.classList.add('hidden');
  loginForm.reset();
  homeView.classList.remove('single-column');
  if (monitoringPanel) monitoringPanel.classList.remove('hidden');
  if (adminNavItem) adminNavItem.classList.remove('nav-item--disabled');
  if (settingsNavItem) settingsNavItem.classList.remove('nav-item--disabled');
  updateNotificationBadge();
  if (notificationPopup) notificationPopup.classList.add('hidden');
}

window.addEventListener('storage', (event) => {
  if (event.key !== NOTIFICATION_GLOBAL_KEY) return;
  notificationState = loadNotifications();
  updateNotificationBadge();
  if (notificationPopup && !notificationPopup.classList.contains('hidden') && isAdminUser()) {
    renderNotificationPopup();
    notificationState.unread = 0;
    persistNotifications(notificationState);
    updateNotificationBadge({ silent: true });
  }
});

init();
    let products = appData.products || [];
    const catalogGrid = document.getElementById('catalogGrid');
    const searchInput = document.getElementById('searchInput');
    const emptyState = document.getElementById('emptyState');
    const resultCount = document.getElementById('resultCount');
    const tagInput = document.getElementById('tagInput');
    const tagListEl = document.getElementById('tagList');
    const saveTagButton = document.getElementById('saveTagButton');
    const cancelEditButton = document.getElementById('cancelEditButton');
    const tagManagerContent = document.getElementById('tagManagerContent');
    const tagToggle = document.getElementById('tagToggle');
    const tagFormRow = document.getElementById('tagFormRow');

    const toggleTagPanel = () => {
      const collapsed = tagManagerContent.classList.toggle('collapsed');
      tagFormRow.hidden = collapsed;
      tagToggle.setAttribute('aria-expanded', (!collapsed).toString());
      tagToggle.textContent = collapsed ? '⌄' : '⌃';
    };

    tagToggle.addEventListener('click', toggleTagPanel);

    const placeholderImage =
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%23e53935' stop-opacity='0.4'/><stop offset='100%' stop-color='%230f0c10' stop-opacity='0.9'/></linearGradient></defs><rect width='400' height='400' fill='%2318121c'/><rect x='12' y='12' width='376' height='376' rx='26' fill='url(%23g)' stroke='%232a1d2d' stroke-width='4'/><text x='50%' y='50%' text-anchor='middle' dominant-baseline='middle' fill='%23c7c7c7' font-family='Inter,Arial,sans-serif' font-size='22'>Imagem não carregada</text></svg>";

    const youtubeVideoId = 'tT1BIkdLKJk';
    const youtubeEmbedUrl = `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&rel=0`;
    const youtubePoster = `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`;

    const detailModal = document.getElementById('detailModal');
    const detailImage = document.getElementById('detailImage');
    const thumbnailGrid = document.getElementById('thumbnailGrid');
    const detailTitle = document.getElementById('detailTitle');
    const detailPrice = document.getElementById('detailPrice');
    const detailTags = document.getElementById('detailTags');
    const detailDescription = document.getElementById('detailDescription');
    const videoFrame = document.getElementById('videoFrame');
    const detailObservations = document.getElementById('detailObservations');
    const closeModal = document.getElementById('closeModal');
    const detailTagSelect = document.getElementById('detailTagSelect');
    const detailAddTag = document.getElementById('detailAddTag');
    const detailUpload = document.getElementById('detailUpload');
    const downloadDocs = document.getElementById('downloadDocs');
    let editingTag = null;
    let currentDetailProduct = null;

    const normalizeText = (text = '') =>
      text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const buildContext = (parts = []) => normalizeText(parts.filter(Boolean).join(' | ')).replace(/[|]/g, ' ');

    const TAG_RULES = [
      { tag: 'Pós', keywords: [' pos ', ' pos-', ' pos/', 'pos ', ' pos'] },
      { tag: 'Granulados', keywords: ['granulado', 'granulados'] },
      { tag: 'Grãos', keywords: ['graos', 'grao'] },
      { tag: 'Grãos e Farelos', keywords: ['graos e farelos', 'grao e farelo', 'farelos'] },
      { tag: 'Filme Stretch', keywords: ['stretch'] },
      { tag: 'Fita de Arquear', keywords: ['fita de arquear', 'arqueadora', 'arquear'] },
      {
        tag: 'Grupo A (Rótulos/Papéis/Embalagens)',
        test: (ctx) =>
          ctx.includes('rotulos/papeis/embalagens') &&
          !ctx.includes('sacos de papel') &&
          !ctx.includes('pequenas caixas') &&
          !ctx.includes('esteira'),
      },
      {
        tag: 'Grupo B (Rótulos/Papéis/Embalagens/sacos de papel ou de plástico/ pequenas caixas)',
        test: (ctx) =>
          ctx.includes('rotulos/papeis/embalagens') &&
          (ctx.includes('sacos de papel') || ctx.includes('pequenas caixas')),
      },
      {
        tag: 'Grupo C (Aço/Ferro/Madeira/Vidro/Concreto/Plástico/Papel)',
        keywords: ['aco ferro madeira vidro concreto plastico papel'],
      },
      { tag: 'Fita Gomada', keywords: ['fita gomada'] },
      { tag: 'Cápsulas', keywords: ['capsula', 'capsulas'] },
      { tag: 'Cápsulas Envasadora', test: (ctx) => ctx.includes('capsula') && ctx.includes('envasador') },
      { tag: 'Softgel', keywords: ['softgel'] },
      { tag: 'Comprimidos', keywords: ['comprimido', 'comprimidos'] },
      { tag: 'Líquido', keywords: ['liquido'] },
      { tag: 'Pastoso', keywords: ['pastoso'] },
      { tag: 'Grupo D (Frascos, Latas, Outros)', keywords: ['frascos latas outros'] },
      { tag: 'Caixas', keywords: ['caixa', 'caixas'] },
      {
        tag: 'Grupo E (Rótulos/Papéis/Embalagens)',
        test: (ctx) => ctx.includes('rotulos/papeis/embalagens') && ctx.includes('esteira'),
      },
      { tag: 'Caixa de Papelão', keywords: ['caixa de papelao', 'caixas de papelao'] },
      { tag: 'Embalagens Plásticas', keywords: ['embalagens plasticas', 'embalagem plastica'] },
      { tag: 'Pós secos', keywords: ['pos seco', 'pos secos'] },
      { tag: 'Grânulos secos', keywords: ['granulos secos', 'granulo seco'] },
      { tag: 'Tampas Bico de Pato', keywords: ['bico de pato'] },
      { tag: 'Tampas de Metal', keywords: ['tampas de metal', 'tampa de metal'] },
      { tag: 'Tampas de Plásticos', keywords: ['tampas de plast', 'tampa plast'] },
      { tag: 'Rótulos', keywords: ['rotulo', 'rotulos'] },
      { tag: 'Rótulos Lacres', keywords: ['lacres'] },
      { tag: 'Filme', keywords: [' filme', 'filme '] },
      { tag: 'Filme Alimentício', keywords: ['filme alimenticio', 'pelicula'] },
      { tag: 'Fita acrílica', keywords: ['fita acrilica'] },
      { tag: 'Fita Hot Melt', keywords: ['hot melt'] },
      { tag: 'Sacos', keywords: ['saco ', 'sacos'] },
      { tag: 'BOPP', keywords: ['bopp'] },
      { tag: 'PP', keywords: ['polipropileno', ' pp ', 'pp ('] },
      { tag: 'PE', keywords: ['polietileno', ' pe ', 'pe ('] },
      { tag: 'PVC', keywords: ['pvc'] },
      { tag: 'POF', keywords: ['pof'] },
      { tag: 'PET', keywords: [' pet ', 'pet/'] },
      { tag: 'OPS', keywords: ['ops'] },
      { tag: 'Filme Termoencolhível', keywords: ['filme termoencolhivel', 'termoencolhivel'] },
      { tag: 'Bandeja', keywords: ['bandeja'] },
      {
        tag: 'Grupo A (PA+PE (Poliamida/Nilon + Polietileno) / EVOH / PET+PE / PE, PET , PP)',
        keywords: ['poliamida', 'evoh', 'pa+pe'],
      },
      {
        tag: 'Folha de alumínio (ponto de fusão: 100-200 °C)',
        keywords: ['folha de aluminio', 'ponto de fusao: 100-200'],
      },
      { tag: 'Plástico Termoencolhível', keywords: ['plastico termoencolhivel'] },
      { tag: 'Blister', keywords: ['blister'] },
      { tag: 'Alumínio-Plastico', keywords: ['aluminio-plastico', 'aluminio plastico'] },
      { tag: 'Alumínio-Alumínio', keywords: ['aluminio-aluminio', 'aluminio aluminio'] },
      { tag: 'Sleeve termoencolhível', keywords: ['sleeve'] },
      {
        tag: 'Grupo A (BOPP, PET, PE, OUTROS)',
        keywords: ['bopp, pet, pe, outros', 'bopp, pet, pe'],
      },
      {
        tag: 'Grupo B (PET/CPP, PET, PE, OPP/CPP, EVOH, Folha de alumínio e outros filmes)',
        keywords: ['pet/cpp', 'opp/cpp', 'outros filmes'],
      },
      { tag: 'Tinta sólida', keywords: ['tinta solida'] },
      { tag: 'Inkjet', keywords: ['inkjet'] },
      { tag: 'Fita Ribbon', keywords: ['fita ribbon'] },
    ];

    const deriveTags = (parts = []) => {
      const context = buildContext(parts);
      const tags = new Set();

      const hasSemiauto = context.includes('semiautomat');
      const hasManual = context.includes('manual');
      const hasAuto = context.includes('automat');

      if (hasSemiauto) tags.add('Semiautomática');
      if (hasManual) tags.add('Manual');
      if (hasAuto && !hasSemiauto) tags.add('Automática');

      TAG_RULES.forEach((rule) => {
        const normalizedKeywords = rule.keywords?.map((kw) => normalizeText(kw.trim()));
        const matched = rule.test
          ? rule.test(context)
          : normalizedKeywords?.some((kw) => context.includes(kw));
        if (matched) {
          tags.add(rule.tag);
        }
      });

      return Array.from(tags);
    };

    const slugify = (text = 'documento') =>
      normalizeText(text)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'documento';

    const loadExternalDataset = async () => {
      try {
        const response = await fetch('data/catalog-dataset.json');
        if (!response.ok) return;
        const datasetText = await response.text();
        const dataset = JSON.parse(datasetText);
        let nextId = products.length + 1;

        dataset.forEach((sheet) => {
          const rows = sheet.dados || [];
          if (rows.length < 3) return;
          const headers = rows[1] || {};
          const keys = Object.keys(headers);
          if (keys.length < 2) return;

          for (let i = 2; i < rows.length; i += 1) {
            const row = rows[i];
            const code = row?.[keys[0]];
            const name = row?.[keys[1]];
            if (!code || !name) continue;

            const details = [];
            for (let j = 2; j < keys.length; j += 1) {
              const label = headers[keys[j]] || keys[j];
              let value = row?.[keys[j]];
              if (value === null || value === undefined || value === '') value = '-';
              details.push(`${label}: ${value}`);
            }

            products.push({
              id: nextId++,
              title: String(name).trim(),
              price: 'Sob consulta',
              description: `${code} - ${name} | ${details.join(' | ')}`,
              tags: deriveTags([sheet.planilha, code, name, ...details]),
              observacoes: ''
            });
          }
        });
      } catch (error) {
        console.error('Erro ao carregar dataset externo', error);
      }
    };

    const productImages = new Map();

    const getImages = (id) => productImages.get(id) || [];
    const setImages = (id, images = []) => productImages.set(id, images.slice(0, 4));
    const resolveImage = (id) => getImages(id)[0] || placeholderImage;
    let availableTags = [];
    let currentKeyword = '';

    const renderTagList = () => {
      tagListEl.innerHTML = '';
      availableTags.forEach((tag) => {
        const row = document.createElement('div');
        row.className = 'tag-row';

        const name = document.createElement('span');
        name.className = 'tag-name';
        name.textContent = tag;
        row.appendChild(name);

        const actions = document.createElement('div');
        actions.className = 'tag-actions';

        const editButton = document.createElement('button');
        editButton.className = 'secondary';
        editButton.type = 'button';
        editButton.textContent = 'Editar';
        editButton.addEventListener('click', () => {
          editingTag = tag;
          tagInput.value = tag;
          saveTagButton.textContent = 'Salvar edição';
          cancelEditButton.hidden = false;
        });

        const deleteButton = document.createElement('button');
        deleteButton.className = 'secondary';
        deleteButton.type = 'button';
        deleteButton.textContent = 'Excluir';
        deleteButton.addEventListener('click', () => {
          availableTags = availableTags.filter((item) => item !== tag);
          products.forEach((product) => {
            product.tags = product.tags.filter((t) => t !== tag);
          });
          applyFilter();
          renderTagList();
          if (currentDetailProduct) {
            refreshDetailTagSelect();
            refreshDetailTags(currentDetailProduct);
          }
        });

        actions.appendChild(editButton);
        actions.appendChild(deleteButton);
        row.appendChild(actions);
        tagListEl.appendChild(row);
      });
    };

    const resetTagForm = () => {
      editingTag = null;
      tagInput.value = '';
      saveTagButton.textContent = 'Salvar tag';
      cancelEditButton.hidden = true;
    };

    const upsertTag = () => {
      const value = tagInput.value.trim();
      if (!value) return;

      const exists = availableTags.some((tag) => tag.toLowerCase() === value.toLowerCase());

      if (editingTag) {
        const normalizedEditing = editingTag.toLowerCase();
        availableTags = availableTags.map((tag) => (tag.toLowerCase() === normalizedEditing ? value : tag));
        products.forEach((product) => {
          product.tags = product.tags.map((tag) => (tag.toLowerCase() === normalizedEditing ? value : tag));
        });
      } else if (!exists) {
        availableTags.push(value);
      }

      resetTagForm();
      renderTagList();
      applyFilter();
      if (currentDetailProduct) {
        refreshDetailTagSelect();
        refreshDetailTags(currentDetailProduct);
      }
    };

    saveTagButton.addEventListener('click', upsertTag);
    cancelEditButton.addEventListener('click', resetTagForm);

    const renderProducts = (items) => {
      catalogGrid.innerHTML = '';

      if (!items.length) {
        emptyState.hidden = false;
        resultCount.textContent = '0 resultados';
        return;
      }

      emptyState.hidden = true;
      resultCount.textContent = `${items.length} resultado${items.length === 1 ? '' : 's'}`;

      items.forEach((product) => {
        const card = document.createElement('article');
        card.className = 'card';

        const img = document.createElement('img');
        img.src = resolveImage(product.id);
        img.alt = product.title;
        card.appendChild(img);

        const title = document.createElement('h3');
        title.textContent = product.title;
        card.appendChild(title);

        const price = document.createElement('div');
        price.className = 'price';
        price.textContent = product.price;
        card.appendChild(price);

        const actions = document.createElement('div');
        actions.className = 'card-actions';

        const detailBtn = document.createElement('button');
        detailBtn.textContent = 'Ver detalhes';
        detailBtn.addEventListener('click', () => openDetails(product));
        actions.appendChild(detailBtn);

        card.appendChild(actions);
        catalogGrid.appendChild(card);
      });
    };

    const refreshDetailTagSelect = () => {
      detailTagSelect.innerHTML = '';
      const placeholderOption = document.createElement('option');
      placeholderOption.value = '';
      placeholderOption.textContent = 'Adicionar tag existente';
      detailTagSelect.appendChild(placeholderOption);
      availableTags.forEach((tag) => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        detailTagSelect.appendChild(option);
      });
    };

    const refreshDetailTags = (product) => {
      detailTags.innerHTML = '';
      product.tags.forEach((tag) => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = tag;
        detailTags.appendChild(chip);
      });
    };

    const refreshGallery = (product) => {
      const images = getImages(product.id);
      let activeIndex = Number(detailImage.dataset.activeIndex || 0);
      if (!images[activeIndex]) activeIndex = 0;
      detailImage.dataset.activeIndex = activeIndex;
      detailImage.src = images[activeIndex] || placeholderImage;

      thumbnailGrid.innerHTML = '';

      if (!images.length) {
        const empty = document.createElement('span');
        empty.className = 'chip';
        empty.textContent = 'Sem imagens';
        thumbnailGrid.appendChild(empty);
        return;
      }

      images.forEach((src, index) => {
        const thumb = document.createElement('img');
        thumb.src = src;
        thumb.alt = `${product.title} miniatura ${index + 1}`;
        thumb.className = 'thumbnail';
        if (index === activeIndex) thumb.classList.add('active');
        thumb.addEventListener('click', () => {
          detailImage.dataset.activeIndex = index;
          detailImage.src = src;
          thumbnailGrid.querySelectorAll('.thumbnail').forEach((node, i) => {
            node.classList.toggle('active', i === index);
          });
        });
        thumbnailGrid.appendChild(thumb);
      });
    };

    const refreshDetailIfOpen = (product) => {
      if (currentDetailProduct && currentDetailProduct.id === product.id) {
        refreshDetailTags(currentDetailProduct);
        refreshDetailTagSelect();
        refreshGallery(product);
      }
    };

    const startVideoPlayback = () => {
      if (!videoFrame) return;
      videoFrame.innerHTML = '';
      const iframe = document.createElement('iframe');
      iframe.src = youtubeEmbedUrl;
      iframe.title = 'Vídeo demonstrativo do produto';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      videoFrame.appendChild(iframe);
    };

    const renderVideoPlaceholder = () => {
      if (!videoFrame) return;
      videoFrame.innerHTML = '';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'video-placeholder';
      button.style.backgroundImage = `url('${youtubePoster}')`;
      button.setAttribute('aria-label', 'Reproduzir vídeo demonstrativo no YouTube');

      const play = document.createElement('div');
      play.className = 'play-badge';
      play.textContent = '▶';
      button.appendChild(play);

      const start = () => startVideoPlayback();
      button.addEventListener('click', start);
      button.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          start();
        }
      });

      videoFrame.appendChild(button);
    };

    const openDetails = (product) => {
      currentDetailProduct = product;
      detailTitle.textContent = product.title;
      detailPrice.textContent = product.price;
      refreshDetailTags(product);
      refreshDetailTagSelect();
      detailTagSelect.value = '';
      detailDescription.textContent = product.description;
      detailObservations.value = product.observacoes || '';
      refreshGallery(product);
      renderVideoPlaceholder();
      detailModal.classList.add('active');
    };

    const closeDetails = () => {
      detailModal.classList.remove('active');
      if (videoFrame) videoFrame.innerHTML = '';
      currentDetailProduct = null;
    };

    detailModal.addEventListener('click', (event) => {
      if (event.target === detailModal) {
        closeDetails();
      }
    });
    closeModal.addEventListener('click', closeDetails);

    detailAddTag.addEventListener('click', () => {
      if (!currentDetailProduct) return;
      const selected = detailTagSelect.value;
      if (!selected) return;
      if (!currentDetailProduct.tags.includes(selected)) {
        currentDetailProduct.tags.push(selected);
        refreshDetailTags(currentDetailProduct);
        applyFilter();
      }
      detailTagSelect.value = '';
    });

    detailObservations.addEventListener('input', (event) => {
      if (!currentDetailProduct) return;
      currentDetailProduct.observacoes = event.target.value;
    });

    detailUpload.addEventListener('change', (event) => {
      if (!currentDetailProduct) return;
      const files = Array.from(event.target.files || []);
      if (!files.length) return;

      const existing = getImages(currentDetailProduct.id);
      const remaining = Math.max(0, 4 - existing.length);
      if (!remaining) return;

      const additions = files.slice(0, remaining).map((file) => URL.createObjectURL(file));
      setImages(currentDetailProduct.id, [...existing, ...additions]);
      refreshGallery(currentDetailProduct);
      applyFilter();
      event.target.value = '';
    });

    downloadDocs.addEventListener('click', () => {
      if (!currentDetailProduct) return;
      const images = getImages(currentDetailProduct.id);
      if (!images.length) return;

      images.forEach((src, index) => {
        const link = document.createElement('a');
        link.href = src;
        link.download = `${slugify(currentDetailProduct.title)}-imagem-${index + 1}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      });
    });

    const applyFilter = () => {
      const normalized = currentKeyword.trim().toLowerCase();
      const filtered = products.filter((product) => product.title.toLowerCase().includes(normalized));
      renderProducts(filtered);
    };

    searchInput.addEventListener('input', (event) => {
      currentKeyword = event.target.value;
      applyFilter();
    });

    const initializeCatalog = async () => {
      await loadExternalDataset();
      products.forEach((product) => {
        if (!product.observacoes) product.observacoes = '';
        if (!productImages.has(product.id)) setImages(product.id, getImages(product.id));
        product.tags = deriveTags([product.title, product.description]);
      });
      availableTags = Array.from(new Set(products.flatMap((product) => product.tags))).sort();
      renderTagList();
      applyFilter();
    };

    initializeCatalog();
// Auto-generated mind map data
function buildTreeFromSheets(sheets) {
  return {
    title: 'Mapa Mental Tecfag',
    detail: 'Catálogo de máquinas e acessórios organizado por categoria',
    children: sheets.map((sheet) => {
      const headers = sheet.headers || [];
      const [codeLabel, detailLabel, ...attributeLabels] = headers;
      return {
        title: sheet.planilha,
        children: sheet.rows.map((row) => {
          const [code, detail, ...attributes] = row;
          const children = attributeLabels
            .map((label, index) => {
              const value = attributes[index];
              if (value === null || value === undefined || value === '') return null;
              return { title: `${label}: ${value}` };
            })
            .filter(Boolean);
          return { title: `Código: ${code}`, detail, children };
        }),
      };
    }),
  };
}

const data = buildTreeFromSheets(sheetTables);

const sheetTables = appData.sheetTables || [];
const mindmap = document.getElementById('mindmap');
const expandAllBtn = document.getElementById('expand-all');
const collapseAllBtn = document.getElementById('collapse-all');
const searchInput = document.getElementById('search');
function setMeasuredHeight(branch) {
  branch.style.maxHeight = "none";
  const height = branch.scrollHeight;
  branch.style.maxHeight = `${height}px`;
}

function setBranchState(branch, expand) {
  branch.classList.toggle("expanded", expand);
  branch.classList.toggle("collapsed", !expand);
  if (expand) {
    setMeasuredHeight(branch);
  } else {
    branch.style.maxHeight = "0px";
  }
}

function syncBranchHeights() {
  mindmap.querySelectorAll(".branch").forEach((branch) => {
    const isExpanded = branch.classList.contains("expanded");
    setBranchState(branch, isExpanded);
  });
}

function refreshExpandedHeights() {
  mindmap.querySelectorAll(".branch.expanded").forEach((branch) => {
    setMeasuredHeight(branch);
  });
}

let heightSyncHandle = null;
function queueHeightRefresh() {
  if (heightSyncHandle) {
    cancelAnimationFrame(heightSyncHandle);
  }
  heightSyncHandle = requestAnimationFrame(() => {
    refreshExpandedHeights();
    heightSyncHandle = null;
  });
}

function createNode(node, depth = 0) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const listItem = document.createElement("li");
  listItem.dataset.search = `${node.title} ${node.detail || ""}`.toLowerCase();
  const button = document.createElement("button");
  button.className = "toggle-button";
  button.type = "button";
  button.setAttribute("aria-expanded", hasChildren && depth === 0 ? "true" : "false");
  button.setAttribute("aria-label", node.title);

  const card = document.createElement("div");
  card.className = "node-card";

  const chevron = document.createElement("span");
  chevron.className = "chevron";
  card.appendChild(chevron);

  const bullet = document.createElement("span");
  bullet.className = "bullet";
  card.appendChild(bullet);

  const textWrapper = document.createElement("div");
  textWrapper.className = "text";

  const title = document.createElement("p");
  title.className = "node-title";
  title.textContent = node.title;
  textWrapper.appendChild(title);

  if (node.detail) {
    const detail = document.createElement("p");
    detail.className = "node-detail";
    detail.textContent = node.detail;
    textWrapper.appendChild(detail);
  }

  card.appendChild(textWrapper);
  button.appendChild(card);
  listItem.appendChild(button);

  if (hasChildren) {
    const branch = document.createElement("ul");
    const initiallyExpanded = depth === 0;
    branch.className = `branch ${initiallyExpanded ? "expanded" : "collapsed"}`;

    node.children.forEach((child) => {
      branch.appendChild(createNode(child, depth + 1));
    });

    listItem.appendChild(branch);

    button.addEventListener("click", () => {
      const isExpanded = branch.classList.contains("expanded");
      setBranchState(branch, !isExpanded);
      button.setAttribute("aria-expanded", String(!isExpanded));
      adjustAncestorHeights(branch);
      queueHeightRefresh();
    });

    button.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        button.click();
      }
    });
  } else {
    button.classList.add("static");
  }

  return listItem;
}

function renderTree(rootData) {
  mindmap.innerHTML = "";
  const tree = document.createElement("ul");
  tree.className = "tree";
  tree.appendChild(createNode(rootData));
  mindmap.appendChild(tree);
}

function toggleAll(expand = true) {
  const branches = mindmap.querySelectorAll(".branch");
  branches.forEach((branch) => {
    setBranchState(branch, expand);
    const parentButton = branch.previousElementSibling;
    if (parentButton) {
      parentButton.setAttribute("aria-expanded", String(expand));
    }
  });
  queueHeightRefresh();
}

function expandAncestors(listItem) {
  let currentLi = listItem;
  while (currentLi) {
    const branch = currentLi.closest(".branch");
    if (branch) {
      setBranchState(branch, true);
      const parentButton = branch.previousElementSibling;
      if (parentButton) {
        parentButton.setAttribute("aria-expanded", "true");
      }
      currentLi = branch.parentElement?.closest?.("li") || null;
    } else {
      currentLi = null;
    }
  }
}

function resetSearchState() {
  mindmap.classList.remove("has-search");
  mindmap.querySelectorAll(".node-card").forEach((card) => {
    card.classList.remove("search-match", "search-visible");
  });
}

function applySearch(keyword) {
  const query = keyword.trim().toLowerCase();
  resetSearchState();

  if (!query) {
    queueHeightRefresh();
    return;
  }

  mindmap.classList.add("has-search");

  const listItems = mindmap.querySelectorAll("li");
  let firstMatchCard = null;

  listItems.forEach((li) => {
    const haystack = li.dataset.search || "";
    const isMatch = haystack.includes(query);

    if (isMatch) {
      const card = li.querySelector(".node-card");
      card?.classList.add("search-match", "search-visible");
      if (!firstMatchCard) {
        firstMatchCard = card;
      }
      expandAncestors(li);

      let ancestorLi = li.parentElement?.closest?.("li");
      while (ancestorLi) {
        ancestorLi.querySelector(".node-card")?.classList.add("search-visible");
        ancestorLi = ancestorLi.parentElement?.closest?.("li");
      }
    }
  });

  queueHeightRefresh();

  if (firstMatchCard) {
    firstMatchCard.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

renderTree(data);

requestAnimationFrame(syncBranchHeights);

expandAllBtn.addEventListener("click", () => toggleAll(true));
collapseAllBtn.addEventListener("click", () => toggleAll(false));
window.addEventListener("resize", refreshExpandedHeights);
searchInput?.addEventListener("input", (event) => applySearch(event.target.value));

function adjustAncestorHeights(branch) {
  let current = branch;
  while (current) {
    if (current.classList.contains("expanded")) {
      setMeasuredHeight(current);
    }
    current = current.parentElement?.closest?.(".branch") || null;
  }
}

  const viewButtons = document.querySelectorAll('[data-view]');
  const viewSections = {
    chat: document.getElementById('home-view'),
    catalog: document.getElementById('catalog-view'),
    mindmap: document.getElementById('mindmap-view'),
  };

  const setView = (name) => {
    Object.entries(viewSections).forEach(([key, section]) => {
      if (!section) return;
      section.classList.toggle('hidden', key !== name);
    });
  };

  viewButtons.forEach((btn) => {
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });

  setView('chat');
});
