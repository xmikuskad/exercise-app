from pathlib import Path

from PIL import Image, ImageDraw

from fitcamp_catalog import EXERCISES
from fitcamp_motion import video_frame

keys = [*EXERCISES, 'anklerock', 'squatwarm', 'shoulderwarm', 'scapwarm']
output = Path(__file__).resolve().parent.parent / '.test-artifacts'
output.mkdir(exist_ok=True)
for group, start in enumerate(range(0, len(keys), 10), start=1):
    sheet = Image.new('RGB', (672, 590), 'white')
    draw = ImageDraw.Draw(sheet)
    for index, key in enumerate(keys[start:start + 10]):
        x = 6 + (index % 2) * 336
        y = 4 + (index // 2) * 116
        draw.text((x, y), key, fill='#193548')
        for column, phase in enumerate((0, .35 if key == 'shoulderwarm' else 1)):
            image = video_frame(key, phase, '', phase)
            sheet.paste(image.resize((158, 96), Image.Resampling.LANCZOS), (x + column * 160, y + 14))
    sheet.save(output / f'fitcamp-audit-{group}.png')
