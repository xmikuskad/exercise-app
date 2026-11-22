# Tréning vo FitCampe

[Otvoriť aplikáciu](https://xmikuskad.github.io/exercise-app/)

Mobilná statická príručka so 46 cvikmi, plánovačom tréningov, živou mapou svalov a denníkom sérií. Obsahuje slovenské aj anglické názvy, vstavané ukážky, odkazy na ďalšie videá a export do CSV alebo JSON.

## Zostavenie

Treba Python 3.11 alebo novší a FFmpeg s enkodérom `libx264` dostupný v `PATH`.

```sh
python -m pip install -r requirements.txt
python src/build_fitcamp.py
```

Výstupom je samostatný `docs/index.html`. GitHub Pages publikuje tento priečinok z vetvy `main`.

Test v prehliadači vyžaduje Node.js 22+ a Chrome alebo Chromium.

```sh
node tests/check_fitcamp.mjs
```

Pri inej inštalácii nastav `CHROME_BIN`. Premenná `FITCAMP_TEST_URL` umožní testovať nasadenú verziu.

## Úložisko a súkromie

Aplikácia ukladá plány a denník do `localStorage` v prehliadači. Nemá účet ani serverovú databázu. Na prenesenie zo starého lokálneho HTML alebo medzi zariadeniami stiahni a načítaj zálohu JSON. Exporty obsahujú údaje, ktoré si zadal, a patria mimo verejného repozitára.

Pri GitHub Pages môže viac projektov zdieľať rovnaký webový pôvod. Kľúče tejto aplikácie obsahujú cestu projektu kvôli oddeleniu názvov. Pre oddelenie od skriptov iných projektov potrebuje aplikácia vlastný pôvod, napríklad samostatnú doménu.
