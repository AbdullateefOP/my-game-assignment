/* Procedurally generated game audio — no sound files.
 * Exposes window.GameAudio. All sound is built with the Web Audio API so the
 * game stays fully self-contained and works offline.
 *
 *   - move(player)        a short blip on each placement (pitch differs X vs O)
 *   - updateTension(info) starts/scales the tense background music, or stops it
 *   - win() / draw()      short end-of-game stingers
 *   - setMuted(bool)      master mute (persisted by the caller)
 *
 * The AudioContext is only created after a user gesture (the Start button),
 * which is what browsers require before any sound can play.
 */
window.GameAudio = (function () {
    let ctx = null;
    let master = null;
    let muted = false;

    // --- Background-music scheduler state ---
    let playing = false;        // is tense music currently running?
    let schedulerId = null;
    let nextNoteTime = 0;
    let step = 0;
    let currentBPM = 90;
    const LOOKAHEAD = 0.1;       // schedule notes this far ahead (s)
    const TICK = 25;             // scheduler wake-up interval (ms)

    // A minor pentatonic pattern — tense but not harsh. Semitones from the root.
    const PATTERN = [0, 3, 7, 10, 12, 10, 7, 3];
    const ROOT = 220; // A3

    function freqFor(semitones) {
        return ROOT * Math.pow(2, semitones / 12);
    }

    function ensureContext() {
        if (ctx) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return; // audio unsupported — every method becomes a no-op
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : 0.5;
        master.connect(ctx.destination);
    }

    // Called on the Start-button gesture: create + unlock the context.
    function init() {
        ensureContext();
        if (ctx && ctx.state === 'suspended') ctx.resume();
    }

    function setMuted(value) {
        muted = !!value;
        if (master) master.gain.setTargetAtTime(muted ? 0 : 0.5, ctx.currentTime, 0.02);
    }

    // A single enveloped tone.
    function tone(freq, start, duration, type, peak) {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type || 'triangle';
        osc.frequency.value = freq;
        const p = peak == null ? 0.3 : peak;
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(p, start + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(g);
        g.connect(master);
        osc.start(start);
        osc.stop(start + duration + 0.02);
    }

    function move(player) {
        if (muted) return;
        ensureContext();
        if (!ctx) return;
        // X slightly higher/brighter, O slightly lower/warmer.
        const base = player === 'X' ? 440 : 330;
        tone(base, ctx.currentTime, 0.12, 'triangle', 0.25);
    }

    // --- Tense background music ---
    function scheduleNote(time) {
        const semitone = PATTERN[step % PATTERN.length];
        // Lift the whole phrase an octave on faster (more urgent) passages.
        const octaveLift = currentBPM > 140 ? 12 : 0;
        tone(freqFor(semitone + octaveLift), time, 0.18, 'sawtooth', 0.14);
        // A soft bass pulse on the downbeat grounds the tension.
        if (step % 4 === 0) tone(ROOT / 2, time, 0.22, 'sine', 0.22);
    }

    function scheduler() {
        if (!ctx) return;
        while (nextNoteTime < ctx.currentTime + LOOKAHEAD) {
            scheduleNote(nextNoteTime);
            nextNoteTime += (60.0 / currentBPM) * 0.5; // eighth notes
            step++;
        }
    }

    function startMusic() {
        if (playing || !ctx) return;
        playing = true;
        step = 0;
        nextNoteTime = ctx.currentTime + 0.05;
        schedulerId = setInterval(scheduler, TICK);
    }

    function stopMusic() {
        playing = false;
        if (schedulerId) { clearInterval(schedulerId); schedulerId = null; }
    }

    /* info = { threatCount, fillRatio, active }
     * - threatCount: how many immediate winning threats are on the board
     * - fillRatio:   0..1 how full the board is (closer to the end = tenser)
     * - active:      is the game still in progress
     * No threats (or game over) => music stops and the mood relaxes to silence.
     * More threats / a fuller board => faster tempo. Fewer threats (a block)
     * => the recomputed tempo drops, easing the mood back down.
     */
    function updateTension(info) {
        ensureContext();
        if (!ctx) return;
        const { threatCount = 0, fillRatio = 0, active = true } = info || {};
        if (!active || threatCount <= 0) {
            stopMusic();
            return;
        }
        // Base tempo when danger first appears, scaling with threats and fill.
        currentBPM = Math.min(184, 92 + (threatCount - 1) * 16 + fillRatio * 44);
        startMusic();
    }

    function win() {
        stopMusic();
        ensureContext();
        if (!ctx || muted) return;
        const t = ctx.currentTime;
        [0, 4, 7, 12].forEach((s, i) => tone(freqFor(s + 12), t + i * 0.09, 0.22, 'triangle', 0.26));
    }

    function draw() {
        stopMusic();
        ensureContext();
        if (!ctx || muted) return;
        const t = ctx.currentTime;
        tone(freqFor(0), t, 0.3, 'sine', 0.2);
        tone(freqFor(-5), t + 0.18, 0.34, 'sine', 0.2);
    }

    return { init, setMuted, move, updateTension, win, draw, stopMusic };
})();
