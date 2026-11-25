from base64 import b64encode
from hashlib import sha256
from html import escape
from json import dumps
from pathlib import Path
from re import DOTALL, search, sub

from fitcamp_art import diagram as original_diagram
from fitcamp_catalog import EXERCISES, GROUPS, PRESCRIPTIONS, PRIORITY
from fitcamp_catalog_art import POSES, TOP_VIEW, diagram as catalog_diagram
from fitcamp_motion import PRACTICE_CAPTIONS, video_data
from fitcamp_muscles import MUSCLES, ROLES
from fitcamp_technique import TECHNIQUE
from fitcamp_references import DEMOS
from fitcamp_warmup import WARMUP_GROUPS, WARMUP_ONLY_NAMES
from fitcamp_extra import EXTRA_CHECKS, EXTRA_ROLES
from fitcamp_low_equipment import CHECKS_LOW_EQUIPMENT, ROLES_LOW_EQUIPMENT
from fitcamp_bodymap import body_map, live_body_map

TECHNIQUE.update(EXTRA_CHECKS | CHECKS_LOW_EQUIPMENT)
ROLES.update(EXTRA_ROLES | ROLES_LOW_EQUIPMENT)

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parent
PHOTO = 'https://lh3.googleusercontent.com/gps-cs-s/ANWiy9SimsmJ6JNKdAvkJYCY2NwCYjTYf03VLm-HjhDmXVki6q5s4hcgQxGpL61lmRXBj3bnvqNHSW7KPiGnOg4kkny-2r2sOHu0h1xDvln6raRh1m8ygk4hU45YPkt1IR9Ht54b3uRbRFnX-W0=w1200-h1200-k-no'
CLUB = f'''
<p>Na fotke z galérie FitCampu vidno <strong>čiernu viacúčelovú kladku pri bordovej stene FITCAMP GET MOTIVATED</strong>. Zľava je spodná kladka s lavičkou a oporou chodidiel, sprava horná kladka so širokou zahnutou tyčou a sedadlom. Ďalšie kladky HumanSport sú na klubovej fotke pri modrej dráhe a schodoch. <a href="{PHOTO}">Fotka kladiek pri bordovej stene</a> · <a href="https://www.formfactory.sk/wp-content/uploads/2025/07/fitcamp-2.jpg">Fotka silovej zóny pri modrej dráhe</a></p>
<p>FitCamp potvrdzuje aj voľné váhy a funkčnú zónu. Dostupnosť konkrétnych strojov z ostatných kariet sa môže líšiť. Ak nevieš nájsť stroj, pozri štítok, spýtaj sa obsluhy alebo použi uvedenú náhradu.</p>
'''.strip()
LOCATIONS = {
    'row': 'Vo FitCampe hľadaj ľavú stranu čiernej kladkovej zostavy pri bordovej stene s nápisom FITCAMP.',
    'lat': 'Vo FitCampe hľadaj pravú stranu čiernej kladkovej zostavy pri bordovej stene s nápisom FITCAMP.',
}
SLOVAK_NAMES = {
    'deadbug': 'Striedavé vystieranie v ľahu',
    'birddog': 'Striedavé vystieranie na štyroch',
    'pallof': 'Tlak proti otáčaniu na kladke',
}
PRIORITIES = {key: (priority, title) for priority, title, catalog in PRIORITY for key in catalog}
DUMBBELL_LOAD = {'goblet', 'dbpress', 'incline', 'dbrow', 'supportedrow', 'lateral', 'biceps', 'hammer',
                 'dbshoulder', 'preacher'}
BODYWEIGHT = {
    'sit', 'push', 'bridge', 'split', 'calfstanding', 'singlecalf', 'deadbug',
    'plank', 'sideplank', 'birddog', 'reversecrunch', 'bodyweightsquat', 'reverselunge',
    'floorpush', 'proney', 'toeraise',
}
MACHINE_LOAD = {'press', 'chest', 'row', 'curl', 'lat', 'extension', 'pronecurl', 'abduction',
                'calfseated', 'straightpull', 'shoulderpress', 'reversefly', 'facepull', 'pushdown',
                'overhead', 'pallof', 'hack', 'cablekick', 'pecdeck', 'cablecurl', 'singletricep'}


