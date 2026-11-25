# Údržba aplikácie

## Kde upravovať kód

- `src/fitcamp_template.html` obsahuje rozloženie a štýly. Python moduly `src/fitcamp_catalog.py`, `src/fitcamp_muscles.py` a súvisiace moduly definujú obsah kariet, svaly a ukážky.
- JavaScript má samostatné moduly pre denník, tréning, série, plánovač, mapu a porovnanie histórie. Porovnanie používa rovnaké zapojenia svalov ako živá mapa. Zmeny v priradení cviku ovplyvnia aj zobrazenie starších tréningov.
- `docs/index.html` je zostavený výstup publikovaný cez GitHub Pages. Po zmene zdrojov spusti `python src/build_fitcamp.py`. Generátor vloží obrázky, videá a skripty a prepočíta ich CSP hashe.

## Kompatibilita denníka

- Stabilné ID cviku je súčasťou naplánovaných zostáv, ukončených tréningov, posledného zápisu aj CSV. Novým cvikom prideľ nové ID. Premenovanie v rozhraní rob zmenou zobrazeného názvu. Ak zmena potrebuje nové ID alebo formát dát, priprav kompatibilné načítanie a otestuj ho so zálohou starej verzie.
- Existujúce kľúče v `localStorage` a verejná adresa Pages umožňujú používateľovi po aktualizácii pokračovať s rovnakými údajmi. Pri zmene adresy alebo zariadenia slúži na prenos JSON.
- Pri spätnej analýze sa počítajú ukončené záznamy cvikov z archívu. Staršie záznamy bez rozpísaných sérií sú platné. Samostatný ručný zápis na karte patrí do denníka a nemá väzbu na ukončený tréning.
- Automaticky uložený koncept počas aktívneho cviku môže mať voliteľné pole `draftRows`. Po ukončení cviku sa ukladajú iba overené série v pôvodnom tvare. Koncept môže obsahovať rozpracované číselné vstupy a patrí len do miestneho stavu aktívneho tréningu.
- Výber zobrazenia histórie funguje v pamäti stránky. Výber a filter nemenia uložený denník, plány ani exporty.

## Kontrola vydania

1. Pri novom cviku doplň názvy, pozíciu v repertoári, prioritu, rozsah opakovaní, hlavné aj pomocné svaly, techniku a obe ukážky. Označ varianty použiteľné bez tréningového náradia.
2. Zostav stránku a spusti `node tests/check_fitcamp.mjs`. Test zahŕňa mobilné zobrazenie, import staršej zálohy, tréning a série, CSV, JSON aj výber histórie.
3. Skontroluj obsah zmien pred commitom. Verejný repozitár obsahuje zdroje a zostavenú stránku. Zálohy, exporty a profily prehliadača majú zostať v miestnom úložisku.
4. Po nasadení skontroluj rovnaký URL pôvod a cestu. Test môže bežať proti GitHub Pages pomocou `FITCAMP_TEST_URL`.
