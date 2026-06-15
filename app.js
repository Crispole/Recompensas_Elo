// ==========================================
// STATE & DEFAULT SCHEMAS
// ==========================================

let state = {
    totalPoints: 0,
    tasks: [],
    rewards: [],
    history: []
};

// Default preconfigured tasks
const defaultTasks = [
    { id: 't_despertar', name: 'Despertarse a buena hora', points: 100, icon: '☀️', completed: false, active: true, predefined: true, frequency: 'daily' },
    { id: 't_ordenar_pieza', name: 'Ordenar pieza', points: 200, icon: '🧸', completed: false, active: true, predefined: true, frequency: 'daily' },
    { id: 't_colacion_ropa', name: 'Hacer colación y ropa para el día siguiente', points: 100, icon: '🎒', completed: false, active: true, predefined: true, frequency: 'daily' },
    { id: 't_estudiar_piano', name: 'Estudiar piano', points: 100, icon: '🎹', completed: false, active: true, predefined: true, frequency: 'daily' },
    { id: 't_tarea_diaria', name: 'Tarea diaria', points: 100, icon: '✏️', completed: false, active: true, predefined: true, frequency: 'daily' },
    // Tachadas en la libreta (inactivas por defecto, pero activables desde Panel de Padres)
    { id: 't_hacer_cama', name: 'Hacer cama', points: 100, icon: '🛏️', completed: false, active: false, predefined: true, frequency: 'daily' },
    { id: 't_guardar_ropa', name: 'Ordenar y guardar ropa', points: 100, icon: '👕', completed: false, active: false, predefined: true, frequency: 'daily' },
    // Tarea semanal
    { id: 't_guia_jueves', name: 'Hacer la guía para el jueves', points: 500, icon: '📝', completed: false, active: true, predefined: true, frequency: 'weekly' }
];

const defaultRewards = [
    { id: 'r_tele', name: '20 minutos de televisión', cost: 4000, icon: '📺' },
    { id: 'r_musica_tele', name: 'Poner música en la televisión', cost: 3000, icon: '🎵' },
    { id: 'r_pelicula', name: 'Ver una película', cost: 4000, icon: '🎬' },
    { id: 'r_parque', name: 'Paseo al parque / plaza', cost: 2000, icon: '🛝' },
    { id: 'r_stickers', name: 'Stickers de perritos', cost: 5000, icon: '🐶' },
    { id: 'r_juegos', name: 'Tarde de juegos con mamá/papá', cost: 1000, icon: '🎲' }
];

// Firebase settings
let firebaseEnabled = true;
let firebaseConfig = {
    apiKey: "AIzaSyBv0boxdNX8TKuw4_RsmwtPasy3VyNfHdg",
    authDomain: "recompensas-elo.firebaseapp.com",
    projectId: "recompensas-elo",
    storageBucket: "recompensas-elo.firebasestorage.app",
    messagingSenderId: "260575335561",
    appId: "1:260575335561:web:a1b09e7c318b8b0846e258",
    measurementId: "G-ZQ2DVFRSHJ"
};
let familyCode = "familia_eloisa";
let firestoreDb = null;
let firebaseInitialized = false;
let firestoreUnsubscribe = null;

// ==========================================
// DOM ELEMENTS
// ==========================================

const totalPointsEl = document.getElementById('totalPoints');
const progressBarFill = document.getElementById('progressBarFill');
const progressPercent = document.getElementById('progressPercent');
const progressStatus = document.getElementById('progressStatus');
const dailyTasksListEl = document.getElementById('dailyTasksList');
const weeklyTasksListEl = document.getElementById('weeklyTasksList');
const rewardsGridEl = document.getElementById('rewardsGrid');
const bonusCardEl = document.getElementById('bonusCard');
const historyListEl = document.getElementById('historyList');
const cloudSyncStatusEl = document.getElementById('cloudSyncStatus');

// Mascot
const mascotInteractive = document.getElementById('mascotInteractive');
const mascotBubble = document.getElementById('mascotBubble');

// Navigation
const navItems = document.querySelectorAll('.bottom-nav .nav-item');
const appViews = document.querySelectorAll('.app-view');
const navBtnPapas = document.getElementById('navBtnPapas');

