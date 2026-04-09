window.Game = window.Game || {};

Game.Music = (function () {
    var audioCtx = null;
    var masterGain = null;
    var currentPattern = null;
    var intervalId = null;
    var step = 0;
    var BPM = 170;
    var stepTime;

    function init() {
        if (audioCtx) return;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.4;
        masterGain.connect(audioCtx.destination);
        stepTime = 60 / BPM / 4;
    }

    function ensureContext() {
        if (!audioCtx) init();
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }

    function kick(time) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(30, time + 0.12);
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(time);
        osc.stop(time + 0.2);
    }

    function snare(time) {
        var bufferSize = audioCtx.sampleRate * 0.1;
        var buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        var noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        var noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.5, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        var filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(masterGain);
        noise.start(time);
        noise.stop(time + 0.1);

        var osc = audioCtx.createOscillator();
        var oscGain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, time);
        osc.frequency.exponentialRampToValueAtTime(100, time + 0.05);
        oscGain.gain.setValueAtTime(0.4, time);
        oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start(time);
        osc.stop(time + 0.08);
    }

    function hihat(time, open) {
        var duration = open ? 0.12 : 0.04;
        var bufferSize = audioCtx.sampleRate * duration;
        var buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        var noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        var gain = audioCtx.createGain();
        gain.gain.setValueAtTime(open ? 0.2 : 0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        var filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 6000;
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        noise.start(time);
        noise.stop(time + duration);
    }

    function bass(time, freq, duration) {
        var osc1 = audioCtx.createOscillator();
        var osc2 = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        var filter = audioCtx.createBiquadFilter();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, time);
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(freq * 1.005, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, time);
        filter.frequency.exponentialRampToValueAtTime(150, time + duration);

        gain.gain.setValueAtTime(0.25, time);
        gain.gain.setValueAtTime(0.25, time + duration - 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        osc1.start(time);
        osc1.stop(time + duration);
        osc2.start(time);
        osc2.stop(time + duration);
    }

    function pad(time, freq, duration) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        var filter = audioCtx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.08, time + 0.3);
        gain.gain.setValueAtTime(0.08, time + duration - 0.5);
        gain.gain.linearRampToValueAtTime(0, time + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        osc.start(time);
        osc.stop(time + duration);
    }

    var bassNotes = [55, 55, 65.4, 65.4, 49, 49, 55, 55];

    var patterns = {
        gameplay: function (s, time) {
            if (s === 0 || s === 6 || s === 9) kick(time);
            if (s === 4 || s === 12) snare(time);
            if (s % 2 === 0) hihat(time, s === 8);
            if (s % 2 === 0) {
                var noteIdx = Math.floor(s / 2) % bassNotes.length;
                bass(time, bassNotes[noteIdx], stepTime * 2 * 0.9);
            }
        },
        title: function (s, time) {
            if (s === 0) kick(time);
            if (s === 8) snare(time);
            if (s % 4 === 0) hihat(time, false);
            if (s === 0 || s === 8) {
                bass(time, 55, stepTime * 8 * 0.9);
            }
            if (s === 0) {
                var barDuration = stepTime * 16;
                pad(time, 220, barDuration);
                pad(time, 277.2, barDuration);
                pad(time, 330, barDuration);
            }
        },
        ending: function (s, time) {
            if (s === 0) kick(time);
            if (s === 12) {
                hihat(time, true);
            }
            if (s === 0) {
                bass(time, 44, stepTime * 16 * 0.9);
            }
            if (s === 0) {
                var barDuration = stepTime * 16;
                pad(time, 165, barDuration * 1.2);
                pad(time, 220, barDuration * 1.2);
                pad(time, 262, barDuration * 1.2);
            }
        }
    };

    function play(patternName) {
        ensureContext();
        if (currentPattern === patternName) return;
        stop();
        currentPattern = patternName;
        step = 0;

        var pattern = patterns[patternName];
        if (!pattern) return;

        var nextStepTime = audioCtx.currentTime + 0.05;

        intervalId = setInterval(function () {
            var now = audioCtx.currentTime;
            while (nextStepTime < now + 0.1) {
                pattern(step % 16, nextStepTime);
                step++;
                nextStepTime += stepTime;
            }
        }, 25);
    }

    function stop() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        currentPattern = null;
        step = 0;
    }

    function setVolume(v) {
        if (masterGain) masterGain.gain.value = v;
    }

    // --- Sound Effects ---

    function sfx(name) {
        ensureContext();
        var t = audioCtx.currentTime;
        switch (name) {
            case 'jump':
                // Bouncy upward boing
                (function () {
                    var osc = audioCtx.createOscillator();
                    var g = audioCtx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(250, t);
                    osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);
                    osc.frequency.exponentialRampToValueAtTime(400, t + 0.15);
                    g.gain.setValueAtTime(0.3, t);
                    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
                    osc.connect(g); g.connect(masterGain);
                    osc.start(t); osc.stop(t + 0.18);
                })();
                break;

            case 'collect':
                // Sparkly ascending pickup
                (function () {
                    var notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
                    for (var i = 0; i < notes.length; i++) {
                        var osc = audioCtx.createOscillator();
                        var g = audioCtx.createGain();
                        osc.type = 'square';
                        osc.frequency.value = notes[i];
                        var offset = i * 0.05;
                        g.gain.setValueAtTime(0, t + offset);
                        g.gain.linearRampToValueAtTime(0.15, t + offset + 0.02);
                        g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.12);
                        osc.connect(g); g.connect(masterGain);
                        osc.start(t + offset); osc.stop(t + offset + 0.12);
                    }
                })();
                break;

            case 'shoot':
                // Punchy whoosh
                (function () {
                    var osc = audioCtx.createOscillator();
                    var g = audioCtx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(800, t);
                    osc.frequency.exponentialRampToValueAtTime(200, t + 0.08);
                    g.gain.setValueAtTime(0.2, t);
                    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
                    var filt = audioCtx.createBiquadFilter();
                    filt.type = 'lowpass'; filt.frequency.value = 2000;
                    osc.connect(filt); filt.connect(g); g.connect(masterGain);
                    osc.start(t); osc.stop(t + 0.1);
                    // Noise burst
                    var buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.06, audioCtx.sampleRate);
                    var d = buf.getChannelData(0);
                    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
                    var n = audioCtx.createBufferSource(); n.buffer = buf;
                    var ng = audioCtx.createGain();
                    ng.gain.setValueAtTime(0.1, t);
                    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
                    var hpf = audioCtx.createBiquadFilter();
                    hpf.type = 'highpass'; hpf.frequency.value = 3000;
                    n.connect(hpf); hpf.connect(ng); ng.connect(masterGain);
                    n.start(t); n.stop(t + 0.06);
                })();
                break;

            case 'kill':
                // Satisfying pop + crunch
                (function () {
                    var osc = audioCtx.createOscillator();
                    var g = audioCtx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(400, t);
                    osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);
                    g.gain.setValueAtTime(0.4, t);
                    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
                    osc.connect(g); g.connect(masterGain);
                    osc.start(t); osc.stop(t + 0.2);
                    // Crunch noise
                    var buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.08, audioCtx.sampleRate);
                    var d = buf.getChannelData(0);
                    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
                    var n = audioCtx.createBufferSource(); n.buffer = buf;
                    var ng = audioCtx.createGain();
                    ng.gain.setValueAtTime(0.25, t);
                    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
                    var bp = audioCtx.createBiquadFilter();
                    bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 2;
                    n.connect(bp); bp.connect(ng); ng.connect(masterGain);
                    n.start(t); n.stop(t + 0.08);
                })();
                break;

            case 'death':
                // Sad descending wobble
                (function () {
                    var osc = audioCtx.createOscillator();
                    var g = audioCtx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(500, t);
                    osc.frequency.exponentialRampToValueAtTime(100, t + 0.4);
                    osc.frequency.setValueAtTime(80, t + 0.45);
                    osc.frequency.exponentialRampToValueAtTime(40, t + 0.6);
                    g.gain.setValueAtTime(0.3, t);
                    g.gain.setValueAtTime(0.3, t + 0.35);
                    g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
                    osc.connect(g); g.connect(masterGain);
                    osc.start(t); osc.stop(t + 0.6);
                })();
                break;

            case 'flag':
                // Victory fanfare — ascending arpeggio
                (function () {
                    var notes = [262, 330, 392, 523, 659, 784, 1047];
                    for (var i = 0; i < notes.length; i++) {
                        var osc = audioCtx.createOscillator();
                        var g = audioCtx.createGain();
                        osc.type = 'square';
                        osc.frequency.value = notes[i];
                        var offset = i * 0.08;
                        g.gain.setValueAtTime(0, t + offset);
                        g.gain.linearRampToValueAtTime(0.18, t + offset + 0.02);
                        g.gain.setValueAtTime(0.18, t + offset + 0.15);
                        g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.35);
                        osc.connect(g); g.connect(masterGain);
                        osc.start(t + offset); osc.stop(t + offset + 0.35);
                    }
                    // Final chord
                    var chord = [523, 659, 784];
                    for (var j = 0; j < chord.length; j++) {
                        var o2 = audioCtx.createOscillator();
                        var g2 = audioCtx.createGain();
                        o2.type = 'triangle';
                        o2.frequency.value = chord[j];
                        g2.gain.setValueAtTime(0, t + 0.6);
                        g2.gain.linearRampToValueAtTime(0.12, t + 0.7);
                        g2.gain.setValueAtTime(0.12, t + 1.2);
                        g2.gain.linearRampToValueAtTime(0, t + 1.8);
                        o2.connect(g2); g2.connect(masterGain);
                        o2.start(t + 0.6); o2.stop(t + 1.8);
                    }
                })();
                break;
        }
    }

    return { init: init, play: play, stop: stop, setVolume: setVolume, sfx: sfx };
})();
