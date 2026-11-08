---
title: Ziua iuliană
label: Ziua iuliană
summary: >-
  Numărul zilelor scurse de la 1 ianuarie 4713 î.Hr. (calendarul iulian), folosit de astronomi ca să socotească timpul fără ani și luni. Site-ul trece prin el toate conversiile dintre calendare.
---

## Descriere

Ziua iuliană (*Julian Day*, prescurtat JD) numără zilele în continuu de la amiaza zilei de 1 ianuarie 4713 î.Hr. din calendarul iulian, care este 24 noiembrie 4714 î.Hr. în calendarul gregorian prelungit înapoi. Numărul zilei iuliene (JDN) al unei date este numărul întreg care începe la amiaza ei: 1 ianuarie 2000 are numărul 2 451 545. Astronomii folosesc și fracțiuni de zi: JD 2 451 544,5 este miezul nopții dinaintea acelei amiezi. Pentru numere mai mici se folosește ziua iuliană modificată, MJD = JD − 2 400 000,5, care începe la miezul nopții.

Fiindcă nu are ani, luni sau săptămâni, ziua iuliană e o punte între calendare: orice dată se transformă într-un număr de zi, iar numărul se transformă în data oricărui alt calendar. Diferența dintre două numere este chiar numărul de zile dintre date, iar restul împărțirii la 7 dă ziua săptămânii.

## Istorie

În 1583, în *De emendatione temporum*, Joseph Scaliger a propus „perioada iuliană” de 7980 de ani, produsul a trei cicluri folosite în cronologie: ciclul solar de 28 de ani, după care zilele săptămânii revin la aceleași date ale calendarului iulian, ciclul lunar de 19 ani, pe care se sprijină pascalia, și [indictionul](byzantine.md) de 15 ani. Ultima oară, toate trei au început împreună în 4713 î.Hr., înaintea tuturor datelor istorice pe care le cunoștea Scaliger. Numele vine de la anul iulian, pe care e construită perioada. În secolul al XIX-lea, astronomul John Herschel a propus numărarea zilelor de la începutul perioadei, iar ziua iuliană a devenit unealta obișnuită a astronomiei.

## Metoda de calcul

Formulele de conversie sunt cele din paginile [calendarului gregorian](gregorian.md) și [calendarului iulian](julian.md). Pe site, data gregoriană a zilei se transformă întâi în numărul zilei iuliene, din care se calculează apoi toate celelalte date. Funcțiile sunt în [`tools/lib/calendar.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar.ts).

## Referințe

- Joseph Justus Scaliger, *De emendatione temporum*, Paris, 1583.
- John F. W. Herschel, *Outlines of Astronomy*, Londra, 1849.
- Jean Meeus, *Astronomical Algorithms*, ed. a 2-a, Willmann-Bell, 1998, capitolul 7.
- Sean E. Urban, P. Kenneth Seidelmann (ed.), *Explanatory Supplement to the Astronomical Almanac*, ed. a 3-a, University Science Books, 2013.
- Wikipedia: [Zi iuliană](https://ro.wikipedia.org/wiki/Zi_iulian%C4%83), [Julian day](https://en.wikipedia.org/wiki/Julian_day).