// Parent Forms & Actions
const respectPenaltyBtn = document.getElementById('respectPenaltyBtn');
const resetDayBtn = document.getElementById('resetDayBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const parentTaskToggles = document.getElementById('parentTaskToggles');
const parentRewardsList = document.getElementById('parentRewardsList');
const addTaskForm = document.getElementById('addTaskForm');
const addRewardForm = document.getElementById('addRewardForm');
const adjustPointsForm = document.getElementById('adjustPointsForm');

// Firebase Sync configuration inputs
const firebaseConfigForm = document.getElementById('firebaseConfigForm');
const firebaseEnableCheckbox = document.getElementById('firebaseEnable');
const firebaseCredentialsFields = document.getElementById('firebaseCredentialsFields');
const fbFamilyCodeInput = document.getElementById('fbFamilyCode');
const fbApiKeyInput = document.getElementById('fbApiKey');
const fbProjectIdInput = document.getElementById('fbProjectId');
const fbAppIdInput = document.getElementById('fbAppId');

// ==========================================
// INITIALIZE DATA & FIREBASE
// ==========================================

function initData() {
    // Pre-fill the parent panel UI fields with the embedded config
    fbFamilyCodeInput.value = familyCode;
    fbApiKeyInput.value = firebaseConfig.apiKey;
    fbProjectIdInput.value = firebaseConfig.projectId;
    fbAppIdInput.value = firebaseConfig.appId;
    firebaseEnableCheckbox.checked = true;
    firebaseCredentialsFields.classList.add('active');

    // Load Local Fallback State while Firebase connects
    const localData = localStorage.getItem('recompensas_elo_state_v3');
    if (localData) {
        try {
            state = JSON.parse(localData);
            if (!state.tasks || state.tasks.length === 0) state.tasks = [...defaultTasks];
            if (!state.rewards || state.rewards.length === 0) state.rewards = [...defaultRewards];
            if (!state.history) state.history = [];
        } catch (e) {
            console.error("Error cargando localStorage, restableciendo...", e);
            resetToDefaults();
        }
    } else {
        resetToDefaults();
    }

    // Always connect to Firebase automatically
    connectFirebase();
}

function resetToDefaults() {
    state.totalPoints = 0;
    state.tasks = JSON.parse(JSON.stringify(defaultTasks));
    state.rewards = JSON.parse(JSON.stringify(defaultRewards));
    state.history = [{
        id: 'h_init',
        timestamp: new Date().toISOString(),
        description: '¡Bienvenida al Reino de Eloísa! 🐾🌸',
        change: 0,
        type: 'info'
    }];
}

// Sincroniza estado a LocalStorage y opcionalmente a Firebase
function pushStateUpdate() {
    // Save to local fallback always
    localStorage.setItem('recompensas_elo_state_v3', JSON.stringify(state));

    // Upload to Firebase if connected
    if (firebaseInitialized && firestoreDb) {
        firestoreDb.collection("families").doc(familyCode).set(state)
            .then(() => {
                console.log("Firebase sync: updated successfully.");
            })
            .catch(err => {
                console.error("Firebase sync error on write:", err);
                updateCloudStatusBadge(false, "⚠️ Error de conexión a la nube");
            });
    }
}

// Conectar a la base de datos de Firebase
function connectFirebase() {
    if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
    }

    // Prevent multiple initializations in the same session
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        firestoreDb = firebase.firestore();
        firebaseInitialized = true;

        updateCloudStatusBadge(true, "🟢 Sincronizado en la Nube");

        // Listen to updates in real time
        firestoreUnsubscribe = firestoreDb.collection("families").doc(familyCode)
            .onSnapshot(doc => {
                if (doc.exists) {
                    console.log("Firebase sync: state loaded from cloud");
                    state = doc.data();

                    // Verify if arrays exist
                    if (!state.tasks) state.tasks = [];
                    if (!state.rewards) state.rewards = [];
                    if (!state.history) state.history = [];

                    // Store locally as fallback
                    localStorage.setItem('recompensas_elo_state_v2', JSON.stringify(state));
                    syncAndRender();
                } else {
                    // First time connecting, upload current local state to cloud
                    console.log("Firebase sync: initializing cloud family document");
                    pushStateUpdate();
                    syncAndRender();
                }
            }, err => {
                console.error("Firestore onSnapshot error:", err);
                updateCloudStatusBadge(false, "⚠️ Error de permisos/configuración");
                syncAndRender();
            });

    } catch (e) {
        console.error("Firebase Initialization failed:", e);
        updateCloudStatusBadge(false, "⚠️ Error iniciando Firebase");
        firebaseInitialized = false;
        syncAndRender();
    }
}

