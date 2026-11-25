# Podklady k redizajnu Tréningu vo FitCampe

Stav k 25. novembru 2026. Zistenia spájajú audit zdrojového kódu aplikácie, zverejnené pracovné postupy dvoch tréningových aplikácií a odporúčania pre mobilný web. Návrhové rozhodnutia vychádzajú aj z používateľových pripomienok k zadávaniu údajov a rozbaľovaniu obsahu.

## Kde vzniká trenie

| Súčasný stav | Dôsledok pri používaní | Návrhový dôsledok |
| --- | --- | --- |
| Tréning, plánovanie, katalóg, história aj rozcvička žijú na jednej dlhej stránke s odkazmi na sekcie. | Používateľ musí rozlišovať sekcie podľa názvu a orientovať sa podľa polohy na stránke. | Rozdeliť aplikáciu podľa úloh a nechať každú zobraziť ako samostatnú obrazovku s vlastným stavom. [Šablóna aplikácie](../src/fitcamp_template.html) |
| Rozbaľovacia karta cviku vo vnútri obsahuje ďalšie rozbaľovacie prvky pre svaly a spätný zápis. Katalóg má 51 takýchto kariet. | Pri učení cviku a zápise sérií musí používateľ prechádzať ďalšou vrstvou obsahu. | Katalóg spraviť ako zoznam s vyhľadávaním. Po výbere otvoriť detail cviku, kde sú krátka technika a pracovné série dostupné hneď. [Generátor kariet](../src/build_fitcamp.py) |
| Živá mapa má vlastný plávajúci panel v pravom dolnom rohu. | Na mobile zaberá časť plochy aj mimo tréningu. | Počas aktívneho tréningu zasadiť odkaz na mapu do zdieľanej tréningovej lišty, aby bol dostupný aj pri prehliadaní plánov a cvikov. V histórii otvárať pokrytie v kontexte vybraných tréningov. [Šablóna aplikácie](../src/fitcamp_template.html) |
| Zápis zobrazuje samostatné polia pre každú sériu, kopírovanie posledných sérií už existuje. | Pri rovnakých hodnotách je stále ľahké skončiť pri opakovanom vypĺňaní, najmä pri prvom tréningu bez histórie. | Zviditeľniť posledné hodnoty a pridať spoločný vstup pre rovnaké série s možnosťou doladiť odlišný riadok. [Zápis sérií](../src/fitcamp_sets.js) |

## Vzory z existujúcich produktov

