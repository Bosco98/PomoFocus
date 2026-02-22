# PomoFocus Extension

PomoFocus is an ultra-minimalist, aesthetically pleasing Chrome extension designed to help you stay focused using the Pomodoro technique. It features an incredibly clean, glowy UI without distracting borders or cluttered settings.

![PomoFocus UI](icons/icon128.png)

## Features

- **Ultra-Minimalist UI**: Absolutely no borders or visual clutter. Smooth, diffused pink glows provide visual structure and a calm, zen-like aesthetic.
- **Custom Fonts & Icons**: Utilizes the thin and elegant `Inter` font family and scalable SVG play/pause/reset controls.
- **5 Built-in Modes**:
  - **Focus**: Standard 25-minute focus block.
  - **Short Break**: 5-minute break.
  - **Long Break**: 15-minute break.
  - **Tabata**: Dedicated workout/intensity interval timer with customizable Work, Rest, and Round counts. By default tracks 8 rounds of 20 seconds work, 10 seconds rest.
  - **Custom**: Quickly spin up a timer for an exact number of minutes and seconds on the fly.
- **Inline Editing**: In Tabata and Custom modes, settings can edit directly on the screen without needing annoying popups or secondary pages.
- **Bulletproof Timing**: Uses native Chrome `alarms` rather than standard JavaScript intervals, ensuring your timer survives Chrome memory throttling and never pauses if the browser goes to sleep.
- **Zen Audio Notifications**: Plays a synthesized, pleasant C-Major (C5, E5, G5) bell chime via the Web Audio API when time is up.

## Installation

As this is a custom-built extension, you can install it directly from this source folder:

1. Open Google Chrome.
2. Navigate to `chrome://extensions/` in your address bar.
3. Toggle the **Developer mode** switch in the top-right corner to **On**.
4. Click the **Load unpacked** button in the top-left menu.
5. Select the `PomodoroExt` directory containing this README.
6. The extension will install. Pin it to your Chrome toolbar for easy access!

## File Structure

- `manifest.json`: Configuration mapping for Chrome (V3 manifest).
- `popup.html`, `popup.css`, `popup.js`: The visual interface and frontend render loop.
- `background.js`: The resilient background service worker that utilizes `chrome.alarms` to keep precise time.
- `offscreen.html`, `offscreen.js`: Chrome APIs strictly limit audio playback in background workers; this offscreen document is spun up temporarily just to play the synthesized chime when a timer ends.
- `icons/`: Contains the seamlessly rounded, perfectly scaled modern app icons.

## Modifying Aesthetics

If you want to swap the color scheme from "Light Pink Glow" to something else, simply open `popup.css` and modify the `:root` variables:

```css
:root {
    --accent-color: #ffb1c8;
    --accent-glow: rgba(255, 177, 200, 0.6);
    --ring-fg: #ff85a9;
    --ring-glow: drop-shadow(0 0 8px rgba(255, 133, 169, 0.5));
}
```

Enjoy your focus sessions!