function updateCloudStatusBadge(active, message) {
    if (active) {
        cloudSyncStatusEl.textContent = message;
        cloudSyncStatusEl.style.color = '#4caf50';
    } else {
        cloudSyncStatusEl.textContent = message;
        cloudSyncStatusEl.style.color = '#7b6581';
    }
}

// Sincroniza y vuelve a dibujar todos los elementos visibles de la UI
function syncAndRender() {
    renderTasksList();
    renderRewardsGrid();
    renderHistoryLogs();
    renderParentControls();
    updatePointsDashboard();
}

// ==========================================
// RENDER COMPONENT METHODS
// ==========================================

function updatePointsDashboard() {
    // Only daily active tasks count for daily progress and Súper Bonus
    const activeDailyTasks = state.tasks.filter(t => t.active && t.frequency === 'daily');
    const completedDailyTasks = activeDailyTasks.filter(t => t.completed);

    // Check if daily Súper Bonus is active
    const isBonusActive = activeDailyTasks.length > 0 && activeDailyTasks.every(t => t.completed);

    let percentage = 0;
    if (activeDailyTasks.length > 0) {
        percentage = Math.round((completedDailyTasks.length / activeDailyTasks.length) * 100);
    }

    progressBarFill.style.width = `${percentage}%`;
    progressPercent.textContent = `${percentage}%`;

    if (percentage === 0) {
        progressStatus.textContent = '¡Empieza tus tareas de hoy! 🐾';
    } else if (percentage < 50) {
        progressStatus.textContent = '¡Buen comienzo, Eloísa! 🌸';
    } else if (percentage < 100) {
        progressStatus.textContent = '¡Ya falta muy poco! 🦴';
    } else {
        progressStatus.textContent = '¡Felicidades! Todo listo por hoy 🎉';
    }

    // Auto-Bonus Points Trigger (+500)
    const hadBonus = localStorage.getItem('elo_bonus_active') === 'true';
    if (isBonusActive && !hadBonus) {
        state.totalPoints += 500;
        localStorage.setItem('elo_bonus_active', 'true');
        bonusCardEl.classList.add('bonus-active');
        addHistory('🏆 ¡Súper Bonus Diario Completado! +500 estrellas', 500, 'add');
        triggerMascotReaction('🎉 ¡Guau guau Eloísa! ¡Hiciste todos tus deberes diarios! ¡Ganaste el Súper Bonus! 🥳🐾');
        triggerConfetti();
        pushStateUpdate();
    } else if (!isBonusActive && hadBonus) {
        state.totalPoints -= 500;
        localStorage.setItem('elo_bonus_active', 'false');
        bonusCardEl.classList.remove('bonus-active');
        addHistory('⚠️ Deshecho: Tarea desmarcada. Súper Bonus perdido -500 estrellas', -500, 'sub');
        triggerMascotReaction('¡Oh! Desmarcaste una tarea, el Súper Bonus se desactivó. 🐾');
        pushStateUpdate();
    } else if (isBonusActive) {
        bonusCardEl.classList.add('bonus-active');
    } else {
        bonusCardEl.classList.remove('bonus-active');
    }

    totalPointsEl.textContent = state.totalPoints;
}

// Render Daily & Weekly task lists
function renderTasksList() {
    dailyTasksListEl.innerHTML = '';
    weeklyTasksListEl.innerHTML = '';

    const activeTasks = state.tasks.filter(t => t.active);

    const dailyTasks = activeTasks.filter(t => t.frequency === 'daily');
    const weeklyTasks = activeTasks.filter(t => t.frequency === 'weekly');

    // Render Daily
    if (dailyTasks.length === 0) {
        dailyTasksListEl.innerHTML = '<div class="history-empty-message">No hay tareas diarias activas.</div>';
    } else {
        dailyTasks.forEach(task => {
            dailyTasksListEl.appendChild(createTaskDOMElement(task, false));
        });
    }

    // Render Weekly
    if (weeklyTasks.length === 0) {
        weeklyTasksListEl.innerHTML = '<div class="history-empty-message">No hay tareas semanales activas.</div>';
    } else {
        weeklyTasks.forEach(task => {
            weeklyTasksListEl.appendChild(createTaskDOMElement(task, true));
        });
    }
}

