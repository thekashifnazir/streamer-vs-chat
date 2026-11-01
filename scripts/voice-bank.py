#!/usr/bin/env python3
"""Recorded voice bank (ElevenLabs): boss taunts, Crowd Trainer coach calls and a few SFX.

Everything comes from one data file, assets/voice/bank/lines.json. Run from the repo root with the key
loaded into the environment only (never printed):
  set -a; . ../streamer-vs-chat/.env; set +a; python3 scripts/voice-bank.py <command>

  design [voice ...]      Voice Design: 3 previews per voice -> ~/cx-runs/voice-previews/<voice>/ (spends credits)
  rank [voice ...]        whisper transcript check of the previews (local, free)
  save <voice> <n>        save preview n to the voice library and use it for that voice in lines.json
  generate [voice|sfx ...] TTS / Sound Effects for every missing or changed file, then trim + level
  refinish [voice ...]    re-level shipped takes from the raw cache after a target change (local, free)
  qc                      re-measure every shipped file into assets/voice/bank/<voice>/qc.json and
                          write assets/voice/bank/durations.json for the player (local, free)
  credits                 print the account's character usage (no secrets)

A voice is one entry of voices.boss / voices.coach (id, friendly name, Voice Design brief). Every voice
speaks every line of its bank into assets/voice/bank/<voice id>/<cue>-<n>.mp3. Generation skips a file
when that voice's qc.json already records the same voice, model and text for it. To swap a voice, `save` another
preview (or paste its voice_id into lines.json) and run `generate` again.
Raw API output is cached in ~/cx-runs/voice-bank-raw so re-levelling never spends credits twice.
"""
import base64, difflib, hashlib, json, os, re, subprocess, sys, tempfile, time, urllib.error, urllib.request

API = 'https://api.elevenlabs.io/v1'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BANK = os.path.join(ROOT, 'assets/voice/bank')
LINES = os.path.join(BANK, 'lines.json')
PREVIEWS = os.path.expanduser('~/cx-runs/voice-previews')
RAW = os.path.expanduser('~/cx-runs/voice-bank-raw')
WHISPER_MODEL = os.path.expanduser('~/.cache/hackathon-kit/whisper/ggml-small.en.bin')
# Same targets as the announcer prep: RMS about -17 dBFS, sample peaks at or below -1 dBFS.
TARGET_RMS, PEAK_LIMIT, BITRATE = -17.0, 0.79, '64k'  # 0.79 linear = -2 dBFS: headroom for MP3 overshoot
TRIES = 3
FIT_SECONDS = 2.4


def load():
    return json.load(open(LINES))


def voices(data):
    return [(bank, voice) for bank in ('boss', 'coach') for voice in data['voices'][bank]]


def find(data, voice_id):
    for bank, voice in voices(data):
        if voice['id'] == voice_id:
            return bank, voice
    sys.exit(f'Unknown voice {voice_id}; known: {", ".join(v["id"] for _, v in voices(data))}')


def dump(path, data):
    with open(path, 'w') as handle:
        json.dump(data, handle, indent=2, ensure_ascii=False)
        handle.write('\n')


def request(method, path, body=None):
    key = os.environ.get('ELEVENLABS_API_KEY')
    if not key:
        sys.exit('Load ELEVENLABS_API_KEY into the environment first.')
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f'{API}{path}', data=data, method=method,
                                 headers={'xi-api-key': key, 'Content-Type': 'application/json'})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=180) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            # Concurrency limits and transient server errors: back off and retry; anything else is fatal.
            if error.code in (429, 500, 502, 503) and attempt < 5:
                time.sleep(5 * (attempt + 1))
                continue
            sys.exit(f'{method} {path} -> {error.code}: {error.read()[:400].decode(errors="replace")}')
        except (urllib.error.URLError, TimeoutError):
            if attempt == 5:
                raise
            time.sleep(5 * (attempt + 1))
    sys.exit(f'{method} {path}: no response')


def ffmpeg(*args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *args], check=True)


def measure(path):
    """Overall RMS and sample peak (dBFS) plus duration, from ffmpeg astats."""
    out = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af', 'astats=measure_perchannel=none', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    rms = float(re.findall(r'RMS level dB: (-?[\d.]+|-inf)', out)[-1])
    peak = float(re.findall(r'Peak level dB: (-?[\d.]+|-inf)', out)[-1])
    probe = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
                           capture_output=True, text=True).stdout
    return {'rms_db': round(rms, 2), 'peak_db': round(peak, 2), 'seconds': round(float(probe), 3)}


