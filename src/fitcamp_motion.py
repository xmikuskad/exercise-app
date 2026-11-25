from base64 import b64encode
from functools import cache
from math import atan2, cos, hypot, pi, sin
from pathlib import Path
from subprocess import run
from tempfile import TemporaryDirectory

from PIL import Image, ImageDraw, ImageFont

from fitcamp_art import POSES as ORIGINAL_POSES, render as render_original
from fitcamp_catalog_art import POSES as NEW_POSES, TOP_VIEW, render as render_catalog


WIDTH, HEIGHT, FPS = 432, 264, 15
WORK = Path(__file__).resolve().parent
BACKGROUND = '#ecf4f2'
TEXT = '#193548'
ACCENT = '#007c69'
FONT = ImageFont.load_default(size=19)

# Angle interpolation keeps motions such as curls arcing around their joint.
# Each pair is (moving point, joint) in the corresponding illustrated pose.
ARCS = {
    'curl': ((6,5),(7,6)), 'pronecurl': ((6,5),(7,6)), 'extension': ((6,5),(7,6)),
    'deadbug': ((3,1),(4,3)), 'lat': ((3,1),(4,3)),
    'calfstanding': ((6,7),), 'calfseated': ((6,7),),
    'straightpull': ((3,1),(4,3)), 'lateral': ((3,1),(4,3)),
    'biceps': ((4,3),), 'hammer': ((4,3),), 'pushdown': ((4,3),), 'overhead': ((4,3),),
    'singlecalf': ((6,7),), 'cablecurl': ((4,3),), 'preacher': ((4,3),), 'singletricep': ((4,3),),
}