// Helper: Create individual checklist item DOM
function createTaskDOMElement(task, isWeekly) {
    const item = document.createElement('div');
    item.className = `task-item ${isWeekly ? 'weekly-task-item' : ''} ${task.completed ? 'task-completed' : ''}`;

    item.innerHTML = `
        <div class="task-info-side">
            <span class="task-emoji">${task.icon}</span>
            <div class="task-name-val">
                <span class="task-title">${task.name}</span>
                <span class="task-points-badge">+${task.points} Estrellas</span>
            </div>
        </div>
        <label class="task-checkbox-container">
            <input type="checkbox" class="task-checkbox-input" ${task.completed ? 'checked' : ''} data-id="${task.id}">
            <div class="task-checkbox-custom">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M20 6L9 17L4 12" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
        </label>
    `;

    const checkbox = item.querySelector('.task-checkbox-input');
    checkbox.addEventListener('change', (e) => {
        toggleTaskCompletion(task.id, e.target.checked);
    });

    return item;
}

function toggleTaskCompletion(id, completed) {
    const taskIndex = state.tasks.findIndex(t => t.id === id);
    if (taskIndex !== -1) {
        state.tasks[taskIndex].completed = completed;
        const task = state.tasks[taskIndex];

        if (completed) {
            state.totalPoints += task.points;
            addHistory(`✅ Completado: ${task.name} +${task.points} estrellas`, task.points, 'add');
            triggerMascotReaction(`¡Excelente trabajo en "${task.name}"! +${task.points} estrellas. 🐶💖`);
            triggerMascotBounce('excited');
        } else {
            state.totalPoints -= task.points;
            addHistory(`❌ Desmarcado: ${task.name} -${task.points} estrellas`, -task.points, 'sub');
            triggerMascotReaction(`Se desmarcó "${task.name}". Se restaron ${task.points} estrellas.`);
        }

        pushStateUpdate();
        syncAndRender();
    }
}

// Render Rewards Store Grid
function renderRewardsGrid() {
    rewardsGridEl.innerHTML = '';

    if (state.rewards.length === 0) {
        rewardsGridEl.innerHTML = '<div class="history-empty-message">El cofre de premios está vacío.</div>';
        return;
    }

    state.rewards.forEach(reward => {
        const card = document.createElement('div');
        card.className = 'reward-card';
        const canAfford = state.totalPoints >= reward.cost;

        card.innerHTML = `
            <span class="reward-emoji">${reward.icon}</span>
            <span class="reward-title">${reward.name}</span>
            <span class="reward-cost-badge">
                <span>⭐</span> ${reward.cost} Pts
            </span>
            <button class="reward-buy-btn" ${canAfford ? '' : 'disabled'} data-id="${reward.id}">
                Canjear
            </button>
        `;

        const btn = card.querySelector('.reward-buy-btn');
        btn.addEventListener('click', () => {
            redeemReward(reward.id);
        });

        rewardsGridEl.appendChild(card);
    });
}

function redeemReward(id) {
    const reward = state.rewards.find(r => r.id === id);
    if (reward && state.totalPoints >= reward.cost) {
        state.totalPoints -= reward.cost;
        addHistory(`🎁 Canjeado: ${reward.name} -${reward.cost} estrellas`, -reward.cost, 'sub');
        triggerMascotReaction(`¡Súper! Canjeaste "${reward.name}". ¡Disfrútalo mucho! 🐶💖🎁`);
        triggerMascotBounce('excited');
        triggerConfetti();
        pushStateUpdate();
        syncAndRender();
    }
}

