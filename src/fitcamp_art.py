from base64 import b64encode
from io import BytesIO
from PIL import Image, ImageDraw

# Side views, in order: head, shoulder, hip, elbow, hand, knee, heel, toe.
POSES = {
    'press': [
        [(66,46),(77,66),(103,112),(82,93),(105,100),(140,81),(171,112),(178,94)],
        [(39,46),(50,66),(76,112),(55,93),(78,100),(126,105),(171,112),(178,94)]],
    'chest': [
        [(79,42),(84,62),(82,112),(81,91),(106,75),(127,112),(124,155),(143,155)],
        [(79,42),(84,62),(82,112),(115,72),(143,74),(127,112),(124,155),(143,155)]],
    'row': [
        [(83,42),(87,63),(87,112),(121,77),(156,83),(131,112),(158,148),(170,139)],
        [(83,42),(87,63),(87,112),(63,87),(101,87),(131,112),(158,148),(170,139)]],
    'curl': [
        [(76,42),(80,63),(82,105),(89,89),(112,91),(130,105),(170,111),(174,99)],
        [(76,42),(80,63),(82,105),(89,89),(112,91),(130,105),(110,147),(127,151)]],
    'deadbug': [
        [(48,128),(69,136),(120,138),(72,107),(74,78),(120,101),(153,101),(155,88)],
        [(48,128),(69,136),(120,138),(46,128),(22,124),(158,130),(191,134),(194,122)]],
    'lat': [
        [(97,62),(99,81),(107,123),(120,52),(133,21),(146,123),(150,157),(169,157)],
        [(97,62),(99,81),(107,123),(117,106),(134,76),(146,123),(150,157),(169,157)]],
    'bridge': [
        [(43,134),(65,143),(119,144),(89,148),(117,150),(146,110),(159,152),(177,152)],
        [(43,134),(65,143),(109,114),(89,148),(117,150),(146,91),(159,152),(177,152)]],
    'sit': [
        [(103,64),(100,83),(76,121),(119,100),(139,102),(122,120),(118,156),(136,156)],
        [(119,30),(120,49),(120,95),(135,72),(155,71),(122,123),(118,156),(136,156)]],
    'push': [
        [(128,50),(117,70),(85,106),(145,88),(166,105),(59,132),(40,155),(55,159)],
        [(155,59),(141,77),(103,108),(126,98),(166,105),(71,133),(43,154),(56,158)]],
    'dbrow': [
        [(155,52),(136,66),(85,83),(135,96),(137,125),(93,122),(87,157),(104,157)],
        [(155,52),(136,66),(85,83),(103,57),(109,85),(93,122),(87,157),(104,157)]],
}

PALE = '#cfdae0'
METAL = '#647b88'
GRIP = '#465c68'
INK = '#193548'
TEAL = '#007c69'


def render(key, poses):
    img = Image.new('RGB', (216 * len(poses), 180), '#ecf4f2')
    d = ImageDraw.Draw(img)
    for index, pose in enumerate(poses):
        offset = index * 216

        def point(p):
            return (p[0] + offset, p[1])

        def line(*points, width=5, color=METAL):
            pts = [point(p) for p in points]
            d.line(pts, fill=color, width=width, joint='curve')
            radius = width // 2
            for x, y in pts:
                d.ellipse((x-radius, y-radius, x+radius, y+radius), fill=color)

        def dot(xy, radius, color):
            x, y = point(xy)
            d.ellipse((x-radius, y-radius, x+radius, y+radius), fill=color)

        head, shoulder, hip, elbow, hand, knee, heel, toe = pose
        line((14,163),(201,163),width=2,color=PALE)
        if key == 'press':
            x = hip[0]
            line((23,148),(189,148),(191,121))
            line((x-34,68),(x-5,119),(x+19,119),width=10)
            line((178,121),(192,78),width=10,color=GRIP)
        elif key in ('chest','row','curl','lat'):
            line((65,159),(185,159),width=5)
            line((88,153),(88,hip[1]+9),width=8)
            line((hip[0]-11,hip[1]+9),(hip[0]+24,hip[1]+9),width=9)
            if key == 'chest':
                line((70,115),(70,63),width=9)
                line((178,154),(178,24),(116,24),width=6)
                line((116,24),hand,width=4,color=PALE)
            if key == 'row':
                line((192,156),(192,70),(181,70),width=9)
                line((191,83),hand,width=2,color=GRIP)
                line((150,156),(177,133),width=7)
            if key == 'curl':
                line((67,109),(67,64),width=8)
                line((103,98),(119,98),width=10,color=GRIP)
                line(knee,(heel[0]+3,heel[1]+5),width=4,color=PALE)
                dot((heel[0]+3,heel[1]+5),7,GRIP)
            if key == 'lat':
                line((193,155),(193,12),(124,12),width=5)
                line((125,12),hand,width=2,color=GRIP)
                line((120,111),(141,111),width=9,color=GRIP)
        elif key in ('deadbug','bridge'):
            line((21,154),(199,154),width=5,color=METAL)
        elif key == 'sit':
            line((38,131),(90,131),width=9)
            line((45,134),(45,157),width=6)
            line((81,134),(81,157),width=6)
        elif key == 'push':
            line((164,110),(197,110),width=9)
            line((174,114),(174,158),width=8)
            line((194,114),(194,158),width=8)
        elif key == 'dbrow':
            line((137,113),(198,113),width=8)
            line((152,118),(152,152),width=7)
            line((189,118),(189,152),width=7)
            line(shoulder,(157,90),(175,109),width=7,color=METAL)
        if key == 'deadbug':
            line((72,135),(81,105),(83,78),width=7,color=METAL)
            line((124,138),(127,98),(159,98),(161,84),width=8,color=METAL)
        if key in ('lat','row','chest'):
            line((hand[0]-6,hand[1]),(hand[0]+7,hand[1]),width=6,color=GRIP)
        if key == 'dbrow':
            line((hand[0]-10,hand[1]+5),(hand[0]+10,hand[1]+5),width=5,color=GRIP)
            line((hand[0]-10,hand[1]-1),(hand[0]-10,hand[1]+11),width=5,color=GRIP)
            line((hand[0]+10,hand[1]-1),(hand[0]+10,hand[1]+11),width=5,color=GRIP)
        line(head,shoulder,width=7,color=INK)
        line(shoulder,hip,width=13,color=INK)
        line(shoulder,elbow,hand,width=7,
             color=TEAL if key in ('chest','row','deadbug','lat','push','dbrow') else INK)
        line(hip,knee,heel,toe,width=8,
             color=TEAL if key in ('press','curl','deadbug','bridge','sit') else INK)
        dot(head,11,INK)
        for joint in (shoulder, hip, elbow, knee):
            dot(joint, 2, '#f5fffb')

    if len(poses) > 1:
        d.line((216,9,216,169), fill='#c9dcda', width=1)
    return img


def diagram(key):
    img = render(key, POSES[key])
    buffer = BytesIO()
    img.save(buffer, 'PNG', optimize=True)
    return 'data:image/png;base64,' + b64encode(buffer.getvalue()).decode('ascii')
