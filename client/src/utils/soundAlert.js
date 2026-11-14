// Advanced Audio Alert Engine with Web Audio API chime fallback and auto-unlock
let audioContext = null;
let currentAudioElement = null;
let soundTimeoutId = null;
let isPlaying = false;
let isUnlocked = false;

// Initialize or get Web Audio Context
const getAudioContext = () => {
    if (!audioContext && typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            audioContext = new AudioCtx();
        }
    }
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
    }
    return audioContext;
};

// Auto-unlock audio on first user gesture
export const unlockAudio = () => {
    if (isUnlocked) return;
    try {
        const ctx = getAudioContext();
        if (ctx) {
            if (ctx.state === 'suspended') {
                ctx.resume();
            }
            // Play a silent 1ms buffer to satisfy autoplay policy
            const buffer = ctx.createBuffer(1, 1, 22050);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);
            isUnlocked = true;
        }
    } catch (e) {
        // Ignore silent failure
    }
};

if (typeof window !== 'undefined') {
    const handleGesture = () => {
        unlockAudio();
        window.removeEventListener('click', handleGesture);
        window.removeEventListener('touchstart', handleGesture);
        window.removeEventListener('keydown', handleGesture);
    };
    window.addEventListener('click', handleGesture, { once: true, passive: true });
    window.addEventListener('touchstart', handleGesture, { once: true, passive: true });
    window.addEventListener('keydown', handleGesture, { once: true, passive: true });
}

// Synthesize a pleasant high-clarity notification chime via Web Audio API
export const playSyntheticChime = (toneType = 'chime') => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return false;

        const now = ctx.currentTime;
        const gainNode = ctx.createGain();
        gainNode.connect(ctx.destination);

        if (toneType === 'urgent' || toneType === 'alert') {
            // Dual high-low alert beep
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();

            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(880, now); // A5
            osc1.frequency.setValueAtTime(1174.66, now + 0.15); // D6

            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(440, now);
            osc2.frequency.setValueAtTime(587.33, now + 0.15);

            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.3, now + 0.02);
            gainNode.gain.linearRampToValueAtTime(0.2, now + 0.25);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

            osc1.connect(gainNode);
            osc2.connect(gainNode);

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.5);
            osc2.stop(now + 0.5);
        } else {
            // Smooth melodious chime (E5 -> G#5 -> B5)
            const freqs = [659.25, 830.61, 987.77];
            freqs.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const noteGain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.08);

                noteGain.gain.setValueAtTime(0, now + idx * 0.08);
                noteGain.gain.linearRampToValueAtTime(0.25, now + idx * 0.08 + 0.02);
                noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);

                osc.connect(noteGain);
                noteGain.connect(gainNode);

                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + 0.45);
            });
        }
        return true;
    } catch (err) {
        console.warn('Web Audio synthetic chime fallback error:', err);
        return false;
    }
};

/**
 * Play sound alert with automatic fallback and auto-stop
 * @param {Object} options
 * @param {boolean} options.loop - Whether the sound should loop
 * @param {number} options.maxDurationMs - Max duration in ms before auto-silence (default 30000ms)
 * @param {string} options.soundUrl - Sound file URL
 * @param {Function} options.onAutoStop - Callback when sound auto-stops
 */
export const playSoundAlert = ({
    loop = false,
    maxDurationMs = 30000,
    soundUrl = '/sounds/booking.mp3',
    onAutoStop = null
} = {}) => {
    if (typeof window === 'undefined') return;

    // Check if user disabled sounds in storage
    const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
    if (!soundEnabled) return;

    // Stop any existing sound first
    stopSoundAlert();

    isPlaying = true;

    try {
        currentAudioElement = new Audio(soundUrl);
        currentAudioElement.loop = loop;
        currentAudioElement.volume = 0.9;

        const playPromise = currentAudioElement.play();
        if (playPromise !== undefined) {
            playPromise.catch((err) => {
                console.warn('HTML Audio playback prevented by browser, falling back to Web Audio:', err);
                playSyntheticChime(loop ? 'urgent' : 'chime');
            });
        }
    } catch (e) {
        console.warn('Audio tag creation failed, falling back to synthetic chime:', e);
        playSyntheticChime(loop ? 'urgent' : 'chime');
    }

    // Set auto-stop timer
    if (maxDurationMs > 0) {
        soundTimeoutId = setTimeout(() => {
            stopSoundAlert();
            if (typeof onAutoStop === 'function') {
                onAutoStop();
            }
        }, maxDurationMs);
    }
};

export const stopSoundAlert = () => {
    if (soundTimeoutId) {
        clearTimeout(soundTimeoutId);
        soundTimeoutId = null;
    }

    if (currentAudioElement) {
        try {
            currentAudioElement.pause();
            currentAudioElement.currentTime = 0;
        } catch (e) {
            // Ignore error
        }
        currentAudioElement = null;
    }

    isPlaying = false;
};

export const isSoundAlertPlaying = () => isPlaying;
