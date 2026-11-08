---
title: Calendarul siriac (era seleucidă)
label: Siriac (era seleucidă)
summary: >-
  Era folosită de creștinii de limbă siriacă, din Bisericile siriene și din Biserica Răsăritului: anii numărați din 312 î.Hr., de la Seleucos I, cu lunile calendarului iulian purtând nume aramaice și anul începând la 1 octombrie.
---

## Descriere

Era seleucidă, numită de sirieni „anii grecilor” (*Anno Graecorum*), numără anii de la recucerirea Babilonului de către Seleucos I Nicator, în 312 î.Hr. Creștinii de limbă siriacă au folosit-o cu lunile calendarului [iulian](julian.md), cărora le-au dat nume aramaice: Teșrin I (octombrie), Teșrin II (noiembrie), Kanun I (decembrie), Kanun II (ianuarie), Șvat, Adar, Nisan, Iyar, Hziran, Tamuz, Ab și Ilul (septembrie). Anul începe la 1 octombrie, adică la 1 Teșrin I.

Era apare în cronicile siriace, în însemnările de la sfârșitul manuscriselor și în inscripții: Stela nestoriană de la Xi'an, în China, ridicată în 781, e datată în anul 1092 al grecilor. Aceleași nume de luni, puse pe calendarul gregorian, se folosesc și astăzi în araba din Siria, Liban, Iordania și Irak.

## Istorie

Seleucos I, unul dintre urmașii lui Alexandru cel Mare, și-a numărat anii de domnie de la recucerirea Babilonului. La Babilon, anul 1 a început la 1 Nisan (3 aprilie 311 î.Hr.); la curtea macedoneană, anul începea toamna, în 312 î.Hr. Numărătoarea a continuat și după stingerea dinastiei și a devenit o eră a întregului Orient Apropiat. Evreii au folosit-o în contracte („era contractelor”), unele comunități până în epoca modernă.

Creștinii sirieni au fixat începutul anului la 1 octombrie, iar cronicarii de limbă siriacă au datat după anii grecilor până la Mihail Sirianul, în secolul al XII-lea; pietrele funerare ale Bisericii Răsăritului din Asia Centrală o folosesc până în secolul al XIV-lea. Astăzi Biserica Asiriană a Răsăritului folosește calendarul gregorian (din 1964), iar Biserica Veche a Răsăritului calendarul iulian. „Calendarul asirian” modern, cu anii numărați din 4750 î.Hr., este o creație a secolului XX și nu are legătură cu era seleucidă.

## Metoda de calcul

Pornind de la data [iuliană](julian.md) *(an, lună, zi)*:

```
anul grecilor = an + 312   pentru octombrie–decembrie
anul grecilor = an + 311   pentru ianuarie–septembrie
```

Ziua rămâne cea din calendarul iulian, iar luna primește numele siriac. Calculul se face în [`tools/lib/calendar-systems.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar-systems.ts), funcția `jdnToSeleucid`.

## Referințe

- E. J. Bickerman, *Chronology of the Ancient World*, ed. a 2-a, Thames & Hudson, Londra, 1980.
- Wikipedia: [Era seleucidă](https://ro.wikipedia.org/wiki/Era_seleucid%C4%83), [Seleucid era](https://en.wikipedia.org/wiki/Seleucid_era).
