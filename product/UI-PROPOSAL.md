# Návrh redizajnu Exehel

Schválený smer. Etapy a stav implementácie sú v [TODO](../TODO.md). Podklady sú v [audite a výskume](UI-RESEARCH.md).

## Čo má mať prednosť

| Poradie | Používateľská úloha | Miesto v rozhraní |
| --- | --- | --- |
| 1 | Začať, pokračovať a odcvičiť tréning | **Dnes** s jednou hlavnou akciou. Po spustení sa otvorí prehľad tréningu alebo aktívny cvik. |
| 2 | Rozumieť cviku a zapísať série | Aktívny cvik s krátkou technikou, okamžite dostupnou ukážkou, minulými hodnotami a zápisom na jednej obrazovke. |
| 3 | Pripraviť tréning na ďalšiu návštevu | **Plány**. Najprv vlastné a pripravené zostavy, potom editor plánu. |
| 4 | Zistiť progres a čo ešte precvičiť | **História**. Najprv ukončené tréningy, potom porovnanie vybraných tréningov, pokrytie a odporúčania. |
| 5 | Vyhľadať techniku alebo náhradu | **Cviky**. Rýchle vyhľadávanie a filtre podľa partie a vybavenia. Rovnaký výber sa otvára aj z plánovača a počas tréningu. |
| 6 | Rozcvička, exporty a ďalšie informácie | Rozcvička pri štarte tréningu. CSV a JSON v Histórii pod správou dát. Svalovica a informácie o klube v pomoci. |

## Ako funguje tréning

**Dnes** dostane jednu hlavnú akciu podľa stavu. Pri rozpracovanom tréningu je to **Pokračovať v tréningu**. Pri zvolenom pláne **Začať tréning**. Prvý používateľ vidí odporúčanú šablónu a možnosť spustiť voľný tréning. Rozcvička je vedľa štartu ako voliteľný krok.

**Aktívny cvik** ukáže názov v oboch jazykoch, pozíciu v pláne, počet sérií a jednu konkrétnu technickú pomôcku. Akcia **Technika** otvorí podrobný návod, video a svalovú ilustráciu. Návrat zachová rozpísaný zápis aj polohu v tréningu. Zápis je hneď pod názvom cviku. **Uložiť a pokračovať** potvrdí série naraz a otvorí ďalší cvik. V prehľade tréningu sa dá preskočiť poradie alebo vymeniť obsadený cvik.

**Svaly** sa počas aktívneho tréningu dajú otvoriť z tréningovej lišty naprieč sekciami. Pri treťom cviku na rovnaký hlavný sval sa pri výbere zobrazí konkrétny sval a akcie **Vybrať iný** a **Pokračovať**. Historické pokrytie má vlastný kontext v Histórii a používa rovnakú anatómiu aj pomenovania.

## Zápis na mobile

- Pri opakovaní cviku sú posledné hodnoty viditeľné. **Použiť minulé** ich vyplní do dnešných riadkov, ktoré sa dajú upraviť. Záznam vznikne po uložení cviku.
- Pri rovnakých sériách stačí vyplniť prvú. Akcia **Použiť aj pre ďalšie série** skopíruje hodnoty do prázdnych riadkov. Vyplnené rozdiely si zachovajú vlastné hodnoty.
- Viditeľné názvy polí a číselná klávesnica podľa typu. Hmotnosť môžeš zadať s čiarkou aj bodkou. Výdrž používa sekundy, cvik bez pridanej záťaže vynechá pole pre kilogramy, jednostranný cvik jasne označí stranu. Pri jednoručkách sa zobrazuje „kg na činku“.
- Zadanie sa priebežne drží ako koncept. Po obnovení stránky sa dá pokračovať. Chybu zobrazíme pri príslušnom poli a aktívne pole má zostať viditeľné nad klávesnicou.

## Plánovanie, história a katalóg

**Editor plánu** je zoznam cvikov v poradí tréningu. Každý riadok obsahuje názov, plánované série a cieľ opakovaní. Po ťuknutí možno upraviť dávku. Poradie sa dá meniť aj bez ťahania. **Pridať cvik** otvorí vyhľadateľný výber. Na obrazovke zostavy sa ukáže krátke zhrnutie svalového pokrytia a prípadné upozornenia. Podrobná mapa sa otvorí samostatne.

**História** je zoznam tréningov zoradených podľa dátumu. Detail ukáže jednotlivé cviky, série a údaje z poslednej návštevy, keď sú dostupné. **Porovnať pokrytie** má rýchly výber posledných dvoch alebo troch tréningov. Pod mapou sú najprv chýbajúce hlavné partie a konkrétne návrhy na pridanie do plánu.

**Katalóg** má jednoduché riadky s názvom, svalovou skupinou a prípadným štítkom **Základ**. Detail cviku je samostatná obrazovka. Zdieľa obsah s technikou v tréningu. Náhrady sa ponúkajú pri konkrétnom cviku.

## Vizuálny smer a kritériá na schválenie

Spodná navigácia má štyri stále položky **Dnes**, **Plány**, **Cviky** a **História**. Rozhranie používa neutrálne povrchy a jednu olivovozelenú akcentovú farbu. Jedna hlavná akcia na obrazovku, zoznamy s jemným oddelením, väčšie čísla v zápise a žiadne vnorené rozbaľovanie. Krátke stavy a varovania majú textové označenie.

Pri schvaľovaní si vyskúšať hlavne otvorenie tréningu, vyplnenie minulých sérií jedným ťuknutím, zadanie rovnakých sérií a návrat z techniky do rozpracovaného zápisu. Pred vydaním overiť mobilné dotykové ciele, klávesnicu, navigáciu Späť, pokračovanie po obnovení stránky, ukončenie tréningu a import starej zálohy. Zachovanie adresy, kľúčov úložiska a identifikátorov cvikov umožní nadviazať na už používané dáta.
