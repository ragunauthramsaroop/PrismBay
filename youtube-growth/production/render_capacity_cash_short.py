#!/usr/bin/env python3
"""Original PrismBay AI capacity-vs-cash Short, private review render only."""
import importlib.util
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

CHANNEL = 'UCw2hs85TzIpdKwJtG-BSxzQ'
EPISODE = 'PB-YT-SH-2026-11-01-CAPACITY-CASH'
PHRASES = [
 ('hook', 'Your AI agent saved one hundred staff hours.'),
 ('hook', 'But your payroll did not change.'),
 ('capacity', 'At thirty six dollars per hour, the capacity value is thirty six hundred dollars.'),
 ('capacity', 'Released capacity is not the same as cash saved.'),
 ('software', 'Now suppose the software costs four hundred dollars per month.'),
 ('software', 'With no spending cuts, cash costs rise four hundred dollars.'),
 ('routes', 'One path is to redeploy those hours into measurable new work.'),
 ('routes', 'Another is to reduce overtime or outside contractor bills.'),
 ('cash', 'Suppose overtime falls one thousand dollars per month.'),
 ('cash', 'After software costs, net cash spending falls six hundred dollars.'),
 ('guard', 'Do not count the same staff hour twice as capacity and cash savings.'),
 ('close', 'Track both scorecards. Follow PrismBay AI for practical AI systems.'),
]
CONTENT = {
 'hook': ('HOURS ARE NOT CASH', '100 HOURS', 'PAYROLL UNCHANGED', 'Start with the financial statements.'),
 'capacity': ('SCORECARD 01: CAPACITY', '$3,600', '100 HOURS  ×  $36 PER HOUR', 'Illustrative value of time released.'),
 'software': ('SCORECARD 02: CASH', '+$400', 'MONTHLY SOFTWARE BILL', 'No spending reduction yet.'),
 'routes': ('TWO ROUTES TO VALUE', '2 ROUTES', 'REDEPLOY  /  CUT OVERTIME', 'Choose a measurable outcome.'),
 'cash': ('VERIFY CASH IMPACT', '$600', '$1,000 LESS OVERTIME  −  $400 SOFTWARE', 'Net monthly spending reduction.'),
 'guard': ('AVOID DOUBLE COUNTING', 'ONE HOUR', 'ONE VALUE CATEGORY', 'Do not book the same hour twice.'),
 'close': ('PRACTICAL AI SYSTEMS', 'PRISMBAY AI', 'MEASURE CAPACITY  /  VERIFY CASH', 'Evidence before claims.'),
}
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

def f(size, bold=False):
 return ImageFont.truetype(BOLD if bold else FONT, size)

def textfit(draw, text, max_width, start, minimum=27):
 for size in range(start, minimum-1, -2):
  face = f(size, True)
  if draw.textbbox((0, 0), text, font=face)[2] <= max_width:
   return face
 raise ValueError('Text too wide: ' + text)

def label(draw, text, y, start, color, max_width=700):
 face = textfit(draw, text, min(max_width,700), start)
 width = draw.textbbox((0, 0), text, font=face)[2]
 x = 500 - width/2
 assert x >= 125 and x + width <= 900, ('unsafe narrow mobile cover crop', text)
 draw.text((x, y), text, font=face, fill=color)

def wrap(draw, words, width, size=48):
 face = f(size, True)
 result, line = [], ''
 for word in words.split():
  candidate = (line + ' ' + word).strip()
  if line and draw.textbbox((0, 0), candidate, font=face)[2] > width:
   result.append(line)
   line = word
  else:
   line = candidate
 if line:
  result.append(line)
 return result

