"""Reproducible RGBA application assets, no network or external artwork."""
from pathlib import Path
from PIL import Image, ImageDraw
folder = Path(__file__).resolve().parent
im = Image.new('RGBA', (512,512), (0,0,0,0))
draw = ImageDraw.Draw(im)
draw.rounded_rectangle((8,8,504,504), radius=112, fill='#1B8A70')
draw.line([(114,252),(256,125),(398,252)], fill='white', width=35, joint='curve')
draw.rounded_rectangle((151,224,361,386),radius=24,outline='white',width=31)
draw.rounded_rectangle((230,285,282,402),radius=15,fill='white')
for size in (32,128,256):
    im.resize((size,size), Image.Resampling.LANCZOS).save(folder / f'{size}x{size}.png')
im.save(folder / 'icon.ico', sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