def finish(raw, out, speech=True):
    """Trim leading/trailing silence, level to the RMS target under the peak cap, encode mono MP3."""
    with tempfile.TemporaryDirectory() as tmp:
        trimmed = os.path.join(tmp, 'trimmed.wav')
        trim = ('silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,areverse,'
                'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.06,areverse')
        ffmpeg('-i', raw, '-ac', '1', '-ar', '44100', '-af', trim, trimmed)
        level = measure(trimmed)
        # Long takes are sped up (pitch kept) to fit 2.4 s, at most 1.25x so the delivery stays natural.
        tempo = min(1.25, level['seconds'] / FIT_SECONDS) if speech and level['seconds'] > FIT_SECONDS else 1.0
        gain = TARGET_RMS - level['rms_db'] if speech else min(0.0, -1.5 - level['peak_db'])
        chain = (f'atempo={tempo:.3f},' if tempo > 1 else '') + f'volume={gain:.2f}dB,alimiter=limit={PEAK_LIMIT}:attack=1:release=60:level=disabled:latency=1'
        os.makedirs(os.path.dirname(out), exist_ok=True)
        encode = lambda extra: ffmpeg('-i', trimmed, '-af', chain + (f',volume={extra:.2f}dB' if extra else ''), '-ac', '1', '-ar', '44100',
                                      '-c:a', 'libmp3lame', '-b:a', BITRATE, '-map_metadata', '-1', '-id3v2_version', '0', '-write_id3v1', '0', out)
        encode(0)
        stats = measure(out)
        if stats['peak_db'] > -1.0:  # rare MP3 overshoot past the cap: pull the whole take down just enough
            encode(-1.2 - stats['peak_db'])
            stats = measure(out)
    return {**stats, 'tempo': round(tempo, 3)}


NUMBERS = {'ok': 'okay', '1': 'one', '2': 'two', '10': 'ten', '12': 'one two', '112': 'one one two', '121': 'one two one', '1212': 'one two one two'}


CONTRACTIONS = [("n't", ' not'), ("'ve", ' have'), ("'ll", ' will'), ("'re", ' are'), ("'m", ' am'), ("'d", ' would')]


def words(text):
    text = re.sub(r'\[[^\]]*\]|\([^)]*\)', ' ', text.lower()).replace('-', ' ').replace('’', "'")
    for short, full in CONTRACTIONS:
        text = text.replace(short, full)
    text = text.replace("'", '')  # chat's / chats, that's / thats
    return [NUMBERS.get(word) or word for word in re.findall(r"[a-z0-9']+", text)]


def transcribe(path):
    if not os.path.exists(WHISPER_MODEL):
        return None
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, 'in.wav')
        ffmpeg('-i', path, '-ac', '1', '-ar', '16000', wav)
        out = subprocess.run(['whisper-cli', '-m', WHISPER_MODEL, '-f', wav, '-nt', '-np', '-l', 'en'],
                             capture_output=True, text=True).stdout
    return ' '.join(out.split())


def similarity(expected, heard):
    """Best of word-level and letters-only match, so RE-MATCH / rematch or Rocks1 / rocks one still count."""
    a, b = ' '.join(words(expected)).split(), ' '.join(words(heard)).split()
    letters = difflib.SequenceMatcher(None, ''.join(a), ''.join(b)).ratio()
    return round(max(difflib.SequenceMatcher(None, a, b).ratio(), letters), 3)


def design(name):
    _, voice = find(load(), name)
    folder = os.path.join(PREVIEWS, name)
    if os.path.exists(os.path.join(folder, 'previews.json')):
        return print(f'{folder}/previews.json exists; delete it to design again')
    os.makedirs(folder, exist_ok=True)
    raw = json.loads(request('POST', '/text-to-voice/design', {
        'voice_description': voice['description'], 'model_id': 'eleven_ttv_v3', 'text': voice['sample']}))
    ids = []
    for number, preview in enumerate(raw['previews'], 1):
        open(os.path.join(folder, f'{number}.mp3'), 'wb').write(base64.b64decode(preview['audio_base_64']))
        ids.append(preview['generated_voice_id'])
    dump(os.path.join(folder, 'previews.json'), {'description': voice['description'], 'text': voice['sample'], 'ids': ids})
    print(f'{folder}: {len(ids)} previews')


