from base64 import b64encode
from io import BytesIO

from PIL import Image, ImageDraw


# One half of each silhouette. Mirrored poses and filled regions are original.
OUTLINE = (
    (100,12),(115,14),(124,23),(126,42),(125,56),(119,68),(114,74),
    (117,81),(134,85),(149,91),(157,104),(161,126),(164,151),
    (170,169),(174,187),(176,208),(181,217),(180,230),(173,238),
    (167,234),(164,220),(158,207),(153,193),(150,175),(147,158),
    (142,140),(136,147),(132,163),(130,182),(136,202),(141,222),
    (141,249),(138,271),(133,292),(134,309),(135,329),(131,350),
    (127,367),(129,378),(139,387),(137,394),(115,394),(110,388),
    (111,369),(108,347),(106,328),(107,310),(109,291),(107,270),
    (103,252),(100,239),
)

FRONT = (
    ('dfront', [(126,89),(141,91),(149,98),(149,110),(141,124),(134,123),(132,105)]),
    ('dside', [(145,92),(154,99),(158,113),(155,126),(148,124),(146,110)]),
    ('pec', [(101,89),(117,88),(131,93),(138,105),(138,116),(127,126),(112,128),(102,122)]),
    ('serr', [(129,127),(139,122),(139,136),(135,151),(128,157),(127,146)]),
    ('biceps', [(148,122),(155,120),(161,131),(162,147),(158,160),(152,154),(148,142)]),
    ('brad', [(161,153),(166,164),(170,182),(170,201),(166,195),(161,181),(157,166)]),
    ('rectus', [(102,130),(115,130),(122,139),(121,163),(119,197),(111,211),(101,215)]),
    ('oblique', [(122,139),(132,147),(132,160),(128,179),(131,197),(121,207),(118,193),(121,168)]),
    ('add', [(103,227),(114,216),(119,222),(117,242),(111,263),(107,268),(104,249)]),
    ('quad', [(117,215),(130,208),(137,220),(139,239),(136,260),(130,278),(126,289),(118,285),(113,275),(111,260),(118,239)]),
    ('tfl', [(124,191),(132,195),(137,211),(130,220),(124,211),(122,198)]),
)
BACK = (
    ('trap', [(101,78),(114,83),(131,86),(141,92),(131,101),(120,111),(110,132),(102,148)]),
    ('drear', [(135,91),(147,92),(157,105),(157,120),(149,125),(139,118),(133,105)]),
    ('dside', [(150,95),(158,104),(160,118),(155,130),(150,126),(152,110)]),
    ('rotator', [(123,107),(134,105),(142,112),(141,124),(132,131),(120,124)]),
    ('teres', [(132,129),(140,121),(141,135),(136,143),(128,140)]),
    ('lat', [(102,146),(112,131),(125,128),(133,139),(135,151),(129,169),(122,183),(116,194),(110,179),(106,164)]),
    ('triceps', [(149,121),(155,121),(161,129),(162,144),(160,157),(154,157),(150,148),(146,132)]),
    ('brad', [(161,156),(167,168),(170,190),(169,204),(164,195),(160,178),(157,164)]),
    ('erector', [(101,137),(107,148),(111,167),(116,191),(114,205),(107,211),(101,193)]),
    ('gmed', [(119,188),(131,194),(137,207),(136,221),(127,218),(120,207)]),
    ('gmax', [(102,207),(111,202),(122,203),(132,213),(139,226),(137,240),(129,250),(117,250),(106,242),(101,232)]),
    ('ham', [(106,249),(117,254),(129,249),(137,246),(135,267),(130,287),(127,297),(119,292),(113,283),(108,265)]),
    ('gast', [(116,300),(127,299),(133,309),(134,325),(129,340),(120,346),(111,342),(109,329),(111,310)]),
    ('soleus', [(112,326),(120,340),(131,330),(129,352),(125,365),(117,365),(114,350)]),
)

BACKGROUND = '#eef3f1'
OUTLINE_COLOR = '#829494'
BODY = '#dce5e3'
BOUNDARY = '#aabbb8'
DETAIL = '#f0f5f3'
PRIMARY = '#007597'
SUPPORT = '#9dd6e6'


def smooth(points):
    """Interpolate the authored landmarks into a closed, gently curved contour."""
    line = []
    for index, (x, y) in enumerate(points):
        a, b = points[index - 1], (x, y)
        c, d = points[(index + 1) % len(points)], points[(index + 2) % len(points)]
        for step in range(4):
            t = step / 4
            line.append(tuple(
                (2*q + (-p+r)*t + (2*p-5*q+4*r-s)*t*t + (-p+3*q-3*r+s)*t*t*t)/2
                for p, q, r, s in zip(a, b, c, d)
            ))
    return line


def body_geometry():
    silhouettes, regions, details = [], [], []
    for index, parts in enumerate((FRONT, BACK)):
        offset = 25 + index * 230

        def transform(points):
            return [(round(x + offset), round(y + 4)) for x, y in points]

        def mirrored(points):
            return [(200 - x, y) for x, y in points]

        silhouette = transform(smooth([*OUTLINE, *mirrored(OUTLINE[-2:0:-1])]))
        silhouettes.append(silhouette)
        for code, outline in parts:
            for region in (outline, mirrored(outline)):
                regions.append((code, transform(smooth(region))))
        lines = (
            (((103,151),(116,152)), ((104,170),(115,171)), ((104,188),(113,189)),
             ((119,226),(125,244),(123,266)), ((147,135),(154,151)))
            if index == 0 else
            (((103,224),(112,219),(124,221)), ((107,230),(121,228),(130,233)),
             ((114,253),(118,268),(122,283)), ((122,306),(120,323),(121,337)))
        )
        for segment in lines:
            details.extend([transform(segment), transform(mirrored(segment))])
    return silhouettes, regions, details


SILHOUETTES, REGIONS, DETAILS = body_geometry()


def body_map(main, secondary):
    image = Image.new('RGB', (480, 420), BACKGROUND)
    draw = ImageDraw.Draw(image)
    for path in SILHOUETTES:
        draw.polygon(path, fill=BODY)
        draw.line([*path, path[0]], fill=OUTLINE_COLOR, width=2)
    for code, path in REGIONS:
        color = PRIMARY if code in main else SUPPORT if code in secondary else '#c9d6d4'
        draw.polygon(path, fill=color)
        draw.line([*path, path[0]], fill=BOUNDARY if color == '#c9d6d4' else DETAIL, width=1)
    for path in DETAILS:
        draw.line(path, fill=DETAIL, width=1)

    draw.line((240,22,240,398), fill='#cddeD9', width=1)
    buffer = BytesIO()
    image.save(buffer, 'PNG', optimize=True)
    return 'data:image/png;base64,' + b64encode(buffer.getvalue()).decode('ascii')


def live_body_map():
    return {
        'base': body_map((), ()),
        'regions': REGIONS,
        'details': DETAILS,
        'primary': PRIMARY,
        'support': SUPPORT,
    }
