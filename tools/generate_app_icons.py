"""Generate square app icons for every game from its store cover."""
import json
from PIL import Image
import os

SRC = 'icons/covers'
DST = 'icons/apps'
os.makedirs(DST, exist_ok=True)

games = json.load(open('tools/catalog.json', encoding='utf-8'))
for g in games:
    cid = g['id']
    path = f'{SRC}/{cid}.png'
    if not os.path.exists(path):
        print('MISSING COVER:', cid)
        continue
    img = Image.open(path).convert('RGB')
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    square = img.crop((left, top, left + side, top + side))
    # slightly rounded corners by pasting onto dark background with rounded mask
    for size in (192, 512):
        icon = square.resize((size, size), Image.LANCZOS)
        icon.save(f'{DST}/{cid}-{size}.png', optimice=True)
print('done:', len(os.listdir(DST)), 'icons')
