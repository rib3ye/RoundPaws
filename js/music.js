/**
 * Music & Sound Effects
 *
 * NES-style synthesized audio using the Web Audio API. No audio files needed —
 * all sounds are generated in real-time with oscillators and noise buffers.
 *
 * Music voices:
 *   - pulse()      : Square wave lead melody (loud)
 *   - pulseQuiet() : Square wave arpeggio accompaniment (soft)
 *   - tri()        : Triangle wave bass line
 *   - bass()       : Detuned sawtooth sub-bass
 *   - pad()        : Triangle wave sustained chords
 *   - kick()       : Sine wave with pitch sweep (drum)
 *   - snare()      : Noise burst + sine body (drum)
 *   - hihat()      : High-passed noise burst (drum)
 *
 * Music patterns:
 *   - gameplay : 512 steps (32 bars), key of E minor, 4 sections (A/B/C/D)
 *   - title    : 64 steps (4 bars), atmospheric E minor
 *   - ending   : 64 steps (4 bars), triumphant C major
 *
 * Sound effects: jump, collect, shoot, kill, death, flag
 */
window.Game = window.Game || {};

Game.Music = (function () {
    var audioCtx = null;
    var masterGain = null;
    var currentPattern = null;
    var intervalId = null;
    var step = 0;

    var BPM = 150;
    var stepTime;         // seconds per step (calculated from BPM)
    var muted = false;
    var volume = 0.3;

    // ---------------------------------------------------------------
    // Audio context setup
    // ---------------------------------------------------------------

    function init() {
        if (audioCtx) return;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = volume;
        masterGain.connect(audioCtx.destination);
        stepTime = 60 / BPM / 4; // 16th note duration
    }

    /** Ensure the audio context is running (needed after browser autoplay policy). */
    function ensureContext() {
        if (!audioCtx) init();
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }

    // ---------------------------------------------------------------
    // Drum voices
    // ---------------------------------------------------------------

    /** Kick drum — sine wave with rapid pitch drop from 150Hz to 30Hz. */
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

    /** Snare drum — white noise burst (high-passed) layered with a short sine body. */
    function snare(time) {
        // Noise component (crackle)
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

        // Body component (short sine thump)
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

    /** Hi-hat — high-passed noise burst. Open hat is longer and louder. */
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

    // ---------------------------------------------------------------
    // Melodic voices
    // ---------------------------------------------------------------

    /** Detuned sawtooth bass — two slightly detuned sawtooths through a lowpass filter. */
    function bass(time, freq, duration) {
        var osc1 = audioCtx.createOscillator();
        var osc2 = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        var filter = audioCtx.createBiquadFilter();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, time);
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(freq * 1.005, time); // slight detune for thickness

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

    /** Pad — sustained triangle wave with slow attack/release for chords. */
    function pad(time, freq, duration) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        var filter = audioCtx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        filter.type = 'lowpass';
        filter.frequency.value = 800;

        // Slow fade in, sustain, slow fade out
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

    /** Pulse lead — square wave melody voice (louder, with decay envelope). */
    function pulse(time, freq, dur) {
        var osc = audioCtx.createOscillator();
        var g = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, time);
        g.gain.setValueAtTime(0.13, time);
        g.gain.setValueAtTime(0.10, time + dur * 0.7);
        g.gain.linearRampToValueAtTime(0, time + dur);
        osc.connect(g);
        g.connect(masterGain);
        osc.start(time);
        osc.stop(time + dur + 0.01);
    }

    /** Pulse quiet — softer square wave for arpeggio accompaniment. */
    function pulseQuiet(time, freq, dur) {
        var osc = audioCtx.createOscillator();
        var g = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, time);
        g.gain.setValueAtTime(0.07, time);
        g.gain.setValueAtTime(0.05, time + dur * 0.7);
        g.gain.linearRampToValueAtTime(0, time + dur);
        osc.connect(g);
        g.connect(masterGain);
        osc.start(time);
        osc.stop(time + dur + 0.01);
    }

    /** Triangle bass — clean triangle wave for bass lines. */
    function tri(time, freq, dur) {
        var osc = audioCtx.createOscillator();
        var g = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        g.gain.setValueAtTime(0.2, time);
        g.gain.setValueAtTime(0.2, time + dur - 0.005);
        g.gain.linearRampToValueAtTime(0, time + dur);
        osc.connect(g);
        g.connect(masterGain);
        osc.start(time);
        osc.stop(time + dur + 0.01);
    }

    // ---------------------------------------------------------------
    // Note frequency table
    // ---------------------------------------------------------------

    var _n = {
        E2:82.4,  Fs2:92.5,  G2:98,    A2:110,   B2:123.5,
        C3:130.8, D3:146.8,  E3:164.8, Fs3:185,  G3:196,   A3:220,   B3:246.9,
        C4:261.6, D4:293.7,  Ds4:311.1,E4:329.6, Fs4:370,  G4:392,   A4:440,   B4:493.9,
        C5:523.3, D5:587.3,  E5:659.3, Fs5:740,  G5:784
    };

    /**
     * Convert an array of [step, frequency, duration] triples into a
     * step-indexed lookup object: { step: [freq, dur] }.
     */
    function buildMap(arr) {
        var m = {};
        for (var i = 0; i < arr.length; i++) {
            m[arr[i][0]] = [arr[i][1], arr[i][2]];
        }
        return m;
    }

    // ---------------------------------------------------------------
    // Gameplay music data — 512 steps (32 bars), key of E minor
    //
    // Structure:
    //   Section A (bars 1-8):   Main theme — driving beat, 8th-note arps
    //   Section B (bars 9-16):  Counterpoint — syncopated drums
    //   Section C (bars 17-24): Bridge — half-time, spacious, quarter-note arps
    //   Section D (bars 25-32): Climax — full energy, 16th-note arps
    // ---------------------------------------------------------------

    var gpMelody = buildMap([
        // === Section A (0-127): Main theme ===
        // Bar 1 (Em)
        [0,_n.B4,2],[2,_n.B4,1],[3,_n.E5,1],[4,_n.D5,2],[6,_n.B4,2],
        [8,_n.C5,2],[10,_n.B4,1],[11,_n.A4,1],[12,_n.G4,2],[14,_n.A4,2],
        // Bar 2 (Am)
        [16,_n.B4,2],[18,_n.C5,2],[20,_n.A4,4],
        [24,_n.G4,2],[26,_n.A4,2],[28,_n.E4,4],
        // Bar 3 (C)
        [32,_n.G4,2],[34,_n.A4,1],[35,_n.B4,1],[36,_n.C5,2],[38,_n.E5,2],
        [40,_n.D5,2],[42,_n.C5,2],[44,_n.B4,2],[46,_n.A4,2],
        // Bar 4 (D)
        [48,_n.A4,2],[50,_n.B4,1],[51,_n.C5,1],[52,_n.D5,4],
        [56,_n.C5,2],[58,_n.B4,2],[60,_n.A4,4],
        // Bar 5 (Em)
        [64,_n.E5,2],[66,_n.E5,1],[67,_n.D5,1],[68,_n.E5,2],[70,_n.B4,2],
        [72,_n.G4,2],[74,_n.A4,1],[75,_n.B4,1],[76,_n.A4,2],[78,_n.G4,2],
        // Bar 6 (C)
        [80,_n.E4,2],[82,_n.G4,2],[84,_n.C5,4],
        [88,_n.B4,2],[90,_n.A4,2],[92,_n.G4,4],
        // Bar 7 (Am)
        [96,_n.A4,2],[98,_n.C5,2],[100,_n.E5,2],[102,_n.C5,2],
        [104,_n.B4,2],[106,_n.A4,2],[108,_n.G4,2],[110,_n.E4,2],
        // Bar 8 (B)
        [112,_n.B4,1],[113,_n.B4,1],[114,_n.Fs4,2],[116,_n.A4,2],[118,_n.B4,2],
        [120,_n.E4,4],

        // === Section B (128-255): Counterpoint ===
        // Bar 9 (Am)
        [128,_n.A4,1],[129,_n.A4,1],[130,_n.C5,2],[132,_n.E5,2],[134,_n.D5,1],[135,_n.C5,1],
        [136,_n.A4,2],[138,_n.G4,2],[140,_n.A4,2],[142,_n.E4,2],
        // Bar 10 (G)
        [144,_n.G4,2],[146,_n.B4,2],[148,_n.D5,2],[150,_n.B4,2],
        [152,_n.G4,2],[154,_n.A4,1],[155,_n.B4,1],[156,_n.G4,4],
        // Bar 11 (C)
        [160,_n.C5,2],[162,_n.E5,2],[164,_n.G5,2],[166,_n.E5,2],
        [168,_n.D5,2],[170,_n.C5,1],[171,_n.D5,1],[172,_n.E5,4],
        // Bar 12 (D)
        [176,_n.D5,2],[178,_n.Fs4,2],[180,_n.A4,2],[182,_n.D5,2],
        [184,_n.C5,2],[186,_n.B4,2],[188,_n.A4,4],
        // Bar 13 (Am)
        [192,_n.A4,1],[193,_n.C5,1],[194,_n.E5,2],[196,_n.D5,2],[198,_n.C5,2],
        [200,_n.B4,2],[202,_n.A4,2],[204,_n.G4,2],[206,_n.A4,2],
        // Bar 14 (G)
        [208,_n.B4,2],[210,_n.D5,2],[212,_n.G4,2],[214,_n.B4,2],
        [216,_n.A4,2],[218,_n.G4,1],[219,_n.A4,1],[220,_n.B4,4],
        // Bar 15 (Em)
        [224,_n.E4,2],[226,_n.G4,2],[228,_n.B4,2],[230,_n.E5,2],
        [232,_n.D5,2],[234,_n.B4,2],[236,_n.G4,4],
        // Bar 16 (D)
        [240,_n.D5,2],[242,_n.C5,1],[243,_n.D5,1],[244,_n.E5,2],[246,_n.D5,2],
        [248,_n.C5,2],[250,_n.B4,2],[252,_n.A4,4],

        // === Section C (256-383): Bridge — building tension ===
        // Bar 17 (C) — long notes, spacious
        [256,_n.C5,4],[260,_n.E5,4],[264,_n.G5,4],[268,_n.E5,4],
        // Bar 18 (D)
        [272,_n.D5,4],[276,_n.Fs5,4],[280,_n.A4,4],[284,_n.D5,4],
        // Bar 19 (Em) — picks up rhythmically
        [288,_n.E5,2],[290,_n.D5,2],[292,_n.E5,2],[294,_n.G5,2],
        [296,_n.B4,2],[298,_n.E5,2],[300,_n.D5,2],[302,_n.B4,2],
        // Bar 20 (D)
        [304,_n.D5,1],[305,_n.D5,1],[306,_n.E5,2],[308,_n.Fs5,2],[310,_n.E5,2],
        [312,_n.D5,2],[314,_n.C5,2],[316,_n.B4,4],
        // Bar 21 (C)
        [320,_n.C5,2],[322,_n.D5,2],[324,_n.E5,2],[326,_n.G5,2],
        [328,_n.E5,4],[332,_n.D5,4],
        // Bar 22 (G)
        [336,_n.G4,2],[338,_n.B4,2],[340,_n.D5,2],[342,_n.G5,2],
        [344,_n.Fs5,2],[346,_n.E5,2],[348,_n.D5,2],[350,_n.B4,2],
        // Bar 23 (Am)
        [352,_n.A4,2],[354,_n.C5,2],[356,_n.E5,2],[358,_n.A4,2],
        [360,_n.C5,2],[362,_n.E5,2],[364,_n.G5,4],
        // Bar 24 (B) — tension peak
        [368,_n.Fs5,2],[370,_n.E5,2],[372,_n.D5,2],[374,_n.B4,2],
        [376,_n.Ds4,2],[378,_n.Fs4,2],[380,_n.B4,4],

        // === Section D (384-511): Climax — full energy ===
        // Bar 25 (Em)
        [384,_n.E5,1],[385,_n.E5,1],[386,_n.G5,2],[388,_n.Fs5,2],[390,_n.E5,2],
        [392,_n.D5,2],[394,_n.E5,1],[395,_n.Fs5,1],[396,_n.G5,4],
        // Bar 26 (D)
        [400,_n.Fs5,2],[402,_n.E5,2],[404,_n.D5,2],[406,_n.A4,2],
        [408,_n.D5,1],[409,_n.D5,1],[410,_n.E5,2],[412,_n.Fs5,4],
        // Bar 27 (C)
        [416,_n.E5,2],[418,_n.C5,2],[420,_n.E5,2],[422,_n.G5,2],
        [424,_n.G5,1],[425,_n.Fs5,1],[426,_n.E5,2],[428,_n.D5,2],[430,_n.C5,2],
        // Bar 28 (D)
        [432,_n.D5,2],[434,_n.E5,2],[436,_n.Fs5,2],[438,_n.D5,2],
        [440,_n.A4,2],[442,_n.D5,2],[444,_n.Fs5,4],
        // Bar 29 (Em)
        [448,_n.B4,2],[450,_n.E5,2],[452,_n.G5,2],[454,_n.E5,1],[455,_n.D5,1],
        [456,_n.E5,2],[458,_n.B4,2],[460,_n.G5,4],
        // Bar 30 (G)
        [464,_n.G5,1],[465,_n.Fs5,1],[466,_n.E5,2],[468,_n.D5,2],[470,_n.B4,2],
        [472,_n.G4,2],[474,_n.B4,2],[476,_n.D5,4],
        // Bar 31 (Am)
        [480,_n.E5,2],[482,_n.C5,2],[484,_n.A4,2],[486,_n.C5,2],
        [488,_n.E5,2],[490,_n.G5,1],[491,_n.E5,1],[492,_n.C5,4],
        // Bar 32 (B -> resolve)
        [496,_n.B4,2],[498,_n.Ds4,2],[500,_n.Fs4,2],[502,_n.B4,2],
        [504,_n.E5,2],[506,_n.D5,2],[508,_n.B4,4]
    ]);

    // Arpeggio chord progressions — [startStep, endStep, [note1, note2, note3]]
    var gpArpChords = [
        // Section A: Em | Am | C | D | Em | C | Am | B
        [0, 16, [_n.E4, _n.G4, _n.B4]],
        [16, 32, [_n.A3, _n.C4, _n.E4]],
        [32, 48, [_n.C4, _n.E4, _n.G4]],
        [48, 64, [_n.D4, _n.Fs4, _n.A4]],
        [64, 80, [_n.E4, _n.G4, _n.B4]],
        [80, 96, [_n.C4, _n.E4, _n.G4]],
        [96, 112, [_n.A3, _n.C4, _n.E4]],
        [112, 128, [_n.B3, _n.Ds4, _n.Fs4]],
        // Section B: Am | G | C | D | Am | G | Em | D
        [128, 144, [_n.A3, _n.C4, _n.E4]],
        [144, 160, [_n.G3, _n.B3, _n.D4]],
        [160, 176, [_n.C4, _n.E4, _n.G4]],
        [176, 192, [_n.D4, _n.Fs4, _n.A4]],
        [192, 208, [_n.A3, _n.C4, _n.E4]],
        [208, 224, [_n.G3, _n.B3, _n.D4]],
        [224, 240, [_n.E4, _n.G4, _n.B4]],
        [240, 256, [_n.D4, _n.Fs4, _n.A4]],
        // Section C: C | D | Em | D | C | G | Am | B
        [256, 272, [_n.C4, _n.E4, _n.G4]],
        [272, 288, [_n.D4, _n.Fs4, _n.A4]],
        [288, 304, [_n.E4, _n.G4, _n.B4]],
        [304, 320, [_n.D4, _n.Fs4, _n.A4]],
        [320, 336, [_n.C4, _n.E4, _n.G4]],
        [336, 352, [_n.G3, _n.B3, _n.D4]],
        [352, 368, [_n.A3, _n.C4, _n.E4]],
        [368, 384, [_n.B3, _n.Ds4, _n.Fs4]],
        // Section D: Em | D | C | D | Em | G | Am | B
        [384, 400, [_n.E4, _n.G4, _n.B4]],
        [400, 416, [_n.D4, _n.Fs4, _n.A4]],
        [416, 432, [_n.C4, _n.E4, _n.G4]],
        [432, 448, [_n.D4, _n.Fs4, _n.A4]],
        [448, 464, [_n.E4, _n.G4, _n.B4]],
        [464, 480, [_n.G3, _n.B3, _n.D4]],
        [480, 496, [_n.A3, _n.C4, _n.E4]],
        [496, 512, [_n.B3, _n.Ds4, _n.Fs4]]
    ];

    // Bass root notes — [startStep, endStep, rootFreq, alternateFreq]
    var gpBassRoots = [
        // Section A
        [0, 16, _n.E2, _n.E3],
        [16, 32, _n.A2, _n.A3],
        [32, 48, _n.C3, _n.G2],
        [48, 64, _n.D3, _n.A2],
        [64, 80, _n.E2, _n.E3],
        [80, 96, _n.C3, _n.G2],
        [96, 112, _n.A2, _n.E3],
        [112, 128, _n.B2, _n.Fs2],
        // Section B
        [128, 144, _n.A2, _n.E3],
        [144, 160, _n.G2, _n.D3],
        [160, 176, _n.C3, _n.G2],
        [176, 192, _n.D3, _n.A2],
        [192, 208, _n.A2, _n.E3],
        [208, 224, _n.G2, _n.D3],
        [224, 240, _n.E2, _n.B2],
        [240, 256, _n.D3, _n.A2],
        // Section C
        [256, 272, _n.C3, _n.E3],
        [272, 288, _n.D3, _n.Fs3],
        [288, 304, _n.E2, _n.E3],
        [304, 320, _n.D3, _n.A2],
        [320, 336, _n.C3, _n.G2],
        [336, 352, _n.G2, _n.D3],
        [352, 368, _n.A2, _n.E3],
        [368, 384, _n.B2, _n.Fs3],
        // Section D
        [384, 400, _n.E2, _n.E3],
        [400, 416, _n.D3, _n.A2],
        [416, 432, _n.C3, _n.G2],
        [432, 448, _n.D3, _n.A2],
        [448, 464, _n.E2, _n.E3],
        [464, 480, _n.G2, _n.D3],
        [480, 496, _n.A2, _n.E3],
        [496, 512, _n.B2, _n.Fs2]
    ];

    // ---------------------------------------------------------------
    // Title music data — 64 steps (4 bars), atmospheric E minor
    // ---------------------------------------------------------------

    var titleMelody = buildMap([
        [0,_n.E5,6],[8,_n.D5,4],[12,_n.B4,4],
        [16,_n.C5,6],[24,_n.A4,4],[28,_n.G4,4],
        [32,_n.A4,4],[36,_n.B4,4],[40,_n.C5,4],[44,_n.D5,4],
        [48,_n.E5,8],[56,_n.D5,4],[60,_n.B4,4]
    ]);

    // ---------------------------------------------------------------
    // Ending music data — 64 steps (4 bars), triumphant C major
    // ---------------------------------------------------------------

    var endMelody = buildMap([
        [0,_n.C5,2],[2,_n.E5,2],[4,_n.G5,4],
        [8,_n.E5,2],[10,_n.C5,2],[12,_n.D5,4],
        [16,_n.E5,2],[18,_n.D5,2],[20,_n.C5,2],[22,_n.E5,2],
        [24,_n.G5,4],[28,_n.E5,4],
        [32,_n.A4,2],[34,_n.C5,2],[36,_n.E5,2],[38,_n.G5,2],
        [40,_n.Fs5,2],[42,_n.E5,2],[44,_n.D5,4],
        [48,_n.E5,4],[52,_n.G5,4],
        [56,_n.C5,8]
    ]);

    // Steps per pattern (for looping)
    var patternLengths = { gameplay: 512, title: 64, ending: 64 };

    // ---------------------------------------------------------------
    // Pattern playback functions
    // ---------------------------------------------------------------

    var patterns = {
        /**
         * Gameplay pattern — schedules all voices for a single step.
         * Drums, melody, arpeggios, and bass vary by section (A/B/C/D).
         */
        gameplay: function (s, time) {
            var st = stepTime;
            var ds = s % 16;                    // position within a bar
            var section = Math.floor(s / 128);  // which section (0=A, 1=B, 2=C, 3=D)

            // --- Drums (varied per section) ---
            if (section === 0) {
                // Section A: Standard driving beat
                if (ds === 0 || ds === 8) kick(time);
                if (ds === 4 || ds === 12) snare(time);
                if (ds % 2 === 0) hihat(time, ds === 6);
            } else if (section === 1) {
                // Section B: Syncopated kicks
                if (ds === 0 || ds === 6 || ds === 10) kick(time);
                if (ds === 4 || ds === 12) snare(time);
                if (ds % 2 === 0) hihat(time, ds === 14);
            } else if (section === 2) {
                // Section C: Half-time feel (spacious)
                if (ds === 0) kick(time);
                if (ds === 8) snare(time);
                if (ds % 4 === 0) hihat(time, ds === 12);
            } else {
                // Section D: Full energy driving beat
                if (ds === 0 || ds === 6 || ds === 8 || ds === 14) kick(time);
                if (ds === 4 || ds === 12) snare(time);
                if (ds % 2 === 0) hihat(time, ds === 6 || ds === 14);
            }

            // --- Melody (pulse lead) ---
            if (gpMelody[s]) {
                pulse(time, gpMelody[s][0], st * gpMelody[s][1] * 0.9);
            }

            // --- Arpeggio (pulse quiet) — interval varies by section ---
            // A/B: 8th notes, C: quarter notes, D: 16th notes
            var arpInt = (section === 2) ? 4 : (section === 3) ? 1 : 2;
            if (s % arpInt === 0) {
                for (var i = 0; i < gpArpChords.length; i++) {
                    var ch = gpArpChords[i];
                    if (s >= ch[0] && s < ch[1]) {
                        var idx = ((s - ch[0]) / arpInt) % ch[2].length;
                        pulseQuiet(time, ch[2][idx], st * arpInt * 0.85);
                        break;
                    }
                }
            }

            // --- Bass (triangle) — spacious in bridge, driving elsewhere ---
            var bassInt = (section === 2) ? 4 : 2;
            if (s % bassInt === 0) {
                for (var j = 0; j < gpBassRoots.length; j++) {
                    var b = gpBassRoots[j];
                    if (s >= b[0] && s < b[1]) {
                        // Alternate between root and alternate note
                        tri(time, (s % (bassInt * 2) === 0) ? b[2] : b[3], st * bassInt * 0.9);
                        break;
                    }
                }
            }
        },

        /** Title pattern — gentle kick/hihat, melody, sustained pad chords, bass. */
        title: function (s, time) {
            var st = stepTime;
            var ds = s % 16;

            // Gentle drums
            if (ds === 0) kick(time);
            if (ds === 8) hihat(time, true);

            // Melody
            if (titleMelody[s]) {
                pulse(time, titleMelody[s][0], st * titleMelody[s][1] * 0.9);
            }

            // Sustained pad chords (Em for first half, Am for second half)
            if (s === 0) {
                var dur = st * 32;
                pad(time, _n.E4, dur);
                pad(time, _n.G4, dur);
                pad(time, _n.B4, dur);
            }
            if (s === 32) {
                var dur2 = st * 32;
                pad(time, _n.A3, dur2);
                pad(time, _n.C4, dur2);
                pad(time, _n.E4, dur2);
            }

            // Bass
            if (s % 4 === 0) {
                tri(time, (s < 32) ? _n.E2 : _n.A2, st * 4 * 0.9);
            }
        },

        /** Ending pattern — upbeat celebratory feel with arpeggios. */
        ending: function (s, time) {
            var st = stepTime;
            var ds = s % 16;

            // Upbeat drums
            if (ds === 0 || ds === 8) kick(time);
            if (ds === 4 || ds === 12) hihat(time, false);

            // Melody
            if (endMelody[s]) {
                pulse(time, endMelody[s][0], st * endMelody[s][1] * 0.9);
            }

            // Arpeggios (chord changes every 16 steps)
            if (s % 2 === 0) {
                var chord;
                if (s < 16)      chord = [_n.C4, _n.E4, _n.G4];  // C major
                else if (s < 32) chord = [_n.G3, _n.B3, _n.D4];  // G major
                else if (s < 48) chord = [_n.A3, _n.C4, _n.E4];  // A minor
                else             chord = [_n.C4, _n.E4, _n.G4];  // C major
                var ci = (s / 2) % chord.length;
                pulseQuiet(time, chord[ci], st * 2 * 0.85);
            }

            // Bass (alternates root and fifth)
            if (s % 2 === 0) {
                var bf;
                if (s < 16)      bf = (s % 4 === 0) ? _n.C3 : _n.G2;
                else if (s < 32) bf = (s % 4 === 0) ? _n.G2 : _n.D3;
                else if (s < 48) bf = (s % 4 === 0) ? _n.A2 : _n.E3;
                else             bf = (s % 4 === 0) ? _n.C3 : _n.G2;
                tri(time, bf, st * 2 * 0.9);
            }
        }
    };

    // ---------------------------------------------------------------
    // Playback control
    // ---------------------------------------------------------------

    /**
     * Start playing a named pattern. Uses a setInterval scheduler that
     * schedules notes slightly ahead of real time for gapless playback.
     */
    function play(patternName) {
        ensureContext();
        if (currentPattern === patternName) return;
        stop();
        currentPattern = patternName;
        step = 0;

        var pattern = patterns[patternName];
        if (!pattern) return;

        var len = patternLengths[patternName] || 16;
        var nextStepTime = audioCtx.currentTime + 0.05;

        // Schedule notes in a tight loop, looking 100ms ahead
        intervalId = setInterval(function () {
            var now = audioCtx.currentTime;
            while (nextStepTime < now + 0.1) {
                pattern(step % len, nextStepTime);
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
        volume = v;
        if (masterGain && !muted) masterGain.gain.value = v;
    }

    function toggleMute() {
        ensureContext();
        muted = !muted;
        masterGain.gain.value = muted ? 0 : volume;
        return muted;
    }

    function isMuted() {
        return muted;
    }

    // ---------------------------------------------------------------
    // Sound Effects
    // ---------------------------------------------------------------

    function sfx(name) {
        ensureContext();
        var t = audioCtx.currentTime;

        switch (name) {
            case 'jump':
                // Bouncy upward boing — sine sweep from 250Hz to 600Hz
                (function () {
                    var osc = audioCtx.createOscillator();
                    var g = audioCtx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(250, t);
                    osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);
                    osc.frequency.exponentialRampToValueAtTime(400, t + 0.15);
                    g.gain.setValueAtTime(0.3, t);
                    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t);
                    osc.stop(t + 0.18);
                })();
                break;

            case 'collect':
                // Sparkly ascending arpeggio — C5 E5 G5 C6
                (function () {
                    var notes = [523, 659, 784, 1047];
                    for (var i = 0; i < notes.length; i++) {
                        var osc = audioCtx.createOscillator();
                        var g = audioCtx.createGain();
                        osc.type = 'square';
                        osc.frequency.value = notes[i];
                        var offset = i * 0.05;
                        g.gain.setValueAtTime(0, t + offset);
                        g.gain.linearRampToValueAtTime(0.15, t + offset + 0.02);
                        g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.12);
                        osc.connect(g);
                        g.connect(masterGain);
                        osc.start(t + offset);
                        osc.stop(t + offset + 0.12);
                    }
                })();
                break;

            case 'shoot':
                // Punchy whoosh — sawtooth pitch drop + noise burst
                (function () {
                    var osc = audioCtx.createOscillator();
                    var g = audioCtx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(800, t);
                    osc.frequency.exponentialRampToValueAtTime(200, t + 0.08);
                    g.gain.setValueAtTime(0.2, t);
                    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
                    var filt = audioCtx.createBiquadFilter();
                    filt.type = 'lowpass';
                    filt.frequency.value = 2000;
                    osc.connect(filt);
                    filt.connect(g);
                    g.connect(masterGain);
                    osc.start(t);
                    osc.stop(t + 0.1);

                    // High-frequency noise burst
                    var buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.06, audioCtx.sampleRate);
                    var d = buf.getChannelData(0);
                    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
                    var n = audioCtx.createBufferSource();
                    n.buffer = buf;
                    var ng = audioCtx.createGain();
                    ng.gain.setValueAtTime(0.1, t);
                    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
                    var hpf = audioCtx.createBiquadFilter();
                    hpf.type = 'highpass';
                    hpf.frequency.value = 3000;
                    n.connect(hpf);
                    hpf.connect(ng);
                    ng.connect(masterGain);
                    n.start(t);
                    n.stop(t + 0.06);
                })();
                break;

            case 'kill':
                // Satisfying pop + crunch — sine drop layered with bandpass noise
                (function () {
                    var osc = audioCtx.createOscillator();
                    var g = audioCtx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(400, t);
                    osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);
                    g.gain.setValueAtTime(0.4, t);
                    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t);
                    osc.stop(t + 0.2);

                    // Crunch noise (bandpass filtered)
                    var buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.08, audioCtx.sampleRate);
                    var d = buf.getChannelData(0);
                    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
                    var n = audioCtx.createBufferSource();
                    n.buffer = buf;
                    var ng = audioCtx.createGain();
                    ng.gain.setValueAtTime(0.25, t);
                    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
                    var bp = audioCtx.createBiquadFilter();
                    bp.type = 'bandpass';
                    bp.frequency.value = 1500;
                    bp.Q.value = 2;
                    n.connect(bp);
                    bp.connect(ng);
                    ng.connect(masterGain);
                    n.start(t);
                    n.stop(t + 0.08);
                })();
                break;

            case 'death':
                // Sad descending wobble — triangle sweep from 500Hz down to 40Hz
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
                    osc.connect(g);
                    g.connect(masterGain);
                    osc.start(t);
                    osc.stop(t + 0.6);
                })();
                break;

            case 'flag':
                // Victory fanfare — ascending arpeggio into sustained chord
                (function () {
                    // Ascending notes: C4 E4 G4 C5 E5 G5 C6
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
                        osc.connect(g);
                        g.connect(masterGain);
                        osc.start(t + offset);
                        osc.stop(t + offset + 0.35);
                    }

                    // Final sustained C major chord (triangle waves)
                    var chord = [523, 659, 784]; // C5 E5 G5
                    for (var j = 0; j < chord.length; j++) {
                        var o2 = audioCtx.createOscillator();
                        var g2 = audioCtx.createGain();
                        o2.type = 'triangle';
                        o2.frequency.value = chord[j];
                        g2.gain.setValueAtTime(0, t + 0.6);
                        g2.gain.linearRampToValueAtTime(0.12, t + 0.7);
                        g2.gain.setValueAtTime(0.12, t + 1.2);
                        g2.gain.linearRampToValueAtTime(0, t + 1.8);
                        o2.connect(g2);
                        g2.connect(masterGain);
                        o2.start(t + 0.6);
                        o2.stop(t + 1.8);
                    }
                })();
                break;
        }
    }

    return {
        init: init,
        play: play,
        stop: stop,
        setVolume: setVolume,
        sfx: sfx,
        toggleMute: toggleMute,
        isMuted: isMuted
    };
})();
