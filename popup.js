let currentState = {
    state: 'stopped',
    mode: 'focus',
    remainingSeconds: 25 * 60,
    totalSeconds: 25 * 60,
    tabataRound: 1,
    tabataPhase: 'work',
    tabataWorkSecs: 20,
    tabataRestSecs: 10,
    tabataMaxRounds: 8,
    lastTickTime: 0
};

const MODES = {
    focus: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60
};

const circle = document.querySelector('.progress-ring__circle');
const radius = circle.r.baseVal.value; // should be 100
const circumference = radius * 2 * Math.PI; // 628.32
circle.style.strokeDasharray = `${circumference} ${circumference}`;
circle.style.strokeDashoffset = 0;

function setProgress(percent) {
    const offset = circumference - percent / 100 * circumference;
    circle.style.strokeDashoffset = offset;
}

function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function renderEditableSettings() {
    const editableSettings = document.getElementById('editableSettings');
    editableSettings.innerHTML = '';

    // Auto-update inputs visibility based on mode and state
    if (currentState.state === 'running' || currentState.state === 'paused') {
        editableSettings.classList.add('hidden');
        return;
    }

    if (currentState.mode === 'tabata') {
        editableSettings.innerHTML = `
            <div class="edit-group">
                <span class="edit-label">Work(s)</span>
                <input type="number" id="tabataWork" class="edit-input" value="${currentState.tabataWorkSecs}" min="1" max="999">
            </div>
            <div class="edit-group">
                <span class="edit-label">Rest(s)</span>
                <input type="number" id="tabataRest" class="edit-input" value="${currentState.tabataRestSecs}" min="1" max="999">
            </div>
            <div class="edit-group">
                <span class="edit-label">Rounds</span>
                <input type="number" id="tabataRounds" class="edit-input" value="${currentState.tabataMaxRounds}" min="1" max="99">
            </div>
        `;
        editableSettings.classList.remove('hidden');

        ['tabataWork', 'tabataRest', 'tabataRounds'].forEach(id => {
            document.getElementById(id).addEventListener('change', updateTabataVals);
            document.getElementById(id).addEventListener('keyup', (e) => {
                if (e.key === 'Enter') updateTabataVals();
            });
        });

    } else if (currentState.mode === 'custom') {
        const mins = Math.floor(currentState.totalSeconds / 60);
        const secs = currentState.totalSeconds % 60;
        editableSettings.innerHTML = `
            <div class="edit-group">
                <span class="edit-label">Min</span>
                <input type="number" id="customMins" class="edit-input" value="${mins}" min="0" max="999">
            </div>
            <div class="edit-group">
                <span class="edit-label">Sec</span>
                <input type="number" id="customSecs" class="edit-input" value="${secs}" min="0" max="59">
            </div>
        `;
        editableSettings.classList.remove('hidden');

        ['customMins', 'customSecs'].forEach(id => {
            document.getElementById(id).addEventListener('change', updateCustomVals);
            document.getElementById(id).addEventListener('keyup', (e) => {
                if (e.key === 'Enter') updateCustomVals();
            });
        });
    } else {
        editableSettings.classList.add('hidden');
    }
}

function updateTabataVals() {
    const w = parseInt(document.getElementById('tabataWork').value) || 20;
    const r = parseInt(document.getElementById('tabataRest').value) || 10;
    const rounds = parseInt(document.getElementById('tabataRounds').value) || 8;

    chrome.runtime.sendMessage({
        command: 'set_tabata_config',
        workSecs: w,
        restSecs: r,
        maxRounds: rounds
    }, () => fetchState(true));
}

function updateCustomVals() {
    const m = parseInt(document.getElementById('customMins').value) || 0;
    const s = parseInt(document.getElementById('customSecs').value) || 0;
    const total = m * 60 + s;
    if (total > 0) {
        chrome.runtime.sendMessage({
            command: 'set_mode',
            mode: 'custom',
            totalSeconds: total
        }, () => fetchState(true));
    }
}

let lastRenderedMode = '';

