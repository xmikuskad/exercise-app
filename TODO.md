# Exehel · plán vývoja

Exehel pomáha pripraviť tréning doma, odcvičiť ho podľa šablóny alebo podľa dostupného vybavenia a z denníka rozpoznať progres aj vynechané partie. Poradie dáva prednosť používaniu aplikácie v posilňovni. Podkladom je [schválený návrh](product/UI-PROPOSAL.md).

## 1. Mobilný základ a aktívny tréning

- [x] Premenovať produkt na Exehel. Zachovať adresu, úložisko, identifikátory a čitateľnosť exportov.
- [x] Zaviesť samostatné obrazovky Dnes, Plány, Cviky a História. Presunúť rozcvičku k štartu a zálohy do správy dát pod históriou.
- [x] Ponúknuť voľný tréning aj štart zo zostavy. Pridať návrat k aktívnemu cviku a živej mape pri prechádzaní aplikácie.
- [x] Zjednodušiť zápis na detaile cviku. Ukázať posledné série, kopírovanie rovnakých hodnôt, automaticky uložiť rozpísané polia a po potvrdení otvoriť ďalší cvik plánu.
- [x] Zjednotiť techniku, svalovú ilustráciu a informácie o vybavení na detaile cviku. Klubové informácie a svalovicu sprístupniť zo spoločnej Pomoci.

## 2. Šablóny a história

- [x] Z ukončeného tréningu vytvoriť novú upraviteľnú šablónu. Pri opakovaní rovnakého cviku zrátať zapísané série a zachovať poradie prvého výskytu.
- [x] Spúšťať vlastné a predpripravené šablóny priamo z Plánov. Zobraziť historický detail aj počas rozpracovaného tréningu.
- [x] Ukázať vývoj vybraného cviku v posledných 12 návštevách. Použiť váhu, opakovania, výdrž alebo dopomoc podľa typu cviku.
- [x] Porovnať váhu pri rovnakom počte opakovaní, opakovania pri rovnakej váhe a výdrž pri rovnakej záťaži v dvoch po sebe idúcich obdobiach.
- [x] Zjednodušiť výmenu obsadeného cviku v aktívnom pláne. Ukázať vhodné náhrady podľa vybavenia a hlavného svalu. Rozpísané série a uloženú šablónu chrániť pred prepísaním.

## 3. Anatomická mapa a odporúčania

- [x] Zvýrazniť kvadricepsy na prednej strane stehien. Doplniť predné predkolenie aj samostatný cieľový cvik.
- [x] Odkázať z kliknutia na oblasť aj z textového výberu na kartu vhodného cviku. Overiť tiež sivé, zatiaľ neodcvičené oblasti.
- [x] Ponúknuť filter posledných 28 dní, počet zapísaných priamych sérií a dátum posledného priameho tréningu vybraného svalu. Zachovať upozornenie pri treťom priamom cviku počas tréningu.
- [x] Dokončiť [anatomický audit](product/ANATOMY-AUDIT.md). Rozlíšiť zakreslenie a pokrytie katalógu, zvýrazniť vnútorné stehná a predlaktie, doplniť schému rombických svalov aj priamy cvik na vnútorné stehná.
- [x] Z mapy pridať cvik priamo do rozpracovaného návrhu plánu a filtrovať výber podľa vybavenia.
- [x] Zobraziť týždenné priame série a opakované prekryvy. Porovnať nižší objem s vlastnými staršími záznamami a rozlíšiť iba pomocné zapojenie, chýbajúci zápis a neúplný počet sérií.

## Kontrola každej etapy

- Otestovať normálny priebeh tréningu a pôvodné zálohy na izolovaných dátach.
- Skontrolovať mobil pri šírke 320 a 390 px, navigáciu späť a zachovanie rozpísaného tréningu.
- Zostaviť `docs/index.html`, spustiť test v Chrome a pri nasadení overiť GitHub Pages.
