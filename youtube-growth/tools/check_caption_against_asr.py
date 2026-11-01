#!/usr/bin/env python3
"""Check editorial captions against independent ASR. Uniform word midpoints are estimates, not forced alignment."""
import argparse
import json
import re
import sys
from pathlib import Path

STAMP = re.compile(r'^(\d{2}):(\d{2}):(\d{2}),(\d{3})$')
WORDS = re.compile(r"\b[\w]+(?:['’-][\w]+)*\b", re.UNICODE)

def parse_srt(text):
    cues = []
    for idx, block in enumerate(re.split(r'\n\s*\n', text.replace('\r\n', '\n').strip()), 1):
        rows = block.splitlines()
        if len(rows) < 3 or rows[0].strip() != str(idx):
            raise ValueError(f'Cue {idx}: invalid index or empty text')
        times = rows[1].strip().split(' --> ')
        if len(times) != 2:
            raise ValueError(f'Cue {idx}: invalid timing arrow')
        values = []
        for stamp in times:
            match = STAMP.fullmatch(stamp)
            if not match:
                raise ValueError(f'Cue {idx}: invalid timestamp {stamp!r}')
            h, m, s, ms = map(int, match.groups())
            if m >= 60 or s >= 60:
                raise ValueError(f'Cue {idx}: out-of-range timestamp')
            values.append(3600 * h + 60 * m + s + ms / 1000)
        start, end = values
        if end <= start:
            raise ValueError(f'Cue {idx}: nonpositive duration')
        words = [w.casefold().replace('’', "'") for w in WORDS.findall(' '.join(rows[2:]))]
        if not words:
            raise ValueError(f'Cue {idx}: no words')
        cues.append({'start': start, 'end': end, 'words': words})
    return cues

def check(editorial, asr, tolerance_seconds=0.35):
    proposed, reference = parse_srt(editorial), parse_srt(asr)
    actual_words = [w for cue in proposed for w in cue['words']]
    reference_words = [w for cue in reference for w in cue['words']]
    errors = []
    if actual_words != reference_words:
        mismatch = next((i for i, (a, b) in enumerate(zip(actual_words, reference_words), 1) if a != b), min(len(actual_words), len(reference_words)) + 1)
        errors.append(f'Transcript mismatch at word {mismatch}; editorial={len(actual_words)} words, ASR={len(reference_words)} words')
        return {'status': 'FAIL', 'editorialWords': len(actual_words), 'asrWords': len(reference_words), 'findings': errors, 'alignmentMethod': 'ASR cue uniform-word-midpoint estimate, not forced alignment'}
    midpoints = []
    for cue in reference:
        n = len(cue['words'])
        midpoints.extend(cue['start'] + (i + .5) * (cue['end'] - cue['start']) / n for i in range(n))
    violations = []
    offset = 0
    for cue_index, cue in enumerate(proposed, 1):
        for j, word in enumerate(cue['words']):
            midpoint = midpoints[offset + j]
            if midpoint < cue['start'] - tolerance_seconds or midpoint > cue['end'] + tolerance_seconds:
                violations.append({'cue': cue_index, 'word': word, 'estimatedMidpoint': round(midpoint, 3), 'captionStart': cue['start'], 'captionEnd': cue['end']})
        offset += len(cue['words'])
    if violations:
        errors.append(f'{len(violations)} estimated spoken-word midpoint(s) outside corresponding caption windows (tolerance {tolerance_seconds:.2f}s)')
    return {'status': 'PASS' if not errors else 'FAIL', 'editorialWords': len(actual_words), 'asrWords': len(reference_words), 'editorialCues': len(proposed), 'asrCues': len(reference), 'toleranceSeconds': tolerance_seconds, 'estimatedTimingViolations': violations, 'findings': errors, 'alignmentMethod': 'ASR cue uniform-word-midpoint estimate, not forced alignment', 'humanAudioAndMobileApproval': False}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('editorial_srt', type=Path)
    parser.add_argument('independent_asr_srt', type=Path)
    parser.add_argument('--tolerance', type=float, default=.35)
    parser.add_argument('--json-output', type=Path)
    args = parser.parse_args()
    if args.tolerance < 0 or args.tolerance > 2:
        parser.error('--tolerance must be between 0 and 2 seconds')
    try:
        result = check(args.editorial_srt.read_text(encoding='utf-8-sig'), args.independent_asr_srt.read_text(encoding='utf-8-sig'), args.tolerance)
    except ValueError as exc:
        result = {'status': 'FAIL', 'findings': [str(exc)]}
    output = json.dumps(result, indent=2)
    if args.json_output:
        args.json_output.write_text(output + '\n', encoding='utf-8')
    print(output)
    return 0 if result['status'] == 'PASS' else 1

if __name__ == '__main__':
    sys.exit(main())
