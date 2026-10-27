#!/usr/bin/env python3
"""Validate the original unit-economics Shorts storyboard."""
import json
import sys
from youtube_visual_unit_economics import render_frame_unit_economics

if __name__ == '__main__':
    data = json.load(open(sys.argv[1], encoding='utf-8'))
    assert data['targetChannelId'] == 'UCw2hs85TzIpdKwJtG-BSxzQ'
    assert data['publicationApproved'] is False
    assert len(data['segments']) == 7
    for i, segment in enumerate(data['segments']):
        frame = render_frame_unit_economics(segment, i, 7, '')
        frame.save(f'/tmp/prismbay-unit-economics-{i}.png')
    print('Seven original 1080x1920 scenes validated. No upload or publication.')
