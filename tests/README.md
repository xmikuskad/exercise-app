# Testy Exehel v prehliadači

Po zostavení cez `python src/build_fitcamp.py` spusti z koreňa repozitára s Node.js 22 alebo novším:

```sh
node tests/check_fitcamp.mjs
node tests/check_fitcamp.mjs --finish-only
node tests/check_finish_firefox.mjs
```

Prvý príkaz prejde hlavné používateľské scenáre v Chrome. Ďalšie dva spúšťajú spoločný regresný scenár ukončenia tréningu v Chrome a Firefoxe. Rozhodujúce tlačidlá v ňom ovláda prehliadač skutočným kliknutím, takže test zachytí aj prekrytý alebo skrytý ovládací prvok. Prehliadače používajú samostatné testovacie profily s fiktívnymi dátami.

| Oblasť | Automaticky pokryté scenáre |
| --- | --- |
| Tréning | Voľný tréning, štart zo šablóny, pokračovanie podľa plánu, upozornenie na prekryv a zapojenie svalov |
| Ukončenie | Pokračovať v tréningu, opraviť neúplnú sériu, uložiť posledný cvik, ukončiť bez neho, vynechať prázdny tréning, ukončiť plán bez spustenia ďalšieho cviku a obnoviť uloženú históriu |
| Zápis | Automatické uloženie rozpísaných sérií, načítanie predošlých hodnôt, kopírovanie série, desatinná čiarka, výdrž a jednostranný zápis |
| Plány a história | Predpripravené zostavy, vlastný plán, šablóna z histórie, výmena aktívneho aj nasledujúceho cviku, ochrana rozpracovaných dát, pridanie z anatomickej mapy bez duplicít, výkon a pokrytie |
| Porovnanie výkonu | Rovnaké opakovania, rovnaká váha, chýbajúce obdobie, hranice dátumov, časová výdrž, dopomoc, oddelené strany a zachovanie údajov |
| Rozcvička a katalóg | Vyhľadávanie, zobrazenie cviku, kontrola videí, 18 rozcvičovacích variantov, uloženie výberu |
| Údaje a zobrazenie | CSV, JSON, staršia záloha, odmietnutie poškodenej zálohy bez zmeny údajov, úzky mobilný viewport a kontrola chýb stránky |

Pri inom umiestnení prehliadača nastav `CHROME_BIN` alebo `FIREFOX_BIN`. Firefox musí podporovať WebDriver BiDi. S `FITCAMP_TEST_URL` sa scenáre spustia proti nasadenej adrese. Snímky a profily sa ukladajú do ignorovaného priečinka `.test-artifacts/`.