def rank(name):
    folder = os.path.join(PREVIEWS, name)
    meta = json.load(open(os.path.join(folder, 'previews.json')))
    results = []
    for number in range(1, len(meta['ids']) + 1):
        path = os.path.join(folder, f'{number}.mp3')
        heard = transcribe(path) or ''
        results.append({'preview': number, 'path': path, 'similarity': similarity(meta['text'], heard), **measure(path), 'heard': heard})
    meta['rank'] = results
    dump(os.path.join(folder, 'previews.json'), meta)
    for row in results:
        print(f"{name} {row['preview']}: similarity {row['similarity']} rms {row['rms_db']} {row['seconds']} s | {row['heard'][:90]}")


def save(slug, number):
    data = load()
    _, voice = find(data, slug)
    folder = os.path.join(PREVIEWS, slug)
    meta = json.load(open(os.path.join(folder, 'previews.json')))
    name = f"Streamer vs Chat {voice['name']}"
    voice_id = json.loads(request('POST', '/text-to-voice', {
        'voice_name': name, 'voice_description': meta['description'], 'generated_voice_id': meta['ids'][int(number) - 1]}))['voice_id']
    meta.setdefault('saved', {})[str(number)] = {'voice_id': voice_id, 'name': name}
    dump(os.path.join(folder, 'previews.json'), meta)
    voice.update({'voice_id': voice_id, 'saved_name': name, 'preview': int(number)})
    dump(LINES, data)
    print(f'{slug}: preview {number} saved as {name} ({voice_id})')


def qc_path(folder):
    return os.path.join(BANK, folder, 'qc.json')


def qc_data(folder):
    path = qc_path(folder)
    return json.load(open(path)) if os.path.exists(path) else {'files': {}}


def cached(kind, payload, fetch):
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()[:16]
    path = os.path.join(RAW, kind, f'{digest}.mp3')
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        audio = fetch()
        if not audio:
            sys.exit(f'Empty audio from the API for {kind} {digest}')
        open(path + '.part', 'wb').write(audio)
        os.replace(path + '.part', path)  # atomic: an interrupted run never leaves a truncated cache file
    return path


def take(voice, text, seed, out, offline=False, heard=None):
    """One TTS take, levelled into `out`, with its QC record. Pass = transcript match and 2.5 s or shorter.
    offline=True re-levels the cached raw take only (refinish) and never calls the API; `heard` reuses a
    transcript when only the encoding changed."""
    body = {'text': text, 'model_id': voice['model_id'], 'voice_settings': voice['settings'], 'seed': seed}
    def fetch():
        if offline:
            sys.exit(f'No cached raw take for {voice["id"]} "{text}" seed {seed}')
        return request('POST', f"/text-to-speech/{voice['voice_id']}?output_format=mp3_44100_128", body)
    raw = cached(voice['id'], {**body, 'voice_id': voice['voice_id']}, fetch)
    stats = finish(raw, out)
    heard = heard or transcribe(out)
    score = similarity(text, heard) if heard is not None else None
    passed = (score is None or score >= 0.8) and stats['seconds'] <= 2.5
    return {'voice_id': voice['voice_id'], 'model_id': voice['model_id'], 'text': text, **stats,
            'heard': heard, 'similarity': score, 'seed': seed, 'pass': passed}


def generate_voice(slug, data):
    """Every line of the voice's bank; up to TRIES seeds per line, keeping the best take."""
    bank, voice = find(data, slug)
    if not voice.get('voice_id'):
        sys.exit(f'No voice_id for {slug}: run design/rank/save first.')
    qc, made = qc_data(slug), 0
    for cue, texts in data['lines'][bank].items():
        for number, text in enumerate(texts, 1):
            rel = f'{cue}-{number}.mp3'
            out = os.path.join(BANK, slug, rel)
            old = qc['files'].get(rel) or {}
            if os.path.exists(out) and (old.get('voice_id'), old.get('model_id'), old.get('text')) == (voice['voice_id'], voice['model_id'], text):
                continue
            best = None
            for attempt in range(TRIES):
                tmp = out + '.tmp.mp3'
                record = {**take(voice, text, 1000 + attempt, tmp), 'tries': attempt + 1}
                rank_of = lambda r: (r['pass'], r['similarity'] or 0.0, -r['seconds'])
                if best is None or rank_of(record) > rank_of(best):
                    best = record
                    os.replace(tmp, out)
                else:
                    os.remove(tmp)
                if record['pass']:
                    break
            assert best is not None
            qc['files'][rel] = best
            dump(qc_path(slug), qc)
            made += 1
            print(f"{slug}/{rel}: {best['seconds']} s, rms {best['rms_db']}, peak {best['peak_db']}, sim {best['similarity']}{'' if best['pass'] else '  CHECK'}")
    print(f'{slug}: {made} files made')


