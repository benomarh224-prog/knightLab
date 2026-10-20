"""Prepare bundled CC0 chess audio: python prepare-chess-audio.py path/to/kenney_impact-sounds.zip.
Requires numpy and soundfile for asset preparation only, never at build/runtime.
"""
import hashlib, io, json, sys, wave, zipfile
from pathlib import Path
import numpy as np
import soundfile as sf

rate = 24000
root = Path(__file__).resolve().parents[1] / 'src/assets/audio'
root.mkdir(parents=True, exist_ok=True)
archive = zipfile.ZipFile(sys.argv[1])
sources = []
def load(name):
    raw = archive.read('Audio/' + name)
    data, hz = sf.read(io.BytesIO(raw), always_2d=True)
    data = data.mean(axis=1)
    active = np.flatnonzero(np.abs(data) > max(abs(data).max() * .025, .0005))
    data = data[max(0, active[0] - int(hz * .002)):]
    data = np.interp(np.arange(0, len(data) / hz, 1 / rate), np.arange(len(data)) / hz, data)
    data = np.convolve(data, np.array([.1, .2, .4, .2, .1]), mode='same')
    sources.append({'file': name, 'sha256': hashlib.sha256(raw).hexdigest()})
    return data / max(abs(data).max(), .001)
light = load('impactWood_light_000.ogg')
full = load('impactWood_medium_001.ogg')
def clip(duration, hits):
    out = np.zeros(int(rate * duration))
    for sample, start, gain in hits:
        offset = int(start * rate)
        count = min(len(sample), len(out) - offset)
        out[offset:offset+count] += sample[:count] * gain
    out *= np.minimum(1, np.arange(len(out)) / (rate * .001))
    fade = min(len(out), int(rate * .035))
    out[-fade:] *= np.linspace(1, 0, fade) ** 2
    return out
felt = np.convolve(light, np.ones(17) / 17, mode='same')
clips = {
    'move': clip(.18, [(light, 0, .52)]),
    'capture': clip(.22, [(full, 0, .62)]),
    'castle': clip(.25, [(light, 0, .43), (light, .065, .30)]),
    'check': clip(.25, [(full, 0, .49), (felt, .085, .17)]),
    'promotion': clip(.34, [(light, 0, .43), (felt, .075, .25), (light, .145, .24)]),
    'complete': clip(.40, [(full, 0, .39), (felt, .14, .27)]),
    'incorrect': clip(.15, [(felt, 0, .30)]),
}
for name, data in clips.items():
    with wave.open(str(root / (name + '.wav')), 'wb') as target:
        target.setnchannels(1); target.setsampwidth(2); target.setframerate(rate)
        target.writeframes((np.clip(data, -.95, .95) * 32767).astype('<i2').tobytes())
(root / 'LICENSE.txt').write_text('\n'.join(line.rstrip() for line in archive.read('License.txt').decode('utf-8-sig').splitlines()).strip() + '\n', encoding='utf-8', newline='\n')
(root / 'SOURCES.json').write_text(json.dumps({'source': 'https://kenney.nl/assets/impact-sounds', 'license': 'CC0-1.0', 'originals': sources, 'preparation': 'Trimmed, softened, mixed, faded and resampled to 24 kHz mono PCM WAV by ROQVYN.'}, indent=2) + '\n')
(root / 'NOTICE.txt').write_text('Wood impact recordings by Kenney, Impact Sounds (2019), CC0 1.0.\nhttps://kenney.nl/assets/impact-sounds\nhttps://creativecommons.org/publicdomain/zero/1.0/\nROQVYN trimmed, softened, mixed and faded the recordings for chess feedback.\nNo attribution is required by CC0; this credit records their provenance.\n')
print(json.dumps({name: {'seconds': len(data) / rate, 'peak': float(abs(data).max())} for name, data in clips.items()}))