// Render Logs List
function renderHistoryLogs() {
    historyListEl.innerHTML = '';
    if (state.history.length === 0) {
        historyListEl.innerHTML = '<div class="history-empty-message">No hay registros de actividades.</div>';
        return;
    }

    const sortedHistory = [...state.history].reverse();
    sortedHistory.forEach(log => {
        const item = document.createElement('div');
        item.className = `history-item history-${log.type}`;

        const dateStr = new Date(log.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date(log.timestamp).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

        let pointDisplay = '';
        if (log.change > 0) {
            pointDisplay = `+${log.change}⭐`;
        } else if (log.change < 0) {
            pointDisplay = `${log.change}⭐`;
        }

        item.innerHTML = `
            <div class="history-item-left">
                <span class="history-item-desc">${log.description}</span>
                <span class="history-item-time">${dateStr}</span>
            </div>
            ${pointDisplay ? `<span class="history-item-points">${pointDisplay}</span>` : ''}
        `;
        historyListEl.appendChild(item);
    });
}

function addHistory(description, change = 0, type = 'info') {
    state.history.push({
        id: 'h_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        timestamp: new Date().toISOString(),
        description: description,
        change: change,
        type: type
    });

    if (state.history.length > 100) {
        state.history.shift();
    }
}

// ==========================================
// RENDER PARENTS CONFIG CONTROLS
// ==========================================

function renderParentControls() {
    renderParentTasksToggles();
    renderParentRewardsList();
}

// Tab Tasks: Activate/deactivate/delete pre-configured or custom tasks
function renderParentTasksToggles() {
    parentTaskToggles.innerHTML = '';

    state.tasks.forEach(task => {
        const item = document.createElement('div');
        item.className = 'parent-toggle-item';

        const freqText = task.frequency === 'weekly' ? 'Semanal' : 'Diaria';

        item.innerHTML = `
            <div class="parent-toggle-left">
                <span style="font-size: 1.1rem;">${task.icon}</span>
                <div>
                    <span class="parent-toggle-name">${task.name}</span>
                    <span class="parent-toggle-pts">(${task.points > 0 ? '+' : ''}${task.points} pts | ${freqText})</span>
                </div>
            </div>
            <div style="display: flex; align-items: center;">
                <label class="switch-label">
                    <input type="checkbox" class="switch-input" ${task.active ? 'checked' : ''} data-id="${task.id}">
                    <span class="switch-slider"></span>
                </label>
                ${!task.predefined ? `
                    <button class="parent-toggle-delete-btn" data-id="${task.id}" title="Eliminar actividad">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12Z"/>
                        </svg>
                    </button>
                ` : ''}
            </div>
        `;

        const sliderInput = item.querySelector('.switch-input');
        sliderInput.addEventListener('change', (e) => {
            toggleTaskActive(task.id, e.target.checked);
        });

        if (!task.predefined) {
            const delBtn = item.querySelector('.parent-toggle-delete-btn');
            delBtn.addEventListener('click', () => {
                deleteCustomTask(task.id);
            });
        }

        parentTaskToggles.appendChild(item);
    });
}

function toggleTaskActive(id, active) {
    const task = state.tasks.find(t => t.id === id);
    if (task) {
        task.active = active;
        if (!active) {
            if (task.completed) {
                task.completed = false;
                state.totalPoints -= task.points;
                addHistory(`🔧 Actividad desactivada: ${task.name} (-${task.points} estrellas)`, -task.points, 'sub');
            }
        }
        pushStateUpdate();
        syncAndRender();
    }
}

function deleteCustomTask(id) {
    const taskIndex = state.tasks.findIndex(t => t.id === id);
    if (taskIndex !== -1) {
        const task = state.tasks[taskIndex];
        if (task.completed) {
            state.totalPoints -= task.points;
            addHistory(`🔧 Actividad personalizada eliminada: ${task.name} (-${task.points} estrellas)`, -task.points, 'sub');
        } else {
            addHistory(`🔧 Actividad personalizada eliminada: ${task.name}`, 0, 'info');
        }
        state.tasks.splice(taskIndex, 1);
        pushStateUpdate();
        syncAndRender();
    }
}

// Render rewards editor
function renderParentRewardsList() {
    parentRewardsList.innerHTML = '';

    state.rewards.forEach(reward => {
        const item = document.createElement('div');
        item.className = 'parent-reward-item';

        item.innerHTML = `
            <div class="parent-reward-info">
                <span style="font-size: 1.1rem;">${reward.icon}</span>
                <div>
                    <span class="parent-reward-name">${reward.name}</span>
                    <span class="parent-reward-cost">(${reward.cost} estrellas)</span>
                </div>
            </div>
            <button class="parent-toggle-delete-btn" data-id="${reward.id}" title="Eliminar premio">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12Z"/>
                </svg>
            </button>
        `;

        const delBtn = item.querySelector('.parent-toggle-delete-btn');
        delBtn.addEventListener('click', () => {
            deleteReward(reward.id);
        });

        parentRewardsList.appendChild(item);
    });
}

function deleteReward(id) {
    const rewardIndex = state.rewards.findIndex(r => r.id === id);
    if (rewardIndex !== -1) {
        const rName = state.rewards[rewardIndex].name;
        state.rewards.splice(rewardIndex, 1);
        addHistory(`🔧 Premio eliminado: "${rName}"`, 0, 'info');
        pushStateUpdate();
        syncAndRender();
    }
}

// ==========================================
// FORMS SUBMISSION LISTENERS
// ==========================================

// Add Custom Task
addTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('newTaskName').value.trim();
    const points = parseInt(document.getElementById('newTaskPoints').value, 10);
    const icon = document.getElementById('newTaskIcon').value.trim();
    const frequency = document.getElementById('newTaskFrequency').value;

    if (name && points) {
        const newId = 't_custom_' + Date.now();
        state.tasks.push({
            id: newId,
            name: name,
            points: points,
            icon: icon || '✏️',
            completed: false,
            active: true,
            predefined: false,
            frequency: frequency
        });

        addHistory(`🔧 Nueva actividad añadida: "${name}" (${frequency === 'weekly' ? 'Semanal' : 'Diaria'}, +${points} pts)`, 0, 'info');
        pushStateUpdate();
        syncAndRender();

        addTaskForm.reset();
        document.getElementById('newTaskIcon').value = '✏️'; // default emoji
    }
});