def bilingual_name(key):
    name, subtitle = EXERCISES[key][:2]
    english = subtitle.split(' · ', 1)[0].split(' / ', 1)[0]
    slovak = escape(SLOVAK_NAMES.get(key, name))
    return f'{slovak} <small class="english-name" lang="en">({escape(english)})</small>'


def demo_reference(key):
    url, source = DEMOS[key]
    return (f'<a class="demo-source" href="{escape(url, quote=True)}" target="_blank" rel="noopener noreferrer">'
            f'<span>Online video ↗</span><small>{escape(source)}</small></a>')


def warmup_data():
    groups = {}
    for group, _, variants in WARMUP_GROUPS:
        choices = []
        for key, dose, equipment, cue in variants:
            if key in WARMUP_ONLY_NAMES:
                name, english = WARMUP_ONLY_NAMES[key]
            else:
                name, subtitle = EXERCISES[key][:2]
                name = SLOVAK_NAMES.get(key, name)
                english = subtitle.split(' · ', 1)[0].split(' / ', 1)[0]
            url, source = DEMOS[key]
            choices.append(dict(id=key, name=name, english=english, dose=dose,
                                equipment=equipment, cue=cue, url=url, source=source))
        assert len({choice['id'] for choice in choices}) == len(choices)
        groups[group] = choices
    media = {key: video_data(key) for key in WARMUP_ONLY_NAMES}
    return dumps(dict(groups=groups, media=media), ensure_ascii=False, separators=(',', ':'))


def warmup_rows():
    return ''.join(
        f'<li data-warmup-group="{group}"><button type="button" class="warmup-row" aria-expanded="false">'
        f'<span><strong>{escape(title)}</strong><small class="warmup-selection"></small></span>'
        '<span class="warmup-edit">Možnosti</span></button></li>'
        for group, title, _ in WARMUP_GROUPS
    )


