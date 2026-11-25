from base64 import b64encode
from io import BytesIO
from PIL import Image, ImageDraw

# Each frame describes the near-side head, shoulder, hip, elbow, hand, knee,
# ankle and toe. A second limb is added when it explains the movement.
POSES = {
    'goblet': (
        ((102,27),(103,48),(101,96),(118,82),(120,57),(105,126),(102,155),(122,155)),
        ((107,59),(107,79),(75,116),(121,107),(127,87),(119,117),(103,155),(123,155))),
    'split': (
        ((107,32),(108,52),(104,96),(134,64),(161,58),(127,123),(142,155),(160,155)),
        ((113,60),(114,80),(109,121),(137,83),(161,74),(148,121),(144,155),(163,155))),
    'extension': (
        ((78,41),(82,61),(88,106),(99,88),(113,110),(132,106),(133,149),(150,151)),
        ((78,41),(82,61),(88,106),(99,88),(113,110),(132,106),(179,108),(179,92))),
    'pronecurl': (
        ((43,109),(65,108),(111,109),(58,132),(35,132),(151,115),(191,116),(198,128)),
        ((43,109),(65,108),(111,109),(58,132),(35,132),(151,115),(133,74),(143,65))),
    'hipthrust': (
        ((62,79),(74,97),(113,137),(110,114),(126,121),(154,110),(156,155),(176,155)),
        ((53,79),(72,97),(115,106),(103,104),(119,104),(152,107),(156,155),(176,155))),
    'abduction': (
        ((108,37),(125,57),(108,107),(134,85),(140,117),(125,117),(130,151),(138,156)),
        ((108,37),(125,57),(108,107),(134,85),(147,110),(159,108),(156,149),(172,154))),
    'calfstanding': (
        ((93,33),(95,53),(95,96),(121,78),(161,77),(96,126),(95,155),(115,155)),
        ((98,24),(99,44),(100,87),(128,74),(161,77),(103,116),(103,145),(115,155))),
    'calfseated': (
        ((75,42),(77,61),(81,107),(101,84),(134,104),(125,108),(131,151),(154,147)),
        ((75,42),(77,61),(81,107),(101,84),(134,100),(125,102),(136,135),(154,147))),
    'dbpress': (
        ((49,98),(72,103),(121,107),(88,111),(88,81),(148,110),(154,155),(172,155)),
        ((49,98),(72,103),(121,107),(72,74),(72,44),(148,110),(154,155),(172,155))),
    'incline': (
        ((48,76),(70,91),(113,116),(87,106),(87,76),(142,118),(143,155),(161,155)),
        ((48,76),(70,91),(113,116),(71,63),(71,35),(142,118),(143,155),(161,155))),
    'supportedrow': (
        ((157,46),(139,63),(92,94),(139,93),(140,122),(74,125),(55,155),(75,155)),
        ((157,46),(139,63),(92,94),(108,54),(122,81),(74,125),(55,155),(75,155))),
    'straightpull': (
        ((98,38),(99,58),(83,98),(124,53),(151,48),(94,128),(91,155),(109,155)),
        ((98,38),(99,58),(83,98),(106,78),(106,104),(94,128),(91,155),(109,155))),
    'shoulderpress': (
        ((85,50),(87,70),(84,118),(111,77),(113,48),(128,118),(130,156),(149,156)),
        ((85,50),(87,70),(84,118),(94,42),(93,17),(128,118),(130,156),(149,156))),
    'lateral': (
        ((108,34),(127,55),(108,103),(132,82),(138,104),(122,130),(124,155),(134,155)),
        ((108,34),(127,55),(108,103),(156,63),(181,71),(122,130),(124,155),(134,155))),
    'reversefly': (
        ((108,35),(125,54),(108,102),(131,65),(134,73),(125,120),(128,155),(138,155)),
        ((108,35),(125,54),(108,102),(153,53),(180,55),(125,120),(128,155),(138,155))),
    'biceps': (
        ((101,32),(102,53),(100,102),(108,79),(112,109),(104,130),(101,155),(120,155)),
        ((101,32),(102,53),(100,102),(108,79),(123,56),(104,130),(101,155),(120,155))),
    'hammer': (
        ((101,32),(102,53),(100,102),(108,79),(112,109),(104,130),(101,155),(120,155)),
        ((101,32),(102,53),(100,102),(108,79),(123,56),(104,130),(101,155),(120,155))),
    'pushdown': (
        ((105,33),(102,53),(91,98),(106,83),(131,70),(96,129),(92,155),(110,155)),
        ((105,33),(102,53),(91,98),(106,83),(109,110),(96,129),(92,155),(110,155))),
    'overhead': (
        ((117,50),(106,66),(85,99),(132,50),(112,34),(108,128),(124,155),(143,155)),
        ((117,50),(106,66),(85,99),(132,50),(157,34),(108,128),(124,155),(143,155))),
    'plank': (
        ((158,99),(137,106),(101,120),(137,151),(170,151),(61,151),(29,153),(18,150)),
        ((158,99),(137,106),(101,120),(137,151),(170,151),(64,132),(32,143),(30,155))),
    'sideplank': (
        ((51,93),(72,112),(116,149),(72,152),(42,152),(158,151),(172,131),(188,133)),
        ((48,80),(72,98),(116,125),(72,152),(42,152),(158,151),(172,131),(188,133))),
    'birddog': (
        ((152,86),(134,101),(78,102),(132,124),(130,151),(79,150),(47,150),(36,151)),
        ((152,86),(134,101),(78,102),(159,97),(186,96),(55,97),(31,98),(23,104))),
    'anklerock': (
        ((106,36),(108,56),(104,96),(102,77),(115,96),(143,115),(151,154),(168,154)),
        ((117,38),(119,58),(116,99),(113,79),(127,99),(160,115),(151,154),(168,154))),
    'squatwarm': (
        ((102,27),(103,48),(101,96),(121,65),(142,70),(105,126),(102,155),(122,155)),
        ((107,52),(106,73),(78,111),(130,82),(153,87),(120,112),(103,155),(123,155))),
    'reverselunge': (
        ((122,26),(122,47),(120,98),(126,73),(140,90),(122,126),(121,152),(140,154)),
        ((111,51),(113,72),(105,121),(120,96),(134,114),(130,119),(121,152),(140,154))),
    'floorpush': (
        ((159,87),(143,98),(101,113),(144,126),(145,151),(67,131),(41,145),(39,154)),
        ((163,118),(146,127),(101,135),(122,139),(145,151),(66,143),(41,147),(39,154))),
    'bandrow': (
        ((73,67),(78,86),(82,146),(110,96),(145,107),(125,128),(163,150),(170,136)),
        ((73,67),(78,86),(82,146),(57,110),(96,110),(125,128),(163,150),(170,136))),
    'proney': (
        ((153,138),(132,142),(83,145),(157,147),(185,149),(54,147),(31,148),(23,153)),
        ((153,138),(132,142),(83,145),(157,131),(185,119),(54,147),(31,148),(23,153))),
    'toeraise': (
        ((99,33),(101,53),(100,99),(121,76),(157,73),(102,123),(101,153),(122,154)),
        ((99,33),(101,53),(100,99),(121,76),(157,73),(102,123),(101,153),(119,143))),
    'hipadduction': (
        ((30,130),(53,141),(103,144),(52,151),(24,150),(145,148),(179,150),(188,144)),
        ((30,130),(53,141),(103,144),(52,151),(24,150),(143,138),(177,131),(185,124))),
    'scapwarm': (
        ((153,88),(135,103),(83,103),(135,128),(135,153),(83,150),(52,151),(40,151)),
        ((153,97),(135,112),(83,103),(135,132),(135,153),(83,150),(52,151),(40,151))),
    'hack': (
        ((91,56),(103,74),(126,116),(119,86),(116,69),(156,107),(149,144),(166,148)),
        ((61,28),(74,48),(99,91),(96,69),(91,50),(127,116),(149,144),(166,148))),
    'stepup': (
        ((96,40),(98,60),(89,102),(117,80),(127,82),(131,107),(146,126),(163,126)),
        ((125,17),(127,37),(140,76),(145,57),(152,66),(144,103),(146,126),(163,126))),
    'cablekick': (
        ((127,36),(124,55),(106,100),(147,77),(173,72),(108,130),(105,155),(121,152)),
        ((127,36),(124,55),(106,100),(147,77),(173,72),(84,125),(68,147),(85,148))),
    'assistpull': (
        ((93,67),(99,86),(100,121),(112,62),(125,22),(126,144),(155,143),(159,132)),
        ((91,27),(98,49),(100,91),(114,64),(125,22),(126,114),(155,113),(159,102))),
    'preacher': (
        ((69,40),(78,58),(76,111),(113,86),(141,108),(116,110),(117,155),(136,155)),
        ((69,40),(78,58),(76,111),(113,86),(111,53),(116,110),(117,155),(136,155))),
    'reversecrunch': (
        ((40,132),(62,144),(118,146),(80,151),(109,151),(119,101),(155,100),(156,88)),
        ((40,132),(62,144),(110,137),(80,151),(109,151),(95,98),(130,92),(130,80))),
}
POSES['singlecalf'] = POSES['calfstanding']
POSES['dbshoulder'] = POSES['shoulderpress']
POSES['cablecurl'] = POSES['biceps']
POSES['singletricep'] = POSES['pushdown']
POSES['bodyweightsquat'] = POSES['squatwarm']