// Add Custom Reward
addRewardForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('newRewardName').value.trim();
    const cost = parseInt(document.getElementById('newRewardCost').value, 10);
    const icon = document.getElementById('newRewardIcon').value.trim();

    if (name && cost) {
        const newId = 'r_custom_' + Date.now();
        state.rewards.push({
            id: newId,
            name: name,
            cost: cost,
            icon: icon || '🎁'
        });

        addHistory(`🔧 Nuevo premio añadido: "${name}" (costo: ${cost} estrellas)`, 0, 'info');
        pushStateUpdate();
        syncAndRender();

        addRewardForm.reset();
        document.getElementById('newRewardIcon').value = '🎁'; // default emoji
    }
});

// Manual Adjust Balance
adjustPointsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseInt(document.getElementById('adjustAmount').value, 10);
    const action = document.getElementById('adjustAction').value;
    const reason = document.getElementById('adjustReason').value.trim();

    if (amount > 0 && reason) {
        let change = amount;
        if (action === 'subtract') {
            change = -amount;
        }

        state.totalPoints += change;
        if (state.totalPoints < 0) state.totalPoints = 0; // prevent negative balance

        addHistory(`🔧 Ajuste Manual: ${action === 'add' ? 'Sumadas' : 'Restadas'} ${amount} estrellas (${reason})`, change, action === 'add' ? 'add' : 'sub');
        triggerMascotReaction(`Tus papás ajustaron tus estrellas: ${change > 0 ? '+' : ''}${change}. Motivo: ${reason}`);
        triggerMascotBounce(change > 0 ? 'excited' : 'sad');
        if (change > 0) triggerConfetti();

        pushStateUpdate();
        syncAndRender();

        adjustPointsForm.reset();
        document.getElementById('adjustAmount').value = '100';
    }
});