PRACTICE_CAPTIONS = {
    'press': 'Sleduj, ako sa kolená pokrčia a takmer vystrú. Chodidlá zostávajú na plošine.',
    'sit': 'Sleduj mierny predklon pri vstávaní a pomalé dosadnutie.',
    'goblet': 'Činka zostáva pri hrudníku, zatiaľ čo sa ohýbajú bedrá a kolená.',
    'split': 'Sleduj, ako sa pri poklese ohýbajú obe kolená. Potom vymeň nohy.',
    'extension': 'Koleno zostáva pri osi stroja a predkolenie dvíha valec.',
    'curl': 'Päty idú pod sedadlo. Stehná ostávajú pod hornou opierkou.',
    'bridge': 'Panva sa zdvihne, zatiaľ čo ramená a chodidlá zostávajú na podložke.',
    'pronecurl': 'Sleduj oblúk päty. Panva zostáva opretá o lavičku.',
    'hipthrust': 'Sleduj boky a pevnú oporu lopatiek o lavičku.',
    'abduction': 'Pohľad spredu. Kolená sa od seba vzdialia, trup ostáva pokojný.',
    'calfstanding': 'Predná časť chodidiel zostáva na zemi, päty sa pomaly zdvihnú a vrátia.',
    'calfseated': 'Sleduj päty. Pri pohybe ostávajú kolená pokrčené pod opierkou.',
    'chest': 'Sleduj dráhu rukovätí dopredu a pomalý návrat k hrudníku.',
    'push': 'Hrudník sa približuje k opore. Telo drž v jednej línii a chodidlá opri o podlahu.',
    'dbpress': 'Z bočného pohľadu vidíš jednu činku. Tlaky robíš oboma rukami naraz.',
    'incline': 'Sleduj smer tlaku nad ramená a návrat k hornej časti hrudníka.',
    'row': 'Lakeť ide dozadu a trup sa pri príťahu nehojdá.',
    'lat': 'Sleduj lakeť smerujúci dole. Tyč ide pred tvárou.',
    'dbrow': 'Oporná dlaň ostáva na lavičke. Po sérii vymeň strany.',
    'supportedrow': 'Hrudník ostáva na opierke. Obe ruky sa pohybujú spolu.',
    'straightpull': 'Sleduj oblúk rúk od výšky ramien k stehnám pri miernom ohnutí lakťov.',
    'shoulderpress': 'Sleduj zdvih z úrovne ramien. Chrbát zostáva opretý.',
    'lateral': 'Pohľad spredu. Obe ruky končia približne na úrovni ramien alebo nižšie.',
    'reversefly': 'Pohľad spredu. Ruky sa otvárajú do strán s malým ohnutím lakťov.',
    'facepull': 'Pohľad zhora. Konce lana smerujú k stranám tváre a lakte sa otvárajú von.',
    'biceps': 'Sleduj ohyb lakťa. Nadlaktie a trup zostávajú približne na mieste.',
    'hammer': 'Dlane smerujú k sebe, činka sa pri zdvihu nepretáča.',
    'pushdown': 'Hýbe sa najmä predlaktie. Lakeť ostáva pri boku.',
    'overhead': 'Nadlaktie drž približne v rovnakom smere, predlaktie sa vystiera vpred.',
    'deadbug': 'Ukážka jednej strany. Po návrate vystri opačnú dvojicu ruky a nohy.',
    'plank': 'Ľahšia výdrž na kolenách. Po zdvihnutí bokov pokojne dýchaj v stabilnej polohe.',
    'sideplank': 'Zdvihni bok, chvíľu pokojne dýchaj a po návrate vymeň strany.',
    'birddog': 'Ukážka jednej strany. Vystri ruku a opačnú nohu, potom strany vymeň.',
    'pallof': 'Pohľad zhora. Kladka ťahá zo strany, telo zostáva otočené v smere šípky.',
    'hack': 'Päty ostávajú na plošine. Pred prvým použitím sa oboznám s poistkami konkrétneho stroja.',
    'stepup': 'Sleduj nohu na stupienku. Tlačí pri výstupe a brzdí zostup.',
    'cablekick': 'Oporná noha zostáva na mieste. Pracovná ide iba kúsok dozadu bez záklonu.',
    'singlecalf': 'Jedno chodidlo je na podlahe, druhá noha je voľná. Ruka pomáha s rovnováhou.',
    'pecdeck': 'Pohľad zhora. Obe ruky sa stretnú pred hrudníkom s mierne ohnutými lakťami.',
    'cablefly': 'Pohľad zhora. Lano ťahá zo strán a dlane sa stretnú pred hrudníkom.',
    'assistpull': 'Podložka sa hýbe s kolenami. Viac dopomoci zvyčajne znamená ľahšie opakovanie.',
    'dbshoulder': 'Bočný pohľad. Tlač oboma činkami a nechaj chrbát na opierke.',
    'cablecurl': 'Sleduj lakeť pri tele. Hmotnosť pri návrate brzdí predlaktie.',
    'preacher': 'Nadlaktie leží stále na šikmej opierke. Opakuj aj druhou rukou.',
    'singletricep': 'Drž lakeť vedľa tela. Po sérii vymeň strany.',
    'reversecrunch': 'Pohyb začína podsadením panvy a končí krátkym odlepením kostrče.',
    'bodyweightsquat': 'Celé chodidlo zostáva na podlahe a kolená sledujú smer špičiek.',
    'reverselunge': 'Predná noha ostáva na mieste. Po návrate vymeň strany.',
    'floorpush': 'Hrudník a boky sa spúšťajú spolu. Dlane aj špičky zostávajú na mieste.',
    'bandrow': 'Sleduj lakeť smerujúci dozadu. Pri návrate brzdi ťah gumy.',
    'proney': 'Ruky drž šikmo v tvare Y, ako ukazuje online video. Zdvih je malý a trup zostáva na podložke.',
}


def blend(a, b, fraction):
    return a + (b - a) * fraction


def between(first, second, fraction):
    return tuple(blend(a, b, fraction) for a, b in zip(first, second))


