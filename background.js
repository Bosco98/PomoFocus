let state = {
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

async function setupOffscreen() {
    try {
        const existing = await chrome.offscreen.hasDocument();
        if (!existing) {
            await chrome.offscreen.createDocument({
                url: 'offscreen.html',
                reasons: ['AUDIO_PLAYBACK'],
                justification: 'Timer alerts and sounds'
            });
        }
    } catch (e) {
        console.log("Offscreen setup error:", e);
    }
}

chrome.runtime.onStartup.addListener(setupOffscreen);
chrome.runtime.onInstalled.addListener(setupOffscreen);

function updateBadge() {
    if (state.state === 'running') {
        const mins = Math.floor(state.remainingSeconds / 60);
        chrome.action.setBadgeText({ text: mins > 0 ? mins.toString() : "<1" });
        chrome.action.setBadgeBackgroundColor({ color: state.mode === 'tabata' && state.tabataPhase === 'rest' ? '#9ec5fe' : '#ff85a9' });
    } else {
        chrome.action.setBadgeText({ text: '' });
    }
}

function showNotification(title, message) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: title,
        message: message,
        priority: 2
    });
}

async function playAlert() {
    await setupOffscreen();
    chrome.runtime.sendMessage({ command: 'play_sound' }).catch(() => { });
}

// We rely on alarms for reliable background tick
function startAlarm() {
    state.lastTickTime = Date.now();
    chrome.alarms.create('timerTick', { periodInMinutes: 1 / 60 }); // Roughly every 1s
}

function stopAlarm() {
    chrome.alarms.clear('timerTick');
}

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'timerTick') {
        handleTick();
    }
});

function handleTick() {
    if (state.state !== 'running') return;

    // Calculate precise time difference to account for any delay in alarms
    const now = Date.now();
    const elapsedSecs = Math.round((now - state.lastTickTime) / 1000);

    if (elapsedSecs > 0) {
        state.remainingSeconds -= elapsedSecs;
        state.lastTickTime = now;

        if (state.remainingSeconds < 0) state.remainingSeconds = 0;
    } else {
        return; // wait for next tick
    }

    if (state.remainingSeconds <= 0) {
        if (state.mode === 'tabata') {
            if (state.tabataPhase === 'work') {
                playAlert();
                state.tabataPhase = 'rest';
                state.remainingSeconds = state.tabataRestSecs;
                state.totalSeconds = state.tabataRestSecs;
                state.lastTickTime = Date.now();
                showNotification("Tabata Rest", `Round ${state.tabataRound} complete. Rest for ${state.tabataRestSecs}s!`);
            } else {
                state.tabataRound++;
                if (state.tabataRound > state.tabataMaxRounds) {
                    playAlert();
                    state.state = 'stopped';
                    state.remainingSeconds = state.tabataWorkSecs;
                    state.totalSeconds = state.tabataWorkSecs;
                    state.tabataRound = 1;
                    state.tabataPhase = 'work';
                    showNotification("Tabata Complete!", `Great job! You finished ${state.tabataMaxRounds} rounds.`);
                    stopAlarm();
                } else {
                    playAlert();
                    state.tabataPhase = 'work';
                    state.remainingSeconds = state.tabataWorkSecs;
                    state.totalSeconds = state.tabataWorkSecs;
                    state.lastTickTime = Date.now();
                    showNotification("Tabata Work", `Round ${state.tabataRound} started. Go!`);
                }
            }
        } else {
            playAlert();
            state.state = 'stopped';
            let title = "Timer Complete";
            let msg = "Time is up!";
            if (state.mode === 'focus') { title = "Focus Done"; msg = "Take a break!"; }
            else if (state.mode === 'shortBreak' || state.mode === 'longBreak') { title = "Break Over"; msg = "Ready to focus?"; }
            showNotification(title, msg);
            stopAlarm();
            state.remainingSeconds = state.totalSeconds;
        }
    }
    updateBadge();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.command === 'get_state') {
        // We calculate on-the-fly when popup polls
        if (state.state === 'running') {
            const now = Date.now();
            const elapsed = Math.round((now - state.lastTickTime) / 1000);
            if (elapsed > 0 && elapsed <= state.remainingSeconds) {
                state.remainingSeconds -= elapsed;
                state.lastTickTime = now;
            }
        }
        sendResponse(state);
    } else if (request.command === 'get_state_raw') {
        // Only return true base state without adjusting - popup.js does local interpolation
        sendResponse(state);
    } else if (request.command === 'set_mode') {
        state.mode = request.mode;

        if (request.mode === 'tabata') {
            state.totalSeconds = state.tabataWorkSecs;
            state.remainingSeconds = state.tabataWorkSecs;
            state.tabataRound = 1;
            state.tabataPhase = 'work';
        } else {
            state.totalSeconds = request.totalSeconds;
            state.remainingSeconds = request.totalSeconds;
        }

        state.state = 'stopped';
        updateBadge();
        stopAlarm();
        sendResponse({ success: true });
    } else if (request.command === 'set_tabata_config') {
        state.tabataWorkSecs = request.workSecs;
        state.tabataRestSecs = request.restSecs;
        state.tabataMaxRounds = request.maxRounds;
        if (state.mode === 'tabata' && state.state === 'stopped') {
            state.totalSeconds = state.tabataWorkSecs;
            state.remainingSeconds = state.tabataWorkSecs;
            state.tabataRound = 1;
            state.tabataPhase = 'work';
        }
        sendResponse({ success: true });
    } else if (request.command === 'start') {
        if (state.remainingSeconds <= 0) {
            state.remainingSeconds = state.totalSeconds;
        }
        state.state = 'running';
        startAlarm();
        updateBadge();
        sendResponse({ success: true });
    } else if (request.command === 'pause') {
        // Force an update before pausing
        if (state.state === 'running') {
            const now = Date.now();
            const elapsed = Math.round((now - state.lastTickTime) / 1000);
            if (elapsed > 0 && elapsed <= state.remainingSeconds) {
                state.remainingSeconds -= elapsed;
            }
        }
        state.state = 'paused';
        stopAlarm();
        updateBadge();
        sendResponse({ success: true });
    } else if (request.command === 'reset') {
        state.state = 'stopped';
        if (state.mode === 'tabata') {
            state.remainingSeconds = state.tabataWorkSecs;
            state.totalSeconds = state.tabataWorkSecs;
        } else {
            state.remainingSeconds = state.totalSeconds;
        }
        state.tabataRound = 1;
        state.tabataPhase = 'work';
        updateBadge();
        stopAlarm();
        sendResponse({ success: true });
    }
    return true;
});