def card(scene, spoken, path, number):
 im = Image.new('RGB', (1080, 1920), '#071b2b')
 d = ImageDraw.Draw(im)
 d.rectangle((0, 0, 1080, 15), fill='#37d9bf')
 d.rounded_rectangle((140, 68, 206, 134), radius=16, fill='#37d9bf')
 d.text((160, 70), 'P', font=f(48, True), fill='#071b2b')
 d.text((225, 83), 'PRISMBAY AI', font=f(36, True), fill='#f3f8fa')
 d.text((842, 88), f'{number+1:02d}/12', font=f(28, True), fill='#b5d3dc')
 title, hero, detail, footer = CONTENT[scene]
 label(d, title, 250, 57, '#37d9bf')
 d.rounded_rectangle((125, 410, 880, 1190), radius=42, fill='#143349', outline='#2a6a78', width=4)
 d.rounded_rectangle((150, 465, 850, 490), radius=8, fill='#37d9bf')
 label(d, hero, 585, 157, '#ffffff', max_width=800)
 label(d, detail, 915, 48, '#f1f6fa', max_width=785)
 d.line((155, 1045, 845, 1045), fill='#3b7782', width=3)
 label(d, footer, 1080, 40, '#a5ced6', max_width=770)
 label(d, 'ILLUSTRATIVE SCENARIO', 1215, 30, '#b5cbd3')
 label(d, 'NOT REALIZED CUSTOMER SAVINGS', 1255, 30, '#b5cbd3')
 d.rounded_rectangle((125, 1310, 880, 1582), radius=34, fill='#020e1a', outline='#26616c', width=3)
 lines = wrap(d, spoken, 650, 48)
 if len(lines) > 4:
  raise ValueError(f'Caption exceeds three lines: {spoken}: {lines}')
 y = 1325 + (4-len(lines))*30
 for line in lines:
  face = f(48, True)
  width = d.textbbox((0, 0), line, font=face)[2]
  x = 500 - width/2
  assert x >= 125 and x + width <= 880 and y + 66 < 1600, ('unsafe caption', spoken)
  d.text((x, y), line, font=face, fill='#ffffff')
  y += 60
 im.save(path, optimize=True)

def main():
 source = Path(__file__).with_name('render_accepted_output_short.py')
 spec = importlib.util.spec_from_file_location('pb_shared_renderer', source)
 base = importlib.util.module_from_spec(spec)
 spec.loader.exec_module(base)
 base.PHRASES = PHRASES
 base.CONTENT = CONTENT
 base.card = card
 sys.argv = [str(source), '--voice', 'piper', '--output-dir', 'out/youtube/capacity-cash-short']
 base.main()
 out = Path('out/youtube/capacity-cash-short')
 old = out/'prismbay-ai-accepted-output-cost-short-review.mp4'
 video = out/'prismbay-ai-capacity-vs-cash-short-review.mp4'
 old.rename(video)
 manifest = json.loads((out/'manifest.json').read_text())
 assert manifest['channelId'] == CHANNEL
 assert manifest['publicationApproved'] is False and manifest['uploadPermitted'] is False
 manifest.update({
  'episodeId': EPISODE,
  'title': 'AI Saved 100 Hours. Why Did Cash Costs Rise?',
  'videoFilename': video.name,
  'sceneCount': len(CONTENT),
  'hypotheticalScenario': {
   'releasedHours': 100,
   'laborRateUSDPerHour': 36,
   'capacityValueUSD': 3600,
   'softwareCostUSDPerMonth': 400,
   'initialPayrollChangeUSD': 0,
   'cashSpendingChangeWithoutOtherChangesUSD': 400,
   'alternativeOvertimeReductionUSDPerMonth': 1000,
   'netCashReductionInAlternativeUSDPerMonth': 600,
   'note': 'Alternative scenarios, not additive. No measured customer outcomes.'
  },
  'rights': 'Original graphics and narration. No third-party clips or music.',
  'experiment': 'Capacity versus cash accounting, separate from accepted-output cost and ROI sensitivity',
 })
 (out/'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
 assert manifest['hypotheticalScenario']['capacityValueUSD'] == 100 * 36
 assert manifest['hypotheticalScenario']['netCashReductionInAlternativeUSDPerMonth'] == 1000 - 400
 print('Original capacity-versus-cash Short rendered for review, NOT published.')

if __name__ == '__main__':
 main()
