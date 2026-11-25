# Exehel

Mobilná pomôcka pre začínajúceho silového cvičenca, ktorý chce napredovať v sile a naberať svaly. Prvý používateľ chodí do posilňovne dva až tri razy týždenne. Doma si pripravuje zostavy a sleduje výkony. V posilňovni môže nasledovať šablónu alebo vyberať cviky podľa voľných strojov. Živá mapa pomáha pri voľbe ďalšieho cviku, história pri rozhodovaní o ďalších tréningoch.

## Hlavné postupy

1. **Pred tréningom** si používateľ vyberie uloženú zostavu, predpripravenú šablónu alebo si poskladá vlastný plán. Mapa plánovaného zapojenia pomáha vidieť prekryv pred príchodom do posilňovne.
2. **V posilňovni** si otvorí kartu cviku. Nastavenie, technika, krátka ukážka, svaly aj zápis sérií sú na tej istej karte. Základným postupom je otvoriť cvik, spustiť ho, odcvičiť série a zapísať ich naraz. V rozcvičke si môže pre každú partiu zvoliť variant podľa vybavenia alebo ju vynechať. Výber sa zapamätá v tomto prehliadači.
3. **Po tréningu** si v denníku vyberie ukončené tréningy. Mapa ukáže priame aj pomocné zapojenie a aplikácia ponúkne cviky s chýbajúcim svalom ako hlavným cieľom. Živá mapa aktuálneho tréningu je dostupná aj počas prezerania iných sekcií.
4. **Pri posudzovaní progresu** si stiahne CSV sérií na vlastnú analýzu alebo zdieľanie s trénerom či AI. JSON je záloha na prenesenie denníka, tréningov a plánov.

## Rozhodnutia o návrhu

- Začiatočník má v každej kategórii ľahko nájsť základný cvik a primerané alternatívy. Priorita vyjadruje vhodnosť pre tento program. Pri výbere berieme do úvahy dostupné vybavenie, náročnosť techniky a možnosti progresie.
- Každý cvik má slovenský aj anglický názov, zrozumiteľné nastavenie, konkrétne kontroly techniky, svalovú mapu a odkaz na ukážku príslušnej varianty. Príručka vynecháva mŕtvy ťah podľa preferencie používateľa.
- Upozornenie na prekryv sa ozve pri treťom cviku s rovnakým hlavným svalom v aktuálnom tréningu. Pomocné svaly sa zobrazujú na mape. Spätné porovnanie slúži na plánovanie ďalších tréningov.
- Mapa je orientačné zobrazenie evidovaných cvikov. Farby vyjadrujú úlohu svalu podľa katalógu. O týždennej záťaži rozhoduje aj počet sérií, náročnosť a regenerácia. Väčšie partie majú pri výbere prednosť pred snahou vyfarbiť každý sledovaný sval.
- Osobné záznamy patria do prehliadača alebo do lokálnej zálohy. Pri pridávaní funkcií uprednostňujeme jednoduchý postup na mobile a čitateľnosť existujúcich dát.
