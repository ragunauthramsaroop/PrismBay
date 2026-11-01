#!/usr/bin/env python3
"""PrismBay AI Shorts subtitle timing/readability preflight. No third-party dependencies."""
import argparse
import json
import re
import sys
from pathlib import Path

STAMP = re.compile(r'^(\d{2}):(\d{2}):(\d{2}),(\d{3})$')
ARROW = re.compile(r'^(.+?)\s+-->\s+(.+?)$')

def seconds(stamp):
    m = STAMP.fullmatch(stamp.strip())
    if not m:
        raise ValueError(f'Invalid SRT timestamp: {stamp!r}')
    h, mi, s, ms = map(int, m.groups())
    if mi >= 60 or s >= 60:
        raise ValueError(f'Out-of-range timestamp: {stamp!r}')
    return h*3600 + mi*60 + s + ms/1000

def check(content, duration, max_lines=2, max_chars=38, max_wpm=180.0, slack=0.15):
    blocks = re.split(r'\n\s*\n', content.replace('\r\n','\n').strip())
    findings = []
    prev_end = 0.0
    report = []
    for index, block in enumerate(blocks, 1):
        rows = block.strip().split('\n')
        if len(rows) < 3 or rows[0].strip() != str(index):
            findings.append(f'Cue {index}: missing or out-of-order index')
            continue
        m = ARROW.fullmatch(rows[1].strip())
        if not m:
            findings.append(f'Cue {index}: missing timing arrow')
            continue
        try:
            start, end = seconds(m[1]), seconds(m[2])
        except ValueError as exc:
            findings.append(f'Cue {index}: {exc}')
            continue
        lines = [x.rstrip() for x in rows[2:]]
        words = re.findall(r"\b[\w]+(?:['’-][\w]+)*\b", ' '.join(lines), re.UNICODE)
        cue_duration = end - start
        wpm = len(words)*60/cue_duration if cue_duration > 0 else float('inf')
        if start < prev_end - 0.001:
            findings.append(f'Cue {index}: overlaps previous cue by {prev_end-start:.3f}s')
        if cue_duration <= 0:
            findings.append(f'Cue {index}: non-positive duration')
        if end > duration + slack:
            findings.append(f'Cue {index}: ends after video ({end:.3f}s > {duration:.3f}s + {slack:.2f}s)')
        if len(lines) > max_lines:
            findings.append(f'Cue {index}: {len(lines)} lines exceeds {max_lines}')
        for n, line in enumerate(lines, 1):
            if len(line) > max_chars:
                findings.append(f'Cue {index} line {n}: {len(line)} characters exceeds {max_chars}')
        if not words:
            findings.append(f'Cue {index}: empty spoken text')
        if wpm > max_wpm + 0.01:
            findings.append(f'Cue {index}: {wpm:.1f} WPM exceeds {max_wpm:.1f}')
        report.append({'cue':index,'start':start,'end':end,'words':len(words),'lines':len(lines),'maxCharacters':max(map(len,lines),default=0),'wpm':round(wpm,1)})
        prev_end = end
    return {'status':'PASS' if not findings else 'FAIL','cueCount':len(report),'durationSeconds':duration,'maxObservedWpm':max((c['wpm'] for c in report),default=0),'maxObservedCharacters':max((c['maxCharacters'] for c in report),default=0),'maxObservedLines':max((c['lines'] for c in report),default=0),'firstCueStartSeconds':report[0]['start'] if report else None,'lastCueEndSeconds':report[-1]['end'] if report else None,'findings':findings,'cues':report}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('srt',type=Path)
    p.add_argument('--duration',type=float,required=True,help='Media duration from ffprobe, in seconds')
    p.add_argument('--max-lines',type=int,default=2)
    p.add_argument('--max-chars',type=int,default=38)
    p.add_argument('--max-wpm',type=float,default=180)
    p.add_argument('--json-output',type=Path)
    args=p.parse_args()
    result=check(args.srt.read_text(encoding='utf-8-sig'),args.duration,args.max_lines,args.max_chars,args.max_wpm)
    output=json.dumps(result,indent=2)
    if args.json_output:
        args.json_output.write_text(output+'\n',encoding='utf-8')
    print(output)
    return 0 if result['status']=='PASS' else 1

if __name__=='__main__':
    sys.exit(main())
