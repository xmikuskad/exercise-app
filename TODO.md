# Exehel · plán vývoja

Exehel pomáha pripraviť tréning doma, odcvičiť ho podľa šablóny alebo podľa dostupného vybavenia a z denníka rozpoznať progres aj vynechané partie. Poradie dáva prednosť používaniu aplikácie v posilňovni. Podkladom je [schválený návrh](product/UI-PROPOSAL.md).

## 1. Mobilný základ a aktívny tréning

- [x] Premenovať produkt na Exehel. Zachovať adresu, úložisko, identifikátory a čitateľnosť exportov.
- [x] Zaviesť samostatné obrazovky Dnes, Plány, Cviky a História. Presunúť rozcvičku k štartu a zálohy do správy dát pod históriou.
- [x] Ponúknuť voľný tréning aj štart zo zostavy. Pridať návrat k aktívnemu cviku a živej mape pri prechádzaní aplikácie.
- [x] Zjednodušiť zápis na detaile cviku. Ukázať posledné série, kopírovanie rovnakých hodnôt, automaticky uložiť rozpísané polia a po potvrdení otvoriť ďalší cvik plánu.
- [ ] Zjednotiť pokyny k technike, svalovú ilustráciu a rozšírené informácie na kompaktnom detaile. Poznámky ku klubu a svalovici sprístupniť zo spoločnej pomoci.

## 2. Šablóny a história

- [x] Z ukončeného tréningu vytvoriť novú upraviteľnú šablónu. Pri opakovaní rovnakého cviku zrátať zapísané série a zachovať poradie prvého výskytu.
- [x] Spúšťať vlastné a predpripravené šablóny priamo z Plánov. Zobraziť historický detail aj počas rozpracovaného tréningu.
- [x] Ukázať vývoj vybraného cviku v posledných 12 návštevách. Použiť váhu, opakovania, výdrž alebo dopomoc podľa typu cviku.
- [ ] Doplniť zmenu odporu pri rovnakých opakovaniach a vývoj opakovaní pri rovnakej váhe. Pridať porovnanie období.
- [x] Zjednodušiť výmenu obsadeného cviku v aktívnom pláne. Ukázať vhodné náhrady podľa vybavenia a hlavného svalu. Rozpísané série a uloženú šablónu chrániť pred prepísaním.

## 3. Anatomická mapa a odporúčania

- [x] Zvýrazniť kvadricepsy na prednej strane stehien. Doplniť predné predkolenie aj samostatný cieľový cvik.
- [x] Odkázať z kliknutia na oblasť aj z textového výberu na kartu vhodného cviku. Overiť tiež sivé, zatiaľ neodcvičené oblasti.
- [x] Ponúknuť filter posledných 28 dní, počet zapísaných priamych sérií a dátum posledného priameho tréningu vybraného svalu. Zachovať upozornenie pri treťom priamom cviku počas tréningu.
- [ ] Dokončiť audit vnútra stehien, lopatiek, predlaktí a ďalších hlbších oblastí. Rozlíšiť vizuálne zakreslenie svalu a dostupnosť priameho cviku.
- [x] Z mapy pridať cvik priamo do rozpracovaného návrhu plánu a filtrovať výber podľa vybavenia.
- [ ] Zobraziť týždenné priame série a opakované prekryvy. Pri odporúčaniach zohľadniť dĺžku záznamu a rozlišovať malý objem, iba pomocné zapojenie a chýbajúci zápis. Farba ani počet sérií samy neurčujú mieru regenerácie.

## Kontrola každej etapy

- Otestovať normálny priebeh tréningu a pôvodné zálohy na izolovaných dátach.
- Skontrolovať mobil pri šírke 320 a 390 px, navigáciu späť a zachovanie rozpísaného tréningu.
- Zostaviť `docs/index.html`, spustiť test v Chrome a pri nasadení overiť GitHub Pages.