def exercise_card(key, exercise):
    name, subtitle, labels, recognition, setup, movement, mistakes, alternative = exercise
    first, second = labels
    alt = escape(f'{name}. Vľavo {first.lower()}, vpravo {second.lower()}.', quote=True)
    location = LOCATIONS.get(key, '')
    reps = PRESCRIPTIONS.get(key, '8–12')
    diagram = catalog_diagram if key in TOP_VIEW or key in POSES else original_diagram
    main, secondary = (role.split() for role in ROLES[key])
    main_names = ', '.join(MUSCLES[muscle] for muscle in main)
    secondary_names = ', '.join(MUSCLES[muscle] for muscle in secondary)
    checkpoints = (
        ('Pred prvou sériou', TECHNIQUE[key][0]),
        ('Čo sleduj pri opakovaní', TECHNIQUE[key][1]),
        ('Kedy ubrať alebo upraviť pohyb', TECHNIQUE[key][2]),
    )
    checks = ''.join(f'<li><strong>{label}</strong> {escape(text)}</li>' for label, text in checkpoints)
    search_aliases, muscle_subtitle = subtitle.split(' · ', 1)
    set_unit = 'seconds' if key in {'plank', 'sideplank'} else 'reps'
    per_side = 'yes' if ' / strana' in reps else 'no'
    load_basis = (
        'per_dumbbell' if key in DUMBBELL_LOAD else 'machine' if key in MACHINE_LOAD
        else 'assistance' if key == 'assistpull' else 'per_stack' if key == 'cablefly' else 'total_added'
    )
    priority, priority_title = PRIORITIES[key]
    return f'''
    <details class="card" id="{key}" data-equipment="{'bodyweight' if key in BODYWEIGHT else 'equipment'}" data-main="{escape(' '.join(main), quote=True)}" data-secondary="{escape(' '.join(secondary), quote=True)}" data-aliases="{escape(f'{name} {search_aliases}', quote=True)}" data-set-unit="{set_unit}" data-per-side="{per_side}" data-load-basis="{load_basis}" data-prescription="{escape(reps, quote=True)}">
      <summary><strong class="exercise-name">{bilingual_name(key)}</strong><span class="exercise-subtitle"><small class="priority {priority}">{escape(priority_title)}</small> {escape(muscle_subtitle)}</span><span class="last" hidden></span></summary>
      <div class="inside">
        <p><strong>{escape(reps)}</strong> <span class="subtle">· jedna pracovná séria</span></p>
        <div class="live-control">
          <div class="exercise-commands">
            <button class="start-exercise save" type="button">Začať cvik</button>
            <a class="log-set-link save" href="#{key}-log" hidden>Zapísať série ↓</a>
            <div class="exercise-utilities">
              <button class="discard-exercise" type="button" hidden>Zrušiť meranie</button>
              <output class="exercise-clock" hidden aria-live="off" aria-label="Trvanie cviku"></output>
            </div>
          </div>
          <p class="exercise-feedback subtle" role="status" hidden></p>
        </div>
        <p class="exercise-setup">{escape(setup)}</p>
        <a class="exercise-technique-link" href="#{key}-technique">Ukážka a technika ↓</a>
        <div class="set-log-slot" id="{key}-log">
          <div class="set-log-result" hidden>
            <p role="status" class="set-log-result-text"></p>
            <button type="button" class="save next-planned-exercise" hidden>Začať ďalší podľa plánu</button>
            <a href="#cviky">Vybrať ďalší cvik</a>
          </div>
        </div>
        <div id="{key}-technique" class="exercise-demo">
          <div class="demo-actions">
            <button class="demo-toggle" type="button" aria-expanded="false" aria-controls="{key}-video">Prehrať ukážku</button>
            {demo_reference(key)}
          </div>
          <figure class="demo-stills">
            <img src="{diagram(key)}" alt="{alt}" width="432" height="180">
            <figcaption class="labels" aria-hidden="true"><span>{escape(first)}</span><span>{escape(second)}</span></figcaption>
          </figure>
          <figure class="demo-motion" id="{key}-video" hidden>
            <video data-src="{video_data(key)}" width="432" height="264" controls playsinline muted preload="none"
                   aria-label="{escape(name, quote=True)} – schematická video ukážka"></video>
            <figcaption class="demo-caption"><strong>Schematická ukážka.</strong> {escape(PRACTICE_CAPTIONS[key])}</figcaption>
          </figure>
        </div>
        <details class="muscle-map">
          <summary>Mapa zapojených svalov</summary>
          <figure>
            <img src="{body_map(main, secondary)}" loading="lazy" width="480" height="420"
                 alt="{escape('Mapa spredu a zozadu. Hlavné svaly: ' + main_names + '. Pomocné: ' + (secondary_names or '—'), quote=True)}">
            <figcaption class="labels" aria-hidden="true"><span>Spredu</span><span>Zozadu</span></figcaption>
          </figure>
          <p class="muscle-names"><strong class="map-key main-key">Hlavné</strong> {escape(main_names)}<br>
          <strong class="map-key support-key">Pomocné</strong> {escape(secondary_names or '—')}</p>
          <p class="subtle map-note">Viditeľné oblasti sú orientačné. Hlbšie svaly nájdeš v zozname.</p>
        </details>
        <div class="checkpoints">
          <p><strong>Kontrola techniky</strong></p>
          <ul>{checks}</ul>
        </div>
        <dl>
          <dt>Ako ho nájdeš a čo potrebuješ</dt><dd>{escape(recognition)} {escape(location)}</dd>
          <dt>Nastavenie</dt><dd>{escape(setup)}</dd>
          <dt>Pohyb a dýchanie</dt><dd>{escape(movement)}</dd>
          <dt>Časté chyby</dt><dd>{escape(mistakes)}</dd>
          <dt>Variant alebo náhrada</dt><dd>{alternative}</dd>
        </dl>
        <details class="track">
          <summary>Spätný zápis alebo poznámka</summary>
          <div class="manual-entry">
          <label class="field">Váha alebo poznámka <input class="exercise-note" type="text" maxlength="100" autocomplete="off" placeholder="Napr. 20 kg · 2 × 10 · sedadlo 4"></label>
          <label class="field edit-date" hidden>Dátum záznamu <input type="date"></label>
          <div class="tools">
            <button class="save" type="button">Označiť ako odcvičené</button>
            <button class="edit" type="button" hidden>Upraviť záznam</button>
            <button class="cancel" type="button" hidden>Zrušiť úpravu</button>
          </div>
          <p class="subtle log-output" role="status"></p>
          </div>
        </details>
      </div>
    </details>
    '''.strip()