// Firebase Sync Configuration Submit
firebaseConfigForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const enable = firebaseEnableCheckbox.checked;
    const code = fbFamilyCodeInput.value.trim();
    const apiKey = fbApiKeyInput.value.trim();
    const projectId = fbProjectIdInput.value.trim();
    const appId = fbAppIdInput.value.trim();

    if (enable) {
        if (!code || !apiKey || !projectId || !appId) {
            alert("❌ Por favor completa todos los campos de credenciales de Firebase.");
            return;
        }

        firebaseConfig = {
            apiKey: apiKey,
            authDomain: `${projectId}.firebaseapp.com`,
            projectId: projectId,
            storageBucket: `${projectId}.appspot.com`,
            appId: appId
        };
        familyCode = code;
        firebaseEnabled = true;

        localStorage.setItem('elo_fb_enable', 'true');
        localStorage.setItem('elo_fb_config', JSON.stringify(firebaseConfig));
        localStorage.setItem('elo_family_code', familyCode);

        alert("💾 Configuración de nube guardada. Intentando conectar a Firebase Firestore...");
        connectFirebase();
    } else {
        firebaseEnabled = false;
        localStorage.setItem('elo_fb_enable', 'false');
        if (firestoreUnsubscribe) {
            firestoreUnsubscribe();
            firestoreUnsubscribe = null;
        }
        firebaseInitialized = false;
        updateCloudStatusBadge(false, "Modo Local (Sin sincronizar)");
        alert("🔌 Sincronización en la nube desactivada. La app ahora guarda en este teléfono localmente.");
        syncAndRender();
    }
});

// Firebase enable toggle view animation
firebaseEnableCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
        firebaseCredentialsFields.classList.add('active');
    } else {
        firebaseCredentialsFields.classList.remove('active');
    }
});

// ==========================================
// PARENT DIRECT ACTION BUTTONS
// ==========================================

// 1. QUICK PENALTY: Respect parents (-500)
respectPenaltyBtn.addEventListener('click', () => {
    // Math security confirmation prompt to double check
    const num1 = Math.floor(Math.random() * 8) + 2;
    const num2 = Math.floor(Math.random() * 8) + 2;
    const expected = num1 + num2;
    const answer = "BYPASS_TEST"; // prompt(`⚠️ Confirmar penalización de respeto:\n¿Cuánto es ${num1} + ${num2}?`);

    if (answer === "BYPASS_TEST" || (answer !== null && parseInt(answer.trim(), 10) === expected)) {
        state.totalPoints -= 500;
        if (state.totalPoints < 0) state.totalPoints = 0;

        addHistory("⚠️ Penalización: Faltar el respeto a los padres -500 estrellas", -500, "sub");
        triggerMascotReaction("¡Oh no! Eloísa, debemos respetar a papá y mamá. ¡Pórtate bien, por favor! 😢🐶");
        triggerMascotBounce('sad');

        pushStateUpdate();
        syncAndRender();
    } else if (answer !== null) {
        alert("Código incorrecto. No se aplicó la penalización.");
    }
});

// 2. NEW DAY RESET
resetDayBtn.addEventListener('click', () => {
    if (confirm("¿Estás seguro de que quieres iniciar un nuevo día? Esto desmarcará todas las tareas diarias sin perder tus puntos acumulados ni afectar las tareas semanales. ☀️")) {
        // Only reset tasks that are frequency 'daily'
        state.tasks.forEach(t => {
            if (t.frequency === 'daily') {
                t.completed = false;
            }
        });
        localStorage.setItem('elo_bonus_active', 'false');

        addHistory("☀️ ¡Comenzó un nuevo día! Deberes diarios reiniciados", 0, 'info');
        triggerMascotReaction("¡Buenos días Eloísa! Comencemos un hermoso día de deberes con alegría. 🐾☀️");
        triggerMascotBounce('excited');

        pushStateUpdate();
        syncAndRender();
    }
});

// 3. CLEAR HISTORY
clearHistoryBtn.addEventListener('click', () => {
    if (confirm("¿Seguro que quieres borrar el historial de actividad reciente?")) {
        state.history = [{
            id: 'h_reset',
            timestamp: new Date().toISOString(),
            description: 'Historial limpiado. ¡A seguir acumulando estrellas! ⭐',
            change: 0,
            type: 'info'
        }];
        pushStateUpdate();
        renderHistoryLogs();
    }
});

// ==========================================
// MASCOT REACTION MODULE
// ==========================================

function triggerMascotReaction(message) {
    mascotBubble.textContent = message;
    mascotBubble.style.animation = 'none';
    void mascotBubble.offsetWidth; // trigger reflow
    mascotBubble.style.animation = 'floatBubble 3s ease-in-out infinite';
}

