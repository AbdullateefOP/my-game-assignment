/* Procedurally generated game audio — no sound files (Web Audio API).
 * Exposes window.GameAudio.
 *   - move(player)        short blip on each placement (pitch differs X vs O)
 *   - updateTension(info) starts/scales tense music, or stops it
 *   - win() / draw()      end-of-game stingers
 *   - setMuted(bool)      master mute
 * The AudioContext is created lazily on the first user gesture (a move or a
 * control click), which is what browsers require before sound can play.
 */
window.GameAudio = (function () {
    let ctx = null;
    let master = null;
    let muted = false;

    let playing = false;
    let schedulerId = null;
    let nextNoteTime = 0;
    let step = 0;
    let currentBPM = 92;
    const LOOKAHEAD = 0.1;
    const TICK = 25;

    const PATTERN = [0, 3, 7, 10, 12, 10, 7, 3]; // minor pentatonic
    const ROOT = 220;

    const freqFor = s => ROOT * Math.pow(2, s / 12);

    function ensureContext() {
        if (ctx) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : 0.5;
        master.connect(ctx.destination);
    }

    function init() {
        ensureContext();
        if (ctx && ctx.state === 'suspended') ctx.resume();
    }

    function setMuted(value) {
        muted = !!value;
        if (master) master.gain.setTargetAtTime(muted ? 0 : 0.5, ctx.currentTime, 0.02);
        if (muted) stopMusic();
    }

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
        tone(player === 'X' ? 440 : 330, ctx.currentTime, 0.12, 'triangle', 0.25);
    }

    function scheduleNote(time) {
        const semitone = PATTERN[step % PATTERN.length];
        const octaveLift = currentBPM > 140 ? 12 : 0;
        tone(freqFor(semitone + octaveLift), time, 0.18, 'sawtooth', 0.14);
        if (step % 4 === 0) tone(ROOT / 2, time, 0.22, 'sine', 0.22);
    }

    function scheduler() {
        if (!ctx) return;
        while (nextNoteTime < ctx.currentTime + LOOKAHEAD) {
            scheduleNote(nextNoteTime);
            nextNoteTime += (60.0 / currentBPM) * 0.5;
            step++;
        }
    }

    function startMusic() {
        if (playing || !ctx || muted) return;
        playing = true;
        step = 0;
        nextNoteTime = ctx.currentTime + 0.05;
        schedulerId = setInterval(scheduler, TICK);
    }

    function stopMusic() {
        playing = false;
        if (schedulerId) { clearInterval(schedulerId); schedulerId = null; }
    }

    // info = { threatCount, fillRatio, active }
    function updateTension(info) {
        ensureContext();
        if (!ctx) return;
        const { threatCount = 0, fillRatio = 0, active = true } = info || {};
        if (!active || threatCount <= 0 || muted) {
            stopMusic();
            return;
        }
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
