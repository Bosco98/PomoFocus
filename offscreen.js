chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.command === 'play_sound') {
        playSound();
        sendResponse({ success: true });
    }
    return true;
});

function playSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const t = ctx.currentTime;

        // Frequencies for a pleasant zen chime (C major: C5, E5, G5)
        const freqs = [523.25, 659.25, 783.99];

        freqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            // Soft sine wave base
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);

            // Envelope: sharp attack, long decay
            gain.gain.setValueAtTime(0, t);

            // Stagger attacks slightly for a gentle strum effect
            const start = t + (i * 0.08);

            // Gentle attack and long fade out
            gain.gain.linearRampToValueAtTime(0.2, start + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 2.0);

            osc.start(start);
            osc.stop(start + 2.1);
        });

    } catch (e) {
        console.error("Audio playback failed", e);
    }
}