FRONT = {'lateral', 'reversefly', 'abduction'}
LEG = {'goblet', 'split', 'extension', 'pronecurl', 'hipthrust', 'abduction', 'calfstanding', 'calfseated',
       'anklerock', 'squatwarm', 'hack', 'stepup', 'cablekick', 'singlecalf', 'bodyweightsquat', 'reverselunge', 'toeraise'}
FLOOR = {'plank', 'sideplank', 'birddog', 'scapwarm', 'reversecrunch', 'floorpush', 'bandrow', 'proney', 'hipadduction'}
DUMBBELLS = {'goblet', 'dbpress', 'incline', 'supportedrow', 'lateral', 'biceps', 'hammer', 'dbshoulder', 'preacher'}
TOP_VIEW = {'pallof', 'facepull', 'pecdeck', 'cablefly'}


def render(key, frames):
    image = Image.new('RGB', (216 * len(frames), 180), '#ecf4f2')
    draw = ImageDraw.Draw(image)
    ink, teal, equipment, light = '#193548', '#007c69', '#657e89', '#a0b9bc'

    for index, (pose, phase) in enumerate(frames):
        offset = index * 216

        def dot(p, radius, color):
            x, y = p
            draw.ellipse((x+offset-radius, y-radius, x+offset+radius, y+radius), fill=color)

        def line(*points, color=equipment, width=5):
            draw.line([(x+offset, y) for x, y in points], fill=color, width=width, joint='curve')
            for p in points:
                dot(p, width // 2, color)

        def bench(start, end):
            line(start, end, width=9)
            for x, y in (start, end):
                line((x,y), (x,157), width=5, color=light)

        def db(p, vertical=False):
            x, y = p
            if vertical:
                line((x,y-10),(x,y+10),width=4)
                line((x-6,y-10),(x+6,y-10),width=5)
                line((x-6,y+10),(x+6,y+10),width=5)
            else:
                line((x-10,y),(x+10,y),width=4)
                line((x-10,y-6),(x-10,y+6),width=5)
                line((x+10,y-6),(x+10,y+6),width=5)

        if key == 'pallof':
            # Overhead view. The torso faces right while the tower pulls from above.
            grip = (round(113 + 49 * phase),91)
            line((75,25),(111,25),width=9)
            dot((94,25),8,equipment)
            line((94,27),grip,width=2)
            line((70,61),(87,61),width=7,color=light)
            line((70,121),(87,121),width=7,color=light)
            line((93,69),(93,113),width=14,color=ink)
            for y in (69,113):
                elbow = (round(110 + 21 * phase),round(y + (91-y) * phase / 2))
                line((93,y),elbow,grip,width=7,color=teal)
            dot((94,91),11,ink)
            line((113,139),(155,139),width=2,color=equipment)
            line((148,134),(155,139),(148,144),width=2,color=equipment)
            continue

        if key == 'facepull':
            line((189,72),(189,110),width=8)
            dot((189,91),8,equipment)
            line((76,69),(76,113),width=14,color=ink)
            junction = (round(158 - 42 * phase),91)
            line((189,91),junction,width=2,color=equipment)
            for y, direction in ((69,-1),(113,1)):
                elbow = (round(111-38*phase),round(y+direction*28*phase))
                hand = (round(147-50*phase),round(91+direction*(12+14*phase)))
                line(junction,hand,width=2,color=equipment)
                line((76,y),elbow,hand,width=7,color=teal)
                dot(hand,4,ink)
                dot(elbow,2,'#f5fffb')
            dot((80,91),12,ink)
            continue

        if key in {'pecdeck','cablefly'}:
            line((89,66),(89,116),width=14,color=ink)
            if key == 'pecdeck':
                line((70,67),(70,115),width=12,color=light)
            for direction in (-1,1):
                tower = (63,91+direction*66)
                shoulder = (89,91+direction*25)
                elbow = (round(102+21*phase),round(91+direction*(53-28*phase)))
                hand = (round(113+40*phase),round(91+direction*(69-63*phase)))
                line(tower,hand,width=2,color=equipment)
                line(shoulder,elbow,hand,width=7,color=teal)
                dot(tower,6,equipment)
                dot(hand,4,ink)
            dot((91,91),12,ink)
            continue

        head, shoulder, hip, elbow, hand, knee, heel, toe = pose
        line((15,162),(201,162),width=1,color='#bed2cf')
        if key == 'anklerock':
            line(hip,(78,121),(58,153),(76,154),width=7)
        if key == 'hack':
            line((40,33),(133,150),(172,150),width=6)
            line((shoulder[0]-6,shoulder[1]-8),(hip[0]-6,hip[1]+4),width=10)
            line((shoulder[0]-6,shoulder[1]-8),(shoulder[0]+11,shoulder[1]-14),width=7)
            line((138,142),(181,153),width=8)
        if key == 'stepup':
            line((129,132),(177,132),(177,158),(129,158),(129,132),width=6)
            trail_knee = (round(93+41*phase),round(130-23*phase))
            trail_foot = (round(95+46*phase),round(155-29*phase))
            line(hip,trail_knee,trail_foot,(trail_foot[0]+17,trail_foot[1]),width=7,color=light)
        if key == 'cablekick':
            line((184,156),(184,43),width=8)
            line((184,145),heel,width=2,color=equipment)
            line(hip,(121,127),(120,155),(138,155),width=8,color=light)
        if key == 'assistpull':
            line((175,156),(175,17),(112,17),width=7)
            line((119,knee[1]+6),(149,knee[1]+6),(175,knee[1]+6),width=8)
        if key == 'preacher':
            bench((56,119),(96,119))
            line((95,75),(121,94),(121,153),width=8)
        if key in FLOOR:
            line((20,157),(196,157),width=5)
        if key == 'reverselunge':
            line(hip, (round(114-20*phase),round(126+20*phase)),
                 (round(114-50*phase),round(152-5*phase)), (round(131-63*phase),154),
                 width=7,color=light)
        if key == 'bandrow':
            line((168,140),hand,width=3,color=teal)
        if key == 'proney':
            line(shoulder,(elbow[0]-8,elbow[1]+6),(hand[0]-17,hand[1]+5),width=6,color=light)
        if key in {'split','calfstanding','singlecalf','toeraise'}:
            line((165,156),(165,31),width=7)
        if key == 'singlecalf':
            line(hip,(hip[0]+12,hip[1]+25),(hip[0]-5,hip[1]+34),(hip[0]-10,hip[1]+40),width=7,color=light)
        if key in {'extension','calfseated','shoulderpress','dbshoulder'}:
            bench((70,hip[1]+8),(123,hip[1]+8))
            if key != 'calfseated':
                line((71,hip[1]+8),(71,56),width=9)
        if key == 'extension':
            line(knee,(heel[0]+3,heel[1]+4),width=4,color=light)
            dot((heel[0]+5,heel[1]+2),7,equipment)
        if key == 'pronecurl':
            bench((40,118),(149,121))
            line(knee,(heel[0],heel[1]-6),width=4,color=light)
            dot((heel[0],heel[1]-6),7,equipment)
        if key == 'hipthrust':
            bench((23,100),(72,100))
        if key == 'calfseated':
            line((148,152),(168,152),width=9)
            line((118,knee[1]-6),(137,knee[1]-6),width=8)
        if key == 'sideplank':
            line((hip[0]+2,hip[1]-6),(156,146),(169,126),(184,127),width=7,color=light)
        if key == 'hipadduction':
            line((hip[0],hip[1]-5),(140,113),(126,151),(139,153),width=8,color=equipment)
        if key == 'dbpress':
            bench((44,114),(135,114))
        if key == 'incline':
            line((38,82),(108,123),(133,123),width=9)
            line((86,111),(86,155),(126,155),(126,123),width=5)
        if key == 'supportedrow':
            line((83,101),(144,69),width=9)
            line((101,93),(101,154),(143,154),(143,71),width=5)
        if key in {'straightpull','pushdown','overhead','cablecurl','singletricep'}:
            tower_x = 30 if key == 'overhead' else 187
            pulley_y = {'straightpull':24,'pushdown':23,'overhead':65,'cablecurl':146,'singletricep':23}[key]
            line((tower_x,156),(tower_x,pulley_y),width=7)
            line((tower_x,pulley_y),hand,width=2,color=equipment)
        if key == 'abduction':
            bench((91,115),(125,115))
            for x in (knee[0]+6, 216-knee[0]-6):
                line((x,knee[1]-9),(x,knee[1]+8),width=8)
        if key == 'reversefly':
            bench((91,111),(125,111))
            line((108,103),(108,55),width=9,color=light)
            for x in (hand[0],216-hand[0]):
                dot((x,hand[1]),6,equipment)
        if key == 'shoulderpress':
            line((165,154),(165,31),width=7)
            line((165,31),hand,width=4,color=light)
            line((hand[0]-7,hand[1]),(hand[0]+7,hand[1]),width=6)
        if key in {'split','overhead'}:
            bend = phase if key == 'split' else 0
            back_knee = (round(75+3*bend), round(132+16*bend))
            line(hip,back_knee,(53,148),(61,156),width=7,color=equipment)
        if key in {'birddog','scapwarm'}:
            line((132,103),(141,126),(143,151),width=7,color=equipment)
            line((82,103),(92,149),(60,151),width=7,color=equipment)
        if key in FRONT:
            opposite = lambda p: (216-p[0],p[1])
            line(opposite(shoulder),shoulder,width=8,color=ink)
            line(opposite(shoulder),opposite(elbow),opposite(hand),width=7,color=ink if key in LEG else teal)
            line(hip,opposite(knee),opposite(heel),opposite(toe),width=7,color=teal if key in LEG else ink)
            if key in DUMBBELLS:
                db(opposite(hand))
        if key in DUMBBELLS:
            db(hand, vertical=key in {'goblet','hammer'})
        torso_shoulder = (108,shoulder[1]) if key in FRONT else shoulder
        line(head,torso_shoulder,width=7,color=ink)
        line(torso_shoulder,hip,width=13,color=teal if key == 'sideplank' else ink)
        line(shoulder,elbow,hand,width=7,color=ink if key in LEG else teal)
        line(hip,knee,heel,toe,width=8,color=teal if key in LEG or key in FLOOR else ink)
        if key == 'sideplank':
            line((shoulder[0]+2,shoulder[1]-4),(102,shoulder[1]-3),
                 (hip[0],hip[1]-7),width=7,color=ink)
        dot(head,10,ink)
        for joint in (shoulder,hip,elbow,knee):
            dot(joint,2,'#f5fffb')

    if len(frames) > 1:
        draw.line((216,9,216,169),fill='#c9dcda',width=1)
    return image


def diagram(key):
    poses = (None, None) if key in TOP_VIEW else POSES[key]
    image = render(key, list(zip(poses, (0, 1))))
    buffer = BytesIO()
    image.save(buffer,'PNG',optimize=True)
    return 'data:image/png;base64,' + b64encode(buffer.getvalue()).decode('ascii')
