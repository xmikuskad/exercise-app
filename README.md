# Exehel

[Otvoriť aplikáciu](https://xmikuskad.github.io/exercise-app/)

Mobilná príručka s 53 cvikmi pre voľný tréning aj tréning podľa šablóny. V histórii sa dá pozrieť vývoj výkonu, porovnať pokrytie svalov a nájsť cviky na chýbajúce partie. Cviky majú slovenské aj anglické názvy, vstavanú ukážku a odkaz na online príklad. Záznamy sa dajú exportovať do CSV alebo JSON.

- [Zámer produktu a hlavné používateľské postupy](product/PRODUCT.md)
- [Údržba, kompatibilita a nasadenie](product/MAINTAINING.md)
- [Výskumné podklady k pokrytiu a novým cvikom](product/RESEARCH.md)
- [Audit anatomickej mapy a pokrytia katalógu](product/ANATOMY-AUDIT.md)
- [TODO a poradie etáp](TODO.md)
- [Dizajn mobilného webu](DESIGN.md) · [Návrh redizajnu](product/UI-PROPOSAL.md) · [Výskum UX](product/UI-RESEARCH.md)

V `.agents/skills/` sú projektové skilly [Impeccable](https://github.com/pbakaus/impeccable) (revízia `9e460a87`) a [Frontend Design](https://github.com/anthropics/skills/tree/main/skills/frontend-design) (revízia `e4bb5d96`). Otvor projekt v novej relácii, aby ich Codex načítal.

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

Príkaz `node tests/check_fitcamp.mjs --finish-only` spustí len regresný scenár ukončenia. Rovnaký scenár vo Firefoxe spustíš cez `node tests/check_finish_firefox.mjs`. [Pokrytie testov a nastavenie prehliadačov](tests/README.md).

## Úložisko a súkromie

Aplikácia ukladá plány a denník do `localStorage` v prehliadači. Nemá účet ani serverovú databázu. Na prenesenie zo starého lokálneho HTML alebo medzi zariadeniami stiahni a načítaj zálohu JSON. Exporty obsahujú údaje, ktoré si zadal, a patria mimo verejného repozitára.

Pri GitHub Pages môže viac projektov zdieľať rovnaký webový pôvod. Kľúče tejto aplikácie obsahujú cestu projektu kvôli oddeleniu názvov. Pre oddelenie od skriptov iných projektov potrebuje aplikácia vlastný pôvod, napríklad samostatnú doménu.
