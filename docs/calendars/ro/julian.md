---
title: Calendarul iulian (stilul vechi)
label: Iulian (stil vechi)
summary: >-
  Calendarul introdus de Iulius Cezar în anul 45 î.Hr., cu un an bisect din patru. Este „stilul vechi” al Bisericilor ortodoxe care l-au păstrat; între 1900 și 2100 rămâne cu 13 zile în urma calendarului gregorian.
---

## Descriere

Calendarul iulian are 12 luni, cu aceleași nume și aceleași lungimi ca în calendarul gregorian, și un an de 365 de zile, cu o zi în plus, 29 februarie, în fiecare an care se împarte la 4. Anul mediu are deci 365,25 de zile, cu aproximativ 11 minute mai mult decât anul tropic, așa că datele calendarului rămân în urma anotimpurilor cu o zi la fiecare 128 de ani.

Față de calendarul [gregorian](gregorian.md), diferența a crescut cu câte o zi în fiecare an secular care nu se împarte la 400: 10 zile în 1582, 11 din 1700, 12 din 1800, 13 din 1900. Diferența de 13 zile ține până la 28 februarie 2100 (stil vechi), după care devine de 14 zile. De aceea Crăciunul pe stil vechi, 25 decembrie, cade astăzi la 7 ianuarie, iar 1 ianuarie pe stil vechi la 14 ianuarie.

## Istorie

Iulius Cezar a reformat calendarul roman în anul 46 î.Hr., cu sfatul astronomului alexandrin Sosigene, iar noul calendar a intrat în vigoare la 1 ianuarie 45 î.Hr. Anul 46 î.Hr. a avut 445 de zile, ca să readucă lunile în dreptul anotimpurilor. După moartea lui Cezar, pontifii au pus greșit o zi bisectă la trei ani în loc de patru; Augustus a îndreptat greșeala, lăsând câțiva ani fără zi bisectă.

Calendarul iulian a devenit calendarul Imperiului Roman și apoi al Bisericii. Sinodul I Ecumenic (Niceea, 325) a cerut ca Paștile să fie serbate de toți în aceeași zi, iar calculul lor, făcut la Alexandria, s-a sprijinit pe calendarul iulian și pe un ciclu lunar de 19 ani; din el s-a format pascalia iuliană, folosită și astăzi de Bisericile ortodoxe.

Reforma gregoriană din 1582 a înlocuit treptat calendarul iulian în viața civilă. În Biserică el s-a păstrat ca „stil vechi”: îl folosesc Bisericile Ierusalimului, Rusiei, Serbiei și Georgiei și Muntele Athos, iar aproape toate celelalte Biserici ortodoxe calculează și astăzi Paștile după el. Biserica Ortodoxă Română l-a folosit până la 30 septembrie 1924 (stil vechi), când a trecut la [calendarul iulian îndreptat](gregorian.md).

## Metoda de calcul

Calendarul iulian se convertește tot prin [ziua iuliană](julian-day.md). O dată iuliană *(an, lună, zi)* devine număr de zi cu formula (împărțiri întregi, cu rotunjire în jos):

```
a = (14 − lună) / 12
y = an + 4800 − a
m = lună + 12·a − 3
JDN = zi + (153·m + 2) / 5 + 365·y + y/4 − 32083
```

Este formula calendarului gregorian, fără corecția anilor seculari. Drumul invers desface aceleași cicluri de 4 ani și de 5 luni. Calculul se face în [`tools/lib/calendar.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar.ts), cu funcțiile `julianToJdn` și `jdnToJulian`; același calcul dă datele pe stil vechi din paginile tradițiilor.

## Referințe

- Macrobius, *Saturnalia*, cartea I, capitolul 14 (reforma lui Cezar).
- Denis Feeney, *Caesar's Calendar: Ancient Time and the Beginnings of History*, University of California Press, 2007.
- E. G. Richards, *Mapping Time: The Calendar and its History*, Oxford University Press, 1998.
- E. M. Reingold, N. Dershowitz, *Calendrical Calculations: The Ultimate Edition*, ed. a 4-a, Cambridge University Press, 2018.
- Ene Braniște, Ecaterina Braniște, *Dicționar enciclopedic de cunoștințe religioase*, Editura Diecezană, Caransebeș, 2001, articolele „Calendar” și „Pascalie”.
- Wikipedia: [Calendarul iulian](https://ro.wikipedia.org/wiki/Calendarul_iulian), [Julian calendar](https://en.wikipedia.org/wiki/Julian_calendar).