- **Hevy skráti zápis opakovaného tréningu.** Umožňuje začať z rutiny, z prázdneho tréningu alebo zopakovať ukončený tréning. Pri cviku zobrazuje predchádzajúce hodnoty a ich ťuknutím sa dá preniesť hodnota do aktuálneho zápisu. Pre FitCamp z toho vyplýva viditeľný kontext „Naposledy“ priamo pri cviku a vedomá akcia „Použiť posledné série“. Rozpracované hodnoty sa dajú upraviť pred potvrdením. [Hevy – spustenie tréningu](https://help.hevyapp.com/hc/en-us/articles/35361530647959-How-to-Log-a-Workout-in-the-Hevy-App-Step-by-Step-Guide) · [Hevy – predchádzajúce hodnoty](https://www.hevyapp.com/features/track-exercises/)
- **Strong prepája aktívny zápis a detail cviku.** Z tréningu sa detail otvára priamo cez názov cviku. Pre FitCamp je vhodná samostatná obrazovka cviku, ktorá sa otvorí z tréningu, plánu alebo katalógu a po návrate zachová rozpracovaný tréning. Začiatočník má mať prípravu a hlavné technické pokyny na prvom zobrazení. [Strong – detail cviku](https://help.strongapp.io/article/237-about-exercise-detail)
- **GOV.UK používa akordeóny pri selektívnom čítaní.** Všeobecne potrebný obsah má byť hneď viditeľný a vnoreným akordeónom sa treba vyhnúť. Pre FitCamp sem patria aktuálny cvik, stručná technika, dávka z plánu a zápis. Rozšírený návod môže byť samostatne dostupný pomocou zreteľného odkazu. [GOV.UK Design System – Accordion](https://design-system.service.gov.uk/components/accordion/)
- **Dotyk a klávesnica musia fungovať spolu.** Pre opakovane používané ovládanie navrhujeme dotykovú plochu minimálne 44 × 44 CSS px, čo zodpovedá odporúčaniu WCAG na úrovni AAA. Tréningová lišta má pri práci s klávesnicou nechať aktívne pole viditeľné. HTML umožňuje naznačiť celočíselnú klávesnicu pre opakovania a desatinnú pre kilogramy. Prijatie čísla s čiarkou aj bodkou otestujeme samostatne. [W3C – veľkosť dotykového cieľa](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) · [W3C – viditeľnosť fokusu](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) · [WHATWG – inputmode](https://html.spec.whatwg.org/multipage/interaction.html#attr-inputmode)

## Poradie používateľských úloh

1. **Odcvičiť a uložiť tréning.** Na úvodnej obrazovke pokračovať v rozpracovanom tréningu alebo spustiť vybraný plán. Pri cvičení vidieť ukážku, hlavné technické body a rýchly zápis na jednom mieste. Pri treťom cviku na rovnaký hlavný sval sa zobrazí existujúce upozornenie v kontexte výberu.
2. **Vybrať a pripraviť plán.** Ručný výber, uložené plány a šablóny majú spoločný vstup. Pri zostavovaní má mapa vysvetliť chýbajúce a prekrývajúce sa partie. Katalóg sa otvára aj priamo z pridávania cviku.
3. **Pozrieť históriu a upraviť ďalší tréning.** Denník má chronologické záznamy ako predvolený pohľad. Pokrytie posledných tréningov a odporúčania sa otvárajú v rámci denníka. Plná znalosť anatómie nie je predpokladom na ich použitie.
4. **Vyhľadať cvik, rozcvičiť sa, pracovať s dátami.** Katalóg je samostatne dostupný a slúži ako výber v plánovači. Rozcvička patrí na začiatok tréningu. Export CSV, import a záloha JSON patria k správe denníka. Rozšírený kontext o FitCampe a svalovici zostáva v príručke.

## Návrh a kontrola

- Pred kódovaním odsúhlasiť používateľský tok a štvoricu stavov na mobile. Začiatok tréningu, aktívny cvik, zostavenie plánu a spätná analýza svalov.
- V bežnej situácii otestovať zopakovanie minulých sérií bez písania, prvý zápis troch rovnakých sérií s jedným zadaním váhy a opakovaní a úpravu jednej odlišnej série. V ďalších prípadoch preveriť vlastnú váhu, časovú výdrž a zápis po stranách.
- Overiť fungovanie mobilnej klávesnice, navigácie späť a obnovenia stránky počas tréningu. Pri nasadení použiť existujúce úložisko, ID cvikov a exporty podľa [pravidiel údržby](MAINTAINING.md).

## Kandidáti na dizajnové skilly

- **Impeccable** uvádza podporu Codexu a má postupy `shape` na návrh toku, `critique` na vyhodnotenie použiteľnosti a `audit` na technickú kontrolu. Najlepšie zodpovedá situácii, keď už aplikácia funguje a mení sa jej používanie. Zámer produktu máme v existujúcom [PRODUCT.md](PRODUCT.md). [Impeccable – zdrojový repozitár](https://github.com/pbakaus/impeccable)
- **Anthropic Frontend Design** je referenčný skill pre vizuálny smer, typografiu, paletu a kompozíciu. Hodí sa po odsúhlasení pracovných postupov a ako podklad ku kontrole vizuálu. [Anthropic – Frontend Design](https://github.com/anthropics/skills/tree/main/skills/frontend-design)
