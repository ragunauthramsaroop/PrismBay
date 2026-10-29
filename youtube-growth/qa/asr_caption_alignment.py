#!/usr/bin/env python3
"""Independent ASR proxy for an UNPUBLISHED PrismBay AI draft. No publication action."""
import argparse
import csv
import difflib
import hashlib
import json
import re
import subprocess
from pathlib import Path

CHANNEL = 'UCw2hs85TzIpdKwJtG-BSxzQ'
STAMP = re.compile(r'^(\d\d):(\d\d):(\d\d)[,.](\d{3})$')

def seconds(value):
    m = STAMP.match(value.strip())
    if not m:
        raise ValueError(f'Invalid SRT timestamp: {value!r}')
    h, minute, sec, milli = map(int, m.groups())
    return h * 3600 + minute * 60 + sec + milli / 1000

def tokenize(value):
    return re.findall(r'[a-z0-9]+', value.lower())

def read_cues(path):
    cues = []
    content = Path(path).read_text(encoding='utf-8-sig').strip()
    for block in re.split(r'\n\s*\n', content):
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        idx = next((i for i, line in enumerate(lines) if ' --> ' in line), None)
        if idx is None or idx + 1 >= len(lines):
            continue
        start, end = [seconds(t) for t in lines[idx].split(' --> ', 1)]
        if start >= end:
            raise ValueError('Nonpositive caption duration')
        phrase = ' '.join(lines[idx + 1:])
        cues.append({'start': start, 'end': end, 'text': phrase, 'words': tokenize(phrase)})
    if not cues:
        raise ValueError('No SRT cues found')
    if any(cues[i]['start'] < cues[i-1]['end'] - .03 for i in range(1, len(cues))):
        raise ValueError('Overlapping SRT cues')
    return cues

def align(cues, heard_words):
    expected, owners = [], []
    for i, cue in enumerate(cues):
        expected.extend(cue['words'])
        owners.extend([i] * len(cue['words']))
    recognized, times = [], []
    for w in heard_words:
        for token in tokenize(w['word']):
            recognized.append(token)
            times.append((float(w['start']), float(w['end'])))
    sm = difflib.SequenceMatcher(None, expected, recognized, autojunk=False)
    matched = [[] for _ in cues]
    for block in sm.get_matching_blocks():
        for j in range(block.size):
            matched[owners[block.a+j]].append(times[block.b+j])
    rows = []
    for i, cue in enumerate(cues):
        m = matched[i]
        start_drift = cue['start'] - m[0][0] if m else None
        end_drift = cue['end'] - m[-1][1] if m else None
        duration = cue['end'] - cue['start']
        rows.append({
            'cue': i+1, 'start_s': round(cue['start'],3), 'end_s': round(cue['end'],3),
            'caption_words': len(cue['words']), 'matched_words': len(m),
            'match_fraction': round(len(m)/max(1,len(cue['words'])),3),
            'start_drift_s': round(start_drift,3) if start_drift is not None else None,
            'end_drift_s': round(end_drift,3) if end_drift is not None else None,
            'wpm': round(len(cue['words'])*60/duration,1),
            'flag': 'NO_ASR_MATCH' if not m else ('CHECK_SYNC' if max(abs(start_drift),abs(end_drift))>1.0 else 'OK'),
            'text': cue['text']
        })
    drifts = sorted(abs(d) for row in rows for d in (row['start_drift_s'],row['end_drift_s']) if d is not None)
    median = drifts[len(drifts)//2] if drifts else None
    return rows, {
        'captionWordCount': len(expected), 'asrWordCount': len(recognized),
        'sequenceSimilarity': round(sm.ratio(),4),
        'matchedCueFraction': round(sum(bool(x) for x in matched)/len(cues),4),
        'medianAbsBoundaryDriftSeconds': median,
        'cuesWithSyncFlags': sum(x['flag']=='CHECK_SYNC' for x in rows),
        'cuesWithoutAsrMatch': sum(x['flag']=='NO_ASR_MATCH' for x in rows),
        'cuesOver160Wpm': sum(x['wpm']>160 for x in rows),
        'cuesOver180Wpm': sum(x['wpm']>180 for x in rows),
    }

def main():
    parser = argparse.ArgumentParser()
    for name in ('video','srt','manifest','output'):
        parser.add_argument('--'+name,required=True)
    args = parser.parse_args()
    video = Path(args.video)
    manifest = json.loads(Path(args.manifest).read_text())
    if (manifest.get('channelId')!=CHANNEL or manifest.get('publicationApproved') is not False
            or manifest.get('uploadPermitted') is not False or manifest.get('paidSpendUSD')!=0):
        raise ValueError('Unpublished sole-channel and zero-spend gates failed')
    cues = read_cues(args.srt)
    from faster_whisper import WhisperModel
    import numpy as np
    pcm = subprocess.check_output(['ffmpeg','-hide_banner','-loglevel','error','-i',str(video),
                                   '-vn','-ac','1','-ar','16000','-f','f32le','-'])
    model = WhisperModel('tiny.en',device='cpu',compute_type='int8')
    segments,_ = model.transcribe(np.frombuffer(pcm,dtype=np.float32),language='en',
                                   beam_size=3,word_timestamps=True,vad_filter=False)
    heard = [{'word':w.word,'start':w.start,'end':w.end}
             for seg in segments for w in (seg.words or [])]
    rows,metrics = align(cues,heard)
    out = Path(args.output)
    out.mkdir(parents=True,exist_ok=True)
    with (out/'caption_asr_cues.csv').open('w',newline='',encoding='utf-8') as f:
        writer=csv.DictWriter(f,fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    report={
        'channelId':CHANNEL,'videoSha256':hashlib.sha256(video.read_bytes()).hexdigest(),
        'method':'faster-whisper tiny.en CPU word timestamps + ordered token matching',
        'metrics':metrics,'machineReview':'COMPLETE',
        'humanListeningReview':'NOT_PERFORMED','mobilePlaybackReview':'NOT_PERFORMED',
        'captionSynchronization':'PROVISIONAL_ASR_PROXY',
        'publicationApproved':False,'uploadPermitted':False,'paidSpendUSD':0,
        'limitations':'Whisper recognition and timestamps are estimates. Numerical speech and proper nouns cause false flags. Human audiovisual review is still required.'
    }
    (out/'asr_alignment_report.json').write_text(json.dumps(report,indent=2)+'\n')
    (out/'asr_transcript.txt').write_text(' '.join(w['word'].strip() for w in heard)+'\n')
    print(json.dumps({'metrics':metrics,'publicationApproved':False},indent=2))

if __name__=='__main__':
    main()