def group_section(group_id, title, exercises):
    cards = ''.join(exercise_card(key, EXERCISES[key]) for key in exercises)
    return f'<section class="category" id="{group_id}" data-group="{escape(title, quote=True)}"><h3>{escape(title)}</h3>{cards}</section>'


keys = [key for group_id, title, exercises in GROUPS for key in exercises]
assert len(keys) == len(set(keys)) == len(EXERCISES)
assert set(keys) == EXERCISES.keys()
assert ROLES.keys() == EXERCISES.keys()
assert TECHNIQUE.keys() == EXERCISES.keys() and all(len(checks) == 3 for checks in TECHNIQUE.values())
assert PRACTICE_CAPTIONS.keys() == EXERCISES.keys()
assert PRIORITIES.keys() == EXERCISES.keys()
assert all(PRIORITIES[catalog[0]][0] == 'base' for _, _, catalog in GROUPS)
assert EXERCISES.keys() <= DEMOS.keys()
assert BODYWEIGHT <= EXERCISES.keys()
for primary, secondary in ROLES.values():
    main, support = set(primary.split()), set(secondary.split())
    assert main and not main & support and (main | support) <= MUSCLES.keys()
template = (SOURCE / 'fitcamp_template.html').read_text(encoding='utf-8')
template = template.replace('@@APP_STYLE@@', (SOURCE / 'fitcamp_app.css').read_text(encoding='utf-8'))
template = sub(r'@@NAME:([a-z]+)@@', lambda match: bilingual_name(match[1]), template)
scripts = {
    placeholder: (SOURCE / f'fitcamp_{module}.js').read_text(encoding='utf-8')
    for placeholder, module in (
        ('SCRIPT', 'journal'), ('TRAINING', 'training'), ('SETS', 'sets'),
        ('COVERAGE', 'coverage'), ('PLANNER', 'planner'), ('HISTORY', 'history'), ('DEMOS', 'demos'),
        ('INSIGHTS', 'insights'), ('APP', 'app'), ('MUSCLE_PICKER', 'muscle_picker'), ('WARMUP', 'warmup')
    )
}


def csp_hash(value):
    return "'sha256-" + b64encode(sha256(value.encode('utf-8')).digest()).decode('ascii') + "'"


csp = (
    "default-src 'none'; base-uri 'none'; form-action 'none'; img-src data:; media-src data:; "
    "script-src " + " ".join(csp_hash(script) for script in scripts.values()) + "; "
    "style-src " + csp_hash(search(r'<style>(.*?)</style>', template, DOTALL)[1])
)
template = template.replace('@@CSP@@', escape(csp, quote=True))
for placeholder, script in scripts.items():
    template = template.replace(f'@@{placeholder}@@', script)
cards = ''.join(group_section(*group) for group in GROUPS)
group_links = ''.join(f'<a href="#{group_id}">{escape(title)}</a>' for group_id, title, _ in GROUPS)
target = ROOT / 'docs' / 'index.html'
target.parent.mkdir(exist_ok=True)
target.write_text(template.replace('@@CARDS@@', cards).replace('@@GROUP_LINKS@@', group_links)
                  .replace('@@CLUB@@', CLUB)
                  .replace('@@COVERAGE_DATA@@', dumps(live_body_map(), ensure_ascii=False, separators=(',', ':')))
                  .replace('@@WARMUP_ROWS@@', warmup_rows())
                  .replace('@@WARMUP_DATA@@', warmup_data())
                  .replace('@@MUSCLES@@', dumps(MUSCLES, ensure_ascii=False)),
                  encoding='utf-8', newline='\n')
print(target)
