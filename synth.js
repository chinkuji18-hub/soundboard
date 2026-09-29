/**
 * Web Audio API Sound Synthesizer & Generator
 * Generates custom synthesized audio files / audio buffers for preset Discord soundboard buttons.
 * Created by UG
 */

const SoundSynth = {
    // Generate an AudioBuffer or Blob URL from synthetic wave generation
    createAudioBlob(type) {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const sampleRate = audioCtx.sampleRate;
        
        let duration = 0.8; // seconds
        if (type === 'airhorn') duration = 1.2;
        if (type === 'badumtss') duration = 1.5;
        if (type === 'victory') duration = 1.8;

        const buffer = audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;

            switch (type) {
                case 'join':
                    // Discord Join chime (Two quick sine tones ascending)
                    if (t < 0.15) {
                        data[i] = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-t * 10);
                    } else if (t < 0.45) {
                        const t2 = t - 0.15;
                        data[i] = Math.sin(2 * Math.PI * 880 * t2) * Math.exp(-t2 * 8);
                    }
                    break;

                case 'mute':
                    // Discord Mute click (Thump down tone)
                    const freqMute = 350 - (t * 600);
                    data[i] = Math.sin(2 * Math.PI * Math.max(80, freqMute) * t) * Math.exp(-t * 12);
                    break;

                case 'airhorn':
                    // Synthesized Airhorn blast
                    const f1 = 466.16; // Bb4
                    const f2 = 622.25; // Eb5
                    const env = Math.exp(-t * 2.5);
                    const wave1 = (Math.sin(2 * Math.PI * f1 * t) > 0 ? 0.3 : -0.3);
                    const wave2 = (Math.sin(2 * Math.PI * f2 * t) > 0 ? 0.3 : -0.3);
                    const jitter = Math.sin(2 * Math.PI * 50 * t) * 0.1;
                    data[i] = (wave1 + wave2 + jitter) * env * 0.5;
                    break;

                case 'badumtss':
                    // Drum fill + Cymbal crash synth
                    if (t < 0.2) {
                        // Kick 1
                        data[i] = Math.sin(2 * Math.PI * (120 - t * 400) * t) * Math.exp(-t * 20);
                    } else if (t >= 0.25 && t < 0.45) {
                        // Snare / Kick 2
                        const t2 = t - 0.25;
                        const noise = (Math.random() * 2 - 1) * 0.5;
                        data[i] = (Math.sin(2 * Math.PI * 180 * t2) + noise) * Math.exp(-t2 * 18);
                    } else if (t >= 0.5) {
                        // Cymbal crash
                        const t3 = t - 0.5;
                        const whiteNoise = (Math.random() * 2 - 1);
                        data[i] = whiteNoise * Math.exp(-t3 * 5) * 0.4;
                    }
                    break;

                case 'quack':
                    // Funny Quack synth sound
                    const mod = Math.sin(2 * Math.PI * 35 * t);
                    const carrier = Math.sin(2 * Math.PI * (300 + mod * 100) * t);
                    data[i] = carrier * Math.exp(-t * 4) * 0.6;
                    break;

                case 'victory':
                    // Fanfare 3 notes (C5, E5, G5)
                    let freqVic = 523.25; // C5
                    let tVic = t;
                    if (t >= 0.25 && t < 0.5) {
                        freqVic = 659.25; // E5
                        tVic = t - 0.25;
                    } else if (t >= 0.5) {
                        freqVic = 783.99; // G5
                        tVic = t - 0.5;
                    }
                    data[i] = Math.sin(2 * Math.PI * freqVic * tVic) * Math.exp(-tVic * 4) * 0.5;
                    break;

                case 'gg':
                    // GG Synth chord cheer
                    const c1 = Math.sin(2 * Math.PI * 523.25 * t);
                    const c2 = Math.sin(2 * Math.PI * 659.25 * t);
                    const c3 = Math.sin(2 * Math.PI * 783.99 * t);
                    data[i] = ((c1 + c2 + c3) / 3) * Math.exp(-t * 3) * 0.6;
                    break;

                default:
                    // Generic beep chime
                    data[i] = Math.sin(2 * Math.PI * 600 * t) * Math.exp(-t * 6);
                    break;
            }
        }

        // Convert AudioBuffer to WAV Blob
        return SoundSynth.bufferToWavBlob(buffer);
    },

    bufferToWavBlob(audioBuffer) {
        const numOfChan = audioBuffer.numberOfChannels;
        const length = audioBuffer.length * numOfChan * 2 + 44;
        const outBuffer = new ArrayBuffer(length);
        const view = new DataView(outBuffer);
        const channels = [];
        let sample = 0;
        let offset = 0;
        let pos = 0;

        function setUint16(data) {
            view.setUint16(pos, data, true);
            pos += 2;
        }

        function setUint32(data) {
            view.setUint32(pos, data, true);
            pos += 4;
        }

        // write WAVE header
        setUint32(0x46464952);                         // "RIFF"
        setUint32(length - 8);                         // file length - 8
        setUint32(0x45564157);                         // "WAVE"
        setUint32(0x20746d66);                         // "fmt " chunk
        setUint32(16);                                 // length = 16
        setUint16(1);                                  // PCM (uncompressed)
        setUint16(numOfChan);
        setUint32(audioBuffer.sampleRate);
        setUint32(audioBuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
        setUint16(numOfChan * 2);                      // block-align
        setUint16(16);                                 // 16-bit
        setUint32(0x61746164);                         // "data" chunk
        setUint32(length - pos - 4);                   // chunk length

        for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
            channels.push(audioBuffer.getChannelData(i));
        }

        while (offset < audioBuffer.length) {
            for (let i = 0; i < numOfChan; i++) {
                sample = Math.max(-1, Math.min(1, channels[i][offset]));
                sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
                view.setInt16(pos, sample, true);
                pos += 2;
            }
            offset++;
        }

        return new Blob([outBuffer], { type: 'audio/wav' });
    }
};

window.SoundSynth = SoundSynth;
