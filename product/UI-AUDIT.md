# Vizuálna kontrola Exehel

Porovnanie pred úpravami a po nich zahŕňa 34 stavov v šírkach 320, 390 a 1280 CSS px v Chrome. Zachytené sú Dnes, Plány, Cviky, rozcvička, História, pokrytie, týždenný objem, vývoj výkonu, správa dát, Pomoc a anatomický katalóg. V tréningu sú samostatne zachytené aktívny cvik, série, technika, svaly, živá mapa, upozornenie na prekryv, náhrada a ukončenie. Pri histórii a analytike sú zahrnuté prázdne aj vyplnené stavy. Skontrolovaných je aj 53 dvojpolohových ilustrácií z katalógu.

| Oblasť | Zistenie | Úprava |
| --- | --- | --- |
| Aktívny cvik | Odkaz „Späť k cviku“ sa zobrazoval už na tom istom cviku. „Zapísať série“ iba posúvalo na formulár, ktorý bol už súčasťou stránky. | Formulár je priamo pod názvom a ovládaním cviku. Hlavnou akciou je uloženie sérií. Hlavička ponúka návrat z iných obrazoviek a tréningovú mapu. |
| Kontext tréningu | Na obrazovke Dnes súťažili pokračovanie, katalóg a ukončenie. Aktívny cvik mal odkaz aj v poradí plánu, na karte sa zobrazovala všeobecná aj plánovaná dávka. | Dnes má jeden odkaz na aktívny cvik. Pri cvičení podľa plánu stačí plánovaná dávka. Katalóg sa otvára zo spodnej navigácie. |
| Katalóg | Odkazy na svalové partie zostávali viditeľné na detaile. Krátke spätné odkazy smerovali na rovnakú obrazovku ako spodná navigácia. | Partie vidno iba v katalógu. Spätný odkaz má vlastné miesto tam, kde vedie do odlišnej nadradenej sekcie. |
| Rozcvička | Horný návrat na Dnes opakoval stále dostupnú navigáciu. | Spodná akcia dokončí rozcvičku a počas tréningu otvorí aktívny cvik. |
| História | Prázdne porovnanie ukazovalo prepínače s prázdnymi výsledkami. | Kým chýba tréning, obrazovka ukazuje podmienku na zobrazenie porovnania. |
| Technika | Pri niektorých pohyboch bolo ťažšie rozpoznať perspektívu statickej ilustrácie. | Schémy rozpažovania na stroji a kladke, face pullu a tlaku proti otáčaniu sú označené ako pohľad zhora. |

V zachytených stavoch nebol vodorovný presah. Kontrast základného a sekundárneho textu na hlavnom podklade je približne 14,5 : 1 a 6,5 : 1. Biele popisy primárneho tlačidla a priameho zapojenia na mape majú približne 9,8 : 1 a 5,3 : 1. Tieto hodnoty sa týkajú uvedených párov farieb.

Meranie prebehlo v emulovaných viewportoch. Rozloženie na fyzickom telefóne a Safari nebolo súčasťou kontroly. Videa sa v existujúcom teste načítavajú a kontroluje sa prehrávanie či posun v čase. Podrobná revízia každého rámca videa bola mimo tejto kontroly rozhrania. Samostatný offline výstup má približne 2,9 MB, pretože zahŕňa ilustrácie a videá.

Na zopakovanie kontroly slúži [testovací príkaz](../tests/README.md).
