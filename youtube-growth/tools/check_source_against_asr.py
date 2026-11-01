#!/usr/bin/env python3
"""Read-only spoken-source versus independent-ASR review gate for PrismBay AI.

ASR mismatches are review leads, not proof that audio is wrong. This tool never
changes captions, schedules posts, or authorizes publication.
"""
import argparse
import difflib
import json
import re
import sys
from pathlib import Path

CHANNEL = "UCw2hs85TzIpdKwJtG-BSxzQ"
WORDS = re.compile(r"[\w]+(?:['’][\w]+)*", re.UNICODE)
SRT_TIMING = re.compile(r"\d\d:\d\d:\d\d,\d{3}\s+-->\s+\d\d:\d\d:\d\d,\d{3}")


def tokenize(text):
    return [w.casefold().replace('’', "'") for w in WORDS.findall(text)]


def srt_words(text):
    lines = []
    for raw in text.replace('\r\n', '\n').splitlines():
        line = raw.strip()
        if not line or line.isdigit() or SRT_TIMING.fullmatch(line):
            continue
        lines.append(line)
    return tokenize(' '.join(lines))


def assess(request, srt_text):
    if request.get('targetChannelId') != CHANNEL:
        return {'status': 'BLOCK', 'reason': 'Channel identity mismatch', 'expectedChannelId': CHANNEL}
    if request.get('format') != 'short':
        return {'status': 'BLOCK', 'reason': 'Only short segment-based requests supported'}
    segments = request.get('segments')
    if not isinstance(segments, list) or not segments or any(not isinstance(x, dict) or not x.get('spoken') for x in segments):
        return {'status': 'BLOCK', 'reason': 'Missing spoken source segments'}
    expected = tokenize(' '.join(x['spoken'] for x in segments))
    observed = srt_words(srt_text)
    if not observed:
        return {'status': 'BLOCK', 'reason': 'Missing ASR words'}
    matcher = difflib.SequenceMatcher(a=expected, b=observed, autojunk=False)
    differences = []
    for op, i, j, k, l in matcher.get_opcodes():
        if op != 'equal':
            differences.append({'operation': op, 'sourceWordPosition': i + 1, 'source': ' '.join(expected[i:j]), 'asr': ' '.join(observed[k:l])})
    return {
        'status': 'PASS' if not differences else 'REVIEW',
        'channelId': CHANNEL,
        'expectedWords': len(expected),
        'asrWords': len(observed),
        'estimatedTokenAgreement': round(matcher.ratio(), 4),
        'differences': differences,
        'independentASRIsNotAudioProof': True,
        'humanNarrationListeningComplete': False,
        'publicUploadPermittedByThisCheck': False,
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('request_json', type=Path)
    parser.add_argument('independent_asr_srt', type=Path)
    parser.add_argument('--json-output', type=Path)
    args = parser.parse_args(argv)
    try:
        result = assess(json.loads(args.request_json.read_text(encoding='utf-8')), args.independent_asr_srt.read_text(encoding='utf-8-sig'))
    except (OSError, ValueError) as exc:
        result = {'status': 'BLOCK', 'reason': str(exc)}
    output = json.dumps(result, indent=2, ensure_ascii=False) + '\n'
    if args.json_output:
        args.json_output.write_text(output, encoding='utf-8')
    print(output, end='')
    return 0 if result['status'] == 'PASS' else 2


if __name__ == '__main__':
    sys.exit(main())