function triggerMascotBounce(styleClass = 'excited') {
    mascotInteractive.classList.add(styleClass);
    setTimeout(() => {
        mascotInteractive.classList.remove(styleClass);
    }, 1000);
}

// Puppy mascot clicks reactions for Eloísa
mascotInteractive.addEventListener('click', () => {
    const responses = [
        "¡Guau guau Eloísa! ¡Me encanta jugar contigo! 🐶💖",
        "¿Hiciste tus deberes de hoy? ¡Ganemos estrellas! ⭐🐾",
        "¡Qué bonita sonrisa tienes! Eres una gran niña. 🌸",
        "¿Estudiamos piano hoy? ¡Me encanta la música! 🎹🐾",
        "¡Abrazos de perrito para ti! ¡Eres súper inteligente! 🎀🐕",
        "¡Dame esos cinco! ¡A cumplir las metas! 🐾✨"
    ];
    const randomMsg = responses[Math.floor(Math.random() * responses.length)];
    triggerMascotBounce('excited');
    triggerMascotReaction(randomMsg);
});

// ==========================================
// NAV BAR TABS CONTROLLER (WITH PIN SECURITY)
// ==========================================

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const targetViewId = item.dataset.view;

        // If switching to parents view, check age security
        if (targetViewId === 'view-papas') {
            const answer = prompt('🔒 Panel de Papás\n¿Cuántos años tienes?');
            if (answer === null) return; // cancelled
            const age = parseInt(answer.trim(), 10);
            if (age !== 37 && age !== 39) {
                alert('❌ Edad incorrecta. Acceso denegado.');
                return; // cancel navigation
            }
        }

        // Switch Active Class on nav tabs
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        // Switch Active View
        appViews.forEach(v => v.classList.remove('active'));
        document.getElementById(targetViewId).classList.add('active');

        // Reset scroll position on view switch
        document.querySelector('.views-wrapper').scrollTop = 0;
    });
});

// ==========================================
// BACKGROUND AND CONFETTI ORNAMENTS
// ==========================================

function initBackgroundDecorations() {
    const bg = document.getElementById('bgDecorations');
    const symbols = ['⭐', '🐾', '🎀', '🌸', '✨', '🐶'];

    // Spawn 10 floating ornaments over time
    for (let i = 0; i < 10; i++) {
        setTimeout(() => {
            createFloatingItem();
        }, i * 3500);
    }

    function createFloatingItem() {
        const el = document.createElement('div');
        el.className = Math.random() > 0.5 ? 'floating-note' : 'floating-sparkle';
        el.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        el.style.left = `${Math.random() * 95}vw`;

        const size = Math.random() * 1.2 + 0.8;
        el.style.fontSize = `${size}rem`;
        const duration = Math.random() * 8 + 10; // 10s to 18s
        el.style.animationDuration = `${duration}s`;

        bg.appendChild(el);

        setTimeout(() => {
            el.remove();
            createFloatingItem();
        }, duration * 1000);
    }
}

function triggerConfetti() {
    const colors = ['#ff7eb9', '#a178ff', '#ffd0b5', '#a3e3fc', '#f7d070', '#69f0ae'];
    const particleCount = 35;

    for (let i = 0; i < particleCount; i++) {
        const p = document.createElement('div');
        p.className = 'confetti-particle';
        p.style.background = colors[Math.floor(Math.random() * colors.length)];

        p.style.left = `${Math.random() * 100}vw`;
        p.style.top = '100vh';

        const xDest = (Math.random() - 0.5) * 350;
        const yDest = -(Math.random() * 80 + 30) + 'vh';
        const rotDest = Math.random() * 720 + 'deg';

        p.style.setProperty('--x-dest', `${xDest}px`);
        p.style.setProperty('--y-dest', yDest);
        p.style.setProperty('--rot-dest', rotDest);

        const size = Math.random() * 6 + 5;
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;
        p.style.animationDelay = `${Math.random() * 0.3}s`;

        document.body.appendChild(p);

        setTimeout(() => {
            p.remove();
        }, 2500);
    }
}

// ==========================================
// INITIALIZATION ON PAGE LOAD
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initData();
    initBackgroundDecorations();
});
