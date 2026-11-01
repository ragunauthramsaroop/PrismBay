#!/usr/bin/env python3
"""Review-only long-form SRT segmentation. Timing is estimated, not speech-aligned."""
import argparse
import json
import re
from pathlib import Path

MAX_LINE = 39
MAX_WORDS = 13
MIN_WORDS = 5

def ms(t):
    h, m, s = t.split(":")
    sec, millis = s.split(",")
    return ((int(h)*60+int(m))*60+int(sec))*1000+int(millis)

def fmt(t):
    h, r = divmod(t, 3600000)
    m, r = divmod(r, 60000)
    s, z = divmod(r, 1000)
    return f"{h:02}:{m:02}:{s:02},{z:03}"

def parse(s):
    chunks = []
    for block in re.split(r"\n\s*\n", s.strip()):
        lines = block.splitlines()
        assert len(lines) >= 3 and lines[0].isdigit(), "Malformed cue"
        a, b = lines[1].split(" --> ")
        chunks.append((ms(a), ms(b), " ".join(lines[2:])))
    return chunks

def split_lines(words):
    best = None
    for j in range(1, len(words)):
        left, right = " ".join(words[:j]), " ".join(words[j:])
        if len(left) > MAX_LINE or len(right) > MAX_LINE:
            continue
        score = abs(len(left)-len(right))
        if j == 1 or j == len(words)-1:
            score += 30
        if words[j-1].lower().strip(".,:;") in {"a","an","the","of","for","to","and","or","with"}:
            score += 12
        if best is None or score < best[0]:
            best = (score, [left, right])
    if best:
        return best[1]
    if len(" ".join(words)) <= MAX_LINE:
        return [" ".join(words)]
    return None

def segment(words):
    n = len(words)
    costs = [float("inf")]*(n+1)
    nexts = [None]*(n+1)
    lines_at = [None]*(n+1)
    costs[n] = 0
    for i in range(n-1,-1,-1):
        for j in range(i+1,min(n,i+MAX_WORDS)+1):
            lines = split_lines(words[i:j])
            k = j-i
            if not lines:
                continue
            penalty = (k-9)**2*0.32
            if k < MIN_WORDS and j < n:
                penalty += 25
            if k < MIN_WORDS and i > 0:
                penalty += 18
            if words[j-1].endswith((".", "?", "!")):
                penalty -= 6
            elif words[j-1].endswith((",", ":", ";")):
                penalty -= 2
            if j < n and words[j-1].lower().strip(".,:;") in {"a","an","the","of","for","to","and","or","with"}:
                penalty += 18
            if len(lines) == 1 and k > 4:
                penalty += 2
            score = penalty+costs[j]
            if score < costs[i]:
                costs[i], nexts[i], lines_at[i] = score, j, lines
    if nexts[0] is None:
        raise ValueError("Cannot segment caption safely")
    result = []
    i = 0
    while i < n:
        j = nexts[i]
        result.append((words[i:j],lines_at[i]))
        i = j
    return result

def transform(chunks):
    result = []
    for start,end,text in chunks:
        words = text.split()
        acc = 0
        for group,lines in segment(words):
            a = start+round((end-start)*acc/len(words))
            acc += len(group)
            b = start+round((end-start)*acc/len(words))
            result.append((a,b,lines))
    return result

def verify(chunks, captions):
    original = " ".join(x[2] for x in chunks).split()
    rebuilt = " ".join(" ".join(x[2]) for x in captions).split()
    assert original == rebuilt, "Narration text changed"
    assert all(len(line) <= MAX_LINE for _,_,ls in captions for line in ls)
    assert all(len(ls) <= 2 for _,_,ls in captions)
    assert all(a < b for a,b,_ in captions)
    assert all(captions[i][1] <= captions[i+1][0] for i in range(len(captions)-1))
    assert captions[0][0] == chunks[0][0] and captions[-1][1] == chunks[-1][1]
    rates = [len(" ".join(ls).split())*60000/(b-a) for a,b,ls in captions]
    assert max(rates) <= 180.5, "Reading speed exceeds review limit"
    return {"sourceCues":len(chunks),"reviewCues":len(captions),"spokenWords":len(original),
            "maxWordsPerMinute":round(max(rates),2),
            "minCueSeconds":round(min((b-a)/1000 for a,b,_ in captions),3),
            "maxCueSeconds":round(max((b-a)/1000 for a,b,_ in captions),3),
            "maxLineCharacters":max(len(line) for _,_,ls in captions for line in ls),
            "maxLines":max(len(ls) for _,_,ls in captions),
            "wordFidelity":"EXACT_SCRIPT_MATCH",
            "alignment":"ESTIMATED_WITHIN_SOURCE_PARAGRAPHS_NOT_INDEPENDENT_ASR",
            "publicationApproved":False,"uploadPermitted":False,
            "channelId":"UCw2hs85TzIpdKwJtG-BSxzQ","paidSpendUSD":0}

def main():
    p = argparse.ArgumentParser()
    p.add_argument("source")
    p.add_argument("output")
    p.add_argument("--json-output")
    a = p.parse_args()
    chunks = parse(Path(a.source).read_text(encoding="utf-8-sig"))
    captions = transform(chunks)
    report = verify(chunks,captions)
    Path(a.output).parent.mkdir(parents=True,exist_ok=True)
    Path(a.output).write_text("\n\n".join(
        f"{i}\n{fmt(start)} --> {fmt(end)}\n"+"\n".join(lines)
        for i,(start,end,lines) in enumerate(captions,1))+"\n",encoding="utf-8")
    if a.json_output:
        Path(a.json_output).write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(report,indent=2))
if __name__ == "__main__":
    main()
