# Each variant has a short dose and a cue specific to warming up.
WARMUP_GROUPS = (
    ('ankles', 'Členky a predkolenia', (
        ('anklerock', '8 na každú nohu', 'V stoji', 'V rozkroku prenes váhu dopredu. Predné koleno smeruje ponad špičku a päta ostáva na podlahe. Po sérii vymeň nohy.'),
        ('calfstanding', '10 opakovaní', 'Pevná opora podľa potreby', 'Zdvihni päty, na vrchu sa na chvíľu zastav a pomaly ich spusť. Chodidlá drž rovnobežne.'),
        ('toeraise', '10 opakovaní', 'Pevná opora', 'Zdvihni špičky k predkoleniam. Päty nechaj na podlahe a trup drž vzpriamene.'),
    )),
    ('knees', 'Kolená a predné stehná', (
        ('bodyweightsquat', '8 opakovaní', 'V stoji', 'Klesaj do pohodlnej hĺbky. Nechaj celé chodidlá na podlahe a kolená veď v smere špičiek.'),
        ('sit', '8 opakovaní', 'Pevná lavička', 'Vstaň bez odrazu. Pri návrate sa lavičky dotkni pomaly, s váhou rozloženou na obe chodidlá.'),
        ('goblet', '6 opakovaní', 'Ľahká jednoručka', 'Činku drž pri hrudníku. Zvoľ ľahkú váhu a hĺbku, pri ktorej ostávajú päty na zemi.'),
    )),
    ('shoulders', 'Ramená', (
        ('shoulderwarm', '8 kruhov v každom smere', 'V stoji', 'Ruky nechaj voľne pri tele. Ramenami sprav pomalé kruhy a potom otoč smer.'),
        ('proney', '6 opakovaní', 'Podložka', 'V ľahu na bruchu natiahni ruky do tvaru Y. Palce smerujú hore. Zdvihni ruky len kúsok, čelo nechaj opreté.'),
        ('lateral', '8 opakovaní', 'Ľahké jednoručky', 'S mierne pokrčenými lakťami dvíhaj ľahké činky do strán. Zastav predtým, než začneš dvíhať ramená k ušiam.'),
    )),
    ('upper-back', 'Lopatky a horný chrbát', (
        ('scapwarm', '8 opakovaní', 'Podložka', 'Dlane daj pod ramená. S vystretými lakťami nechaj hrudník klesnúť o pár centimetrov a potom sa dlaňami odtlač.'),
        ('push', '6 opakovaní', 'Pevná vyvýšená opora', 'Opri dlane o stabilnú oporu. Zvoľ dostatočnú výšku, aby si hrudník vedel spustiť a odtlačiť sa bez námahy v krížoch.'),
        ('dbrow', '6 na každú ruku', 'Ľahká jednoručka a pevná opora', 'Voľnou rukou sa opri. Pritiahni ľahkú činku k boku a spúšťaj ju pomaly, bez otáčania trupu.'),
    )),
    ('hips', 'Bedrá a zadok', (
        ('bridge', '8 opakovaní', 'Podložka', 'Opri chodidlá a s výdychom zdvihni boky. Pohyb ukonči skôr, než sa začnú prehýbať kríže.'),
        ('reverselunge', '5 na každú nohu', 'V stoji', 'Urob krátky krok dozadu a mierne pokrč obe kolená. Pri návrate sa odtlač predným chodidlom.'),
        ('hipthrust', '8 opakovaní', 'Pevná lavička, bez záťaže', 'Opri lopatky o stabilnú lavičku. Zdvihni boky tlakom cez päty a hore udrž rebrá pokojné.'),
    )),
    ('core', 'Stred tela', (
        ('deadbug', '6 na každú stranu', 'Podložka', 'V ľahu na chrbte spúšťaj opačnú ruku a nohu. Zastav predtým, ako sa kríže prehnú.'),
        ('birddog', '5 na každú stranu', 'Podložka', 'Na štyroch vystri opačnú ruku a nohu. Bedrá drž vodorovne a po návrate vymeň strany.'),
        ('plank', '15 sekúnd', 'Podložka', 'Opri sa o predlaktia a kolená. Zdvihni boky, spevni brucho a plynulo dýchaj.'),
    )),
)

WARMUP_ONLY_NAMES = {
    'anklerock': ('Prenášanie váhy v rozkroku', 'Split-Stance Ankle Rocks'),
    'shoulderwarm': ('Krúženie ramenami', 'Shoulder Rolls'),
    'scapwarm': ('Klik lopatkami na štyroch', 'Quadruped Scapular Push-up'),
}
