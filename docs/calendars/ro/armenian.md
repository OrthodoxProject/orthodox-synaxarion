---
title: Calendarul armean (era armeană)
label: Armean (era armeană)
summary: >-
  Vechiul calendar al Armeniei, cu anii numărați din 552 d.Hr.: 12 luni de 30 de zile și 5 zile adăugate, fără ani bisecți, așa că anul alunecă prin anotimpuri. A datat manuscrisele și inscripțiile armenești vreme de un mileniu.
---

## Descriere

Anul armean are mereu 365 de zile: 12 luni de 30 de zile — Navasard, Hori, Sahmi, Tre, Kaghoț, Araț, Mehekan, Areg, Ahekan, Mareri, Margaț, Hrotiț — și 5 zile adăugate la sfârșit, Aveleaț („cele de prisos”). Fiindcă nu există ani bisecți, anul nou, 1 Navasard, vine cu o zi mai devreme la fiecare patru ani și face înconjurul întregului an în 1461 de ani armenești. În 2026, 1 Navasard a căzut la 21 iulie (stil nou).

Anii se numără de la anul 552 d.Hr. În manuscrise și inscripții, anul se scria cu literele alfabetului armean, care au și valoare de cifre, după prescurtarea ԹՎ („în anul”): anul 1476 se scrie ԹՎ ՌՆՀԶ.

Biserica Apostolică Armeană urmează azi calendarul gregorian, iar Patriarhia Armeană a Ierusalimului calendarul iulian; era armeană a rămas o eră istorică și culturală.

## Istorie

Biserica Armeană a calculat la început Paștile cu tabelele de 200 de ani ale lui Andrei din Bizanț, primite în Armenia în 352. Când tabelele s-au încheiat, la 11 iulie 552, armenii au început o eră nouă, adoptată, după tradiție, la al doilea Sinod de la Dvin, la mijlocul secolului al VI-lea. Anul de 365 de zile continuă un calendar mai vechi al Armeniei, asemănător celui egiptean și celui persan.

În 1084, învățatul Hovhannes Sarkavag a alcătuit un calendar fix, cu o zi adăugată la patru ani, numit „era mică”, dar acesta nu a înlocuit era cea mare. Datarea după era armeană a rămas obișnuită în manuscrise până în epoca modernă.

## Metoda de calcul

Ziua 1 Navasard a anului 1 (11 iulie 552, stil vechi) este [ziua iuliană](julian-day.md) 1 922 868. Pentru o zi *JDN* (împărțiri întregi):

```
zile        = JDN − 1922868
an          = zile / 365 + 1
ziua anului = zile − 365·(an − 1)      (de la 0 la 364)
lună        = ziua anului / 30 + 1     (luna 13 sunt cele 5 zile adăugate)
zi          = (ziua anului mod 30) + 1
```

Calculul se face în [`tools/lib/calendar-systems.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar-systems.ts), funcția `jdnToArmenian`, după *Calendrical Calculations*.

## Referințe

- Édouard Dulaurier, *Recherches sur la chronologie arménienne, technique et historique*, Imprimerie impériale, Paris, 1859.
- Vlad Bănățeanu, „Le calendrier arménien et les anciens noms des mois”, *Studia et Acta Orientalia*, 10, 1980, p. 33–46.
- Jost Gippert, „Old Armenian and Caucasian Calendar Systems”, *The Annual of the Society for the Study of Caucasia*, 1, 1989, p. 3–12.
- E. M. Reingold, N. Dershowitz, *Calendrical Calculations: The Ultimate Edition*, ed. a 4-a, Cambridge University Press, 2018.
- Wikipedia: [Calendarul armean](https://ro.wikipedia.org/wiki/Calendarul_armean), [Armenian calendar](https://en.wikipedia.org/wiki/Armenian_calendar).