def refinish(slug, data):
    """Re-level every shipped take of a voice from the raw cache (after a QC target change). No API calls."""
    _, voice = find(data, slug)
    qc = qc_data(slug)
    for rel, entry in sorted(qc['files'].items()):
        out = os.path.join(BANK, slug, rel)
        same = entry.get('tempo') is not None and entry.get('heard')
        record = {**take(voice, entry['text'], entry['seed'], out + '.tmp.mp3', offline=True, heard=entry['heard'] if same else None), 'tries': entry.get('tries', 1)}
        if same and record['tempo'] != entry['tempo']:
            record = {**take(voice, entry['text'], entry['seed'], out + '.tmp.mp3', offline=True), 'tries': entry.get('tries', 1)}
        os.replace(out + '.tmp.mp3', out)
        qc['files'][rel] = record
        dump(qc_path(slug), qc)
    print(f'{slug}: {len(qc["files"])} re-levelled')


def generate_sfx(data):
    qc = qc_data('sfx')
    for name, spec in data['sfx'].items():
        rel = f'{name}.mp3'
        out = os.path.join(BANK, 'sfx', rel)
        if os.path.exists(out) and (qc['files'].get(rel) or {}).get('text') == spec['text']:
            continue
        payload = {'text': spec['text'], 'duration_seconds': spec['seconds'], 'prompt_influence': 0.6}
        raw = cached('sfx', payload, lambda: request('POST', '/sound-generation?output_format=mp3_44100_128', payload))
        stats = finish(raw, out, speech=False)
        qc['files'][rel] = {'text': spec['text'], **stats, 'pass': stats['peak_db'] <= -1.0}
        dump(qc_path('sfx'), qc)
        print(f'sfx/{rel}: {stats}')


def qc_all():
    """Re-measure every shipped file and print one summary line per voice."""
    for folder in sorted(name for name in os.listdir(BANK) if os.path.isdir(os.path.join(BANK, name))):
        qc = qc_data(folder)
        for rel, entry in qc['files'].items():
            if os.path.exists(os.path.join(BANK, folder, rel)):
                entry.update(measure(os.path.join(BANK, folder, rel)))
            if entry.get('heard') == '':  # whisper sometimes returns nothing under heavy parallel load
                entry['heard'] = transcribe(os.path.join(BANK, folder, rel))
            if entry.get('heard') is not None:
                entry['similarity'] = similarity(entry['text'], entry['heard'])
                entry['pass'] = entry['similarity'] >= 0.8 and entry['seconds'] <= 2.5
        dump(qc_path(folder), qc)
        rows = list(qc['files'].values())
        if not rows:
            continue
        rms = sorted(row['rms_db'] for row in rows)
        print(f"{folder}: {len(rows)} files; rms {rms[0]}..{rms[-1]} (median {rms[len(rms) // 2]}); max peak {max(row['peak_db'] for row in rows)}; "
              f"{sum(1 for row in rows if row.get('pass'))} pass; {min(row['seconds'] for row in rows)}..{max(row['seconds'] for row in rows)} s")


def write_durations():
    """Compact {voice: {cue: [seconds per variant]}} for the player, so it can pick a take that fits a gap without fetching."""
    data, out = load(), {}
    for bank, voice in voices(data):
        files = qc_data(voice['id'])['files']
        out[voice['id']] = {cue: [files.get(f'{cue}-{n}.mp3', {}).get('seconds') for n in range(1, len(texts) + 1)]
                            for cue, texts in data['lines'][bank].items()}
    with open(os.path.join(BANK, 'durations.json'), 'w') as handle:
        json.dump(out, handle, separators=(',', ':'))
        handle.write('\n')


def credits():
    sub = json.loads(request('GET', '/user/subscription'))
    print(json.dumps({k: sub.get(k) for k in ('tier', 'character_count', 'character_limit', 'voice_slots_used', 'voice_limit')}))


if __name__ == '__main__':
    command, *args = sys.argv[1:] or ['help']
    if command in ('design', 'rank'):
        for name in args or [v['id'] for _, v in voices(load())]:
            design(name) if command == 'design' else rank(name)
    elif command == 'save' and len(args) == 2:
        save(*args)
    elif command == 'generate':
        data = load()
        for target in args or [v['id'] for _, v in voices(data)] + ['sfx']:
            generate_sfx(data) if target == 'sfx' else generate_voice(target, data)
    elif command == 'refinish':
        data = load()
        for target in args or [v['id'] for _, v in voices(data)]:
            refinish(target, data)
    elif command == 'qc':
        qc_all()
        write_durations()
    elif command == 'credits':
        credits()
    else:
        sys.exit(__doc__)
