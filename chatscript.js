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