function updateUI() {
    let displaySeconds = currentState.remainingSeconds;

    // Smooth UI interpolation without spamming background.js
    if (currentState.state === 'running' && currentState.lastTickTime > 0) {
        const now = Date.now();
        const elapsed = Math.round((now - currentState.lastTickTime) / 1000);

        if (elapsed > 0) {
            displaySeconds = Math.max(0, currentState.remainingSeconds - elapsed);
        }
    }

    document.getElementById('timeRemaining').textContent = formatTime(displaySeconds);

    // Progress ring calculation based on interpolated UI seconds
    let percent = (displaySeconds / currentState.totalSeconds) * 100;
    if (isNaN(percent)) percent = 100;
    setProgress(percent);

    // Tabata info
    const tabataInfo = document.getElementById('tabataInfo');
    if (currentState.mode === 'tabata') {
        tabataInfo.classList.remove('hidden');
        tabataInfo.innerHTML = `Round ${currentState.tabataRound}/${currentState.tabataMaxRounds}<br>${currentState.tabataPhase === 'work' ? 'WORK' : 'REST'}`;
        // Change colors
        const color = currentState.tabataPhase === 'work' ? 'var(--ring-fg)' : '#9ec5fe'; // Blueish for rest
        const glow = currentState.tabataPhase === 'work' ? 'drop-shadow(0 0 8px rgba(255, 133, 169, 0.5))' : 'drop-shadow(0 0 8px rgba(158, 197, 254, 0.5))';

        circle.style.stroke = color;
        circle.style.filter = glow;
        tabataInfo.style.color = color;
        tabataInfo.style.textShadow = `0 0 6px ${color}88`; // hex + 88 alpha
    } else {
        tabataInfo.classList.add('hidden');
        circle.style.stroke = 'var(--ring-fg)';
        circle.style.filter = 'drop-shadow(0 0 8px rgba(255, 133, 169, 0.5))';
    }

    // Controls visibility
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');

    if (currentState.state === 'running') {
        startBtn.classList.add('hidden');
        pauseBtn.classList.remove('hidden');
    } else {
        startBtn.classList.remove('hidden');
        pauseBtn.classList.add('hidden');
    }

    // Editable settings render on stop or mode change
    if (lastRenderedMode !== currentState.mode || currentState.state !== 'stopped') {
        renderEditableSettings();
        lastRenderedMode = currentState.mode;
    }

    // Active mode button classes
    document.querySelectorAll('.mode-btn').forEach(btn => {
        if (btn.dataset.mode === currentState.mode) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Handle end-of-timer transitions gracefully by requesting fresh exact state from background
    if (displaySeconds === 0 && currentState.state === 'running') {
        fetchState(true);
    }
}

// Fetch the absolute truth from the background script
function fetchState(forceRender = false) {
    chrome.runtime.sendMessage({ command: 'get_state_raw' }, (res) => {
        if (res) {
            currentState = res;
            if (forceRender) updateUI();
        }
    });
}

// Initial mode setup
lastRenderedMode = currentState.mode;
renderEditableSettings();

// Sync background state continuously (only network payload, no render)
setInterval(() => fetchState(false), 1000);

// Decoupled ultra-smooth UI render loop (doesn't trigger background messages)
function uiLoop() {
    updateUI();
    requestAnimationFrame(uiLoop);
}

// Boot up
fetchState(true);
requestAnimationFrame(uiLoop);

// Set up mode buttons
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const mode = e.target.dataset.mode;

        if (mode === 'tabata') {
            chrome.runtime.sendMessage({
                command: 'set_mode',
                mode: 'tabata',
                // Keep existing tabata config in background
                totalSeconds: currentState.tabataWorkSecs
            }, () => fetchState(true));
        } else if (mode === 'custom') {
            let total = currentState.mode === 'custom' ? currentState.totalSeconds : 10 * 60;
            chrome.runtime.sendMessage({
                command: 'set_mode',
                mode: 'custom',
                totalSeconds: total
            }, () => fetchState(true));
        } else {
            chrome.runtime.sendMessage({
                command: 'set_mode',
                mode: mode,
                totalSeconds: MODES[mode]
            }, () => fetchState(true));
        }
    });
});

document.getElementById('startBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ command: 'start' }, () => fetchState(true));
});

document.getElementById('pauseBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ command: 'pause' }, () => fetchState(true));
});

document.getElementById('resetBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ command: 'reset' }, () => fetchState(true));
});