def articulate(key, start, end, fraction):
    points = [between(first, second, fraction) for first, second in zip(start, end)]
    for point, joint in ARCS.get(key, ()):
        ax, ay = (a - b for a, b in zip(start[point], start[joint]))
        bx, by = (a - b for a, b in zip(end[point], end[joint]))
        angle = atan2(ay, ax)
        difference = (atan2(by, bx) - angle + pi) % (2 * pi) - pi
        angle += difference * fraction
        length = blend(hypot(ax, ay), hypot(bx, by), fraction)
        x, y = points[joint]
        points[point] = (x + length * cos(angle), y + length * sin(angle))
    return [tuple(round(value) for value in point) for point in points]


def sequence(key):
    # Phases use discrete labels while joint positions ease at each change.
    if key == 'shoulderwarm':
        stages = ((5,0,0,'Začiatočná poloha'), (28,0,1,'Kruh dozadu'), (28,0,-1,'Kruh dopredu'))
    elif key == 'plank':
        stages = ((7,0,0,'Začiatočná poloha'), (15,0,1,'Zdvihni boky'), (53,1,1,'Výdrž · plynulo dýchaj'))
    elif key == 'sideplank':
        stages = ((7,0,0,'Začiatočná poloha'), (15,0,1,'Zdvihni bok'), (28,1,1,'Výdrž'),
                  (20,1,0,'Pomaly späť'), (5,0,0,'Začiatočná poloha'))
    else:
        stages = ((7,0,0,'Začiatočná poloha'), (17,0,1,'Pohyb'), (8,1,1,'Koncová poloha'),
                  (24,1,0,'Pomaly späť'), (5,0,0,'Začiatočná poloha'))
    for count, start, end, label in stages:
        for frame in range(count):
            eased = (1 - cos(pi * (frame + 1) / count)) / 2
            yield blend(start, end, eased), label


def video_frame(key, fraction, label, progress):
    if key in TOP_VIEW:
        body = render_catalog(key, [(None,fraction)])
    elif key == 'shoulderwarm':
        angle = 2 * pi * fraction
        dx = round(8 * sin(angle))
        dy = round(7 * (cos(angle) - 1))
        pose = ((108,35),(113+dx,62+dy),(108,102),(114+dx,86+dy),
                (117+dx,110+dy),(108,131),(107,155),(126,155))
        body = render_catalog(key, [(pose,fraction)])
    else:
        start, end = (NEW_POSES | ORIGINAL_POSES)[key]
        if key == 'plank':
            end = start
            start = ((158,108),(137,115),(93,142),*end[3:])
        pose = articulate(key, start, end, fraction)
        body = render_original(key, [pose]) if key in ORIGINAL_POSES else render_catalog(key, [(pose,fraction)])

    frame = Image.new('RGB', (WIDTH, HEIGHT), BACKGROUND)
    frame.paste(body.resize((270,225), Image.Resampling.LANCZOS), (81,36))
    draw = ImageDraw.Draw(frame)
    draw.text((WIDTH / 2,22), label, font=FONT, fill=TEXT, anchor='mm')
    draw.rounded_rectangle((18,39,WIDTH-18,43), radius=2, fill='#cbded7')
    draw.rounded_rectangle((18,39,18+round((WIDTH-36)*progress),43), radius=2, fill=ACCENT)
    return frame


@cache
def video_data(key):
    stages = list(sequence(key))
    frames = b''.join(video_frame(key, position, label, index / (len(stages) - 1)).tobytes()
                      for index, (position, label) in enumerate(stages))
    with TemporaryDirectory(dir=WORK) as scratch:
        target = Path(scratch) / 'clip.mp4'
        run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-f', 'rawvideo', '-pixel_format', 'rgb24',
             '-video_size', f'{WIDTH}x{HEIGHT}', '-framerate', str(FPS), '-i', 'pipe:0', '-an',
             '-c:v', 'libx264', '-profile:v', 'baseline', '-pix_fmt', 'yuv420p', '-crf', '23',
             '-movflags', '+faststart', '-threads', '1', str(target)], input=frames, check=True)
        return 'data:video/mp4;base64,' + b64encode(target.read_bytes()).decode('ascii')
