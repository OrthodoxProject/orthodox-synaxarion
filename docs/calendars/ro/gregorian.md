---
title: Calendarul gregorian și calendarul iulian îndreptat
label: Gregorian (stil nou)
summary: >-
  Calendarul civil al aproape întregii lumi, introdus în 1582 de papa Grigorie al XIII-lea. Calendarul iulian îndreptat, „stilul nou” al Bisericii Ortodoxe Române din 1924, are aceleași date până în anul 2800.
---

## Descriere

Calendarul gregorian este un calendar solar: anul are 365 de zile, iar un an din patru are 366, cu 29 februarie. Anii seculari (1700, 1800, 1900…) sunt bisecți numai dacă se împart la 400, așa că 2000 a fost bisect, iar 2100 nu va fi. Anul mediu are 365,2425 de zile, foarte aproape de anul tropic, anul anotimpurilor, de aproximativ 365,2422 de zile; diferența se adună la o zi abia în vreo trei mii de ani.

Calendarul iulian îndreptat (sau revizuit), „stilul nou” al Bisericii Ortodoxe Române, păstrează lunile și zilele calendarului iulian, dar are altă regulă pentru anii seculari: aceștia sunt bisecți numai când împărțirea anului la 900 dă restul 200 sau 600. Între 1 martie 1600 și 28 februarie 2800, cele două calendare au exact aceleași date; prima deosebire apare în 2800, an bisect în calendarul gregorian, dar nu și în cel îndreptat.

Pe site, paginile zilelor poartă data civilă, adică data gregoriană, iar toate celelalte calendare pornesc de la ea.

## Istorie

Calendarul [iulian](julian.md) avea anul mediu de 365,25 de zile, cu aproximativ 11 minute mai lung decât anul tropic. Până în secolul al XVI-lea, echinocțiul de primăvară, pe care Sinodul I Ecumenic de la Niceea (325) îl găsise în jurul datei de 21 martie, ajunsese pe 11 martie, iar calculul Paștilor se depărta de mersul Lunii și al Soarelui. Papa Grigorie al XIII-lea a promulgat reforma prin bula *Inter gravissimas* (24 februarie 1582), după propunerea medicului și astronomului Aloysius Lilius, pusă la punct de matematicianul Christophorus Clavius. Pentru a readuce echinocțiul pe 21 martie, după joi 4 octombrie 1582 a urmat vineri 15 octombrie 1582.

Țările catolice au adoptat reforma îndată, cele protestante în secolele XVII–XVIII, iar țările ortodoxe abia în secolul XX. România a trecut la calendarul gregorian pentru uz civil în 1919: după 31 martie 1919 a urmat 14 aprilie 1919.

Calendarul iulian îndreptat a fost propus de astronomul sârb Milutin Milanković și adoptat la Congresul panortodox de la Constantinopol din 1923. Patriarhia Ecumenică și Biserica Greciei l-au primit în martie 1924, iar Biserica Ortodoxă Română în același an: ziua de 1 octombrie 1924 a devenit 14 octombrie. Paștile se calculează însă în continuare după calendarul iulian (pascalia iuliană) în aproape toate Bisericile ortodoxe, ca să rămână aceeași zi în toată Ortodoxia; excepția cea mai cunoscută este Biserica Ortodoxă a Finlandei. Bisericile Ierusalimului, Rusiei, Serbiei și Georgiei, precum și Muntele Athos, au păstrat calendarul iulian, [stilul vechi](julian.md).

## Metoda de calcul

Toate conversiile de pe site trec prin [ziua iuliană](julian-day.md), numărul zilelor scurse de la un moment fix. O dată gregoriană *(an, lună, zi)* devine număr de zi astfel (toate împărțirile sunt întregi, cu rotunjire în jos):

```
a = (14 − lună) / 12
y = an + 4800 − a
m = lună + 12·a − 3
JDN = zi + (153·m + 2) / 5 + 365·y + y/4 − y/100 + y/400 − 32045
```

Formula socotește anul de la 1 martie, ca ziua bisectă să cadă la sfârșitul lui; `(153·m + 2) / 5` adună zilele lunilor scurse, iar `y/4 − y/100 + y/400` zilele bisecte. Drumul invers desface, pe rând, ciclurile de 400, 100 și 4 ani. Pentru calendarul iulian îndreptat, site-ul folosește aceleași formule, ceea ce este exact pentru anii 1600–2799.

Calculul se face în [`tools/lib/calendar.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar.ts), cu funcțiile `gregorianToJdn` și `jdnToGregorian`.

## Referințe

- Grigorie al XIII-lea, bula *Inter gravissimas*, 24 februarie 1582 ([Wikipedia](https://en.wikipedia.org/wiki/Inter_gravissimas)).
- G. V. Coyne, M. A. Hoskin, O. Pedersen (ed.), *Gregorian Reform of the Calendar: Proceedings of the Vatican Conference to Commemorate its 400th Anniversary, 1582–1982*, Specola Vaticana, 1983.
- E. G. Richards, *Mapping Time: The Calendar and its History*, Oxford University Press, 1998.
- E. M. Reingold, N. Dershowitz, *Calendrical Calculations: The Ultimate Edition*, ed. a 4-a, Cambridge University Press, 2018.
- Ene Braniște, Ecaterina Braniște, *Dicționar enciclopedic de cunoștințe religioase*, Editura Diecezană, Caransebeș, 2001, articolele „Calendar” și „Pascalie”.
- Claus Tøndering, [*Frequently Asked Questions about Calendars*](https://www.tondering.dk/claus/calendar.html).
- Wikipedia: [Calendarul gregorian](https://ro.wikipedia.org/wiki/Calendarul_gregorian), [Revised Julian calendar](https://en.wikipedia.org/wiki/Revised_Julian_calendar).
