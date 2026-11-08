---
title: The Syriac calendar (Seleucid era)
label: Syriac (Seleucid era)
summary: >-
  The era used by Syriac-speaking Christians, in the Syriac Churches and the Church of the East: years counted from 312 BC, from Seleucus I, with the months of the Julian calendar under Aramaic names and the year beginning on 1 October.
---

## Description

The Seleucid era, which the Syrians called the "years of the Greeks" (*Anno Graecorum*), counts the years from the reconquest of Babylon by Seleucus I Nicator in 312 BC. Syriac-speaking Christians used it with the months of the [Julian calendar](julian.md), under Aramaic names: Teshrin I (October), Teshrin II (November), Kanun I (December), Kanun II (January), Shvat, Adar, Nisan, Iyar, Hziran, Tammuz, Ab and Ilul (September). The year begins on 1 October, that is on 1 Teshrin I.

The era appears in the Syriac chronicles, in the colophons of manuscripts and in inscriptions: the Nestorian Stele of Xi'an, in China, set up in 781, is dated to the year 1092 of the Greeks. The same month names, applied to the Gregorian calendar, are still used today in the Arabic of Syria, Lebanon, Jordan and Iraq.

## History

Seleucus I, one of the successors of Alexander the Great, counted the years of his reign from the reconquest of Babylon. In Babylon the year 1 began on 1 Nisan (3 April 311 BC); at the Macedonian court the year began in the autumn, in 312 BC. The count went on after the end of the dynasty and became an era of the whole Near East. Jews used it in contracts (the "era of contracts"), some communities until modern times.

Syriac Christians fixed the beginning of the year on 1 October, and Syriac chroniclers dated by the years of the Greeks down to Michael the Syrian in the 12th century; tombstones of the Church of the East in Central Asia use it until the 14th century. Today the Assyrian Church of the East uses the Gregorian calendar (since 1964) and the Ancient Church of the East the Julian calendar. The modern "Assyrian calendar", with years counted from 4750 BC, is a 20th-century creation unrelated to the Seleucid era.

## Method of calculation

Starting from the [Julian](julian.md) date *(year, month, day)*:

```
year of the Greeks = year + 312   for October–December
year of the Greeks = year + 311   for January–September
```

The day is that of the Julian calendar, and the month takes its Syriac name. The computation is in [`tools/lib/calendar-systems.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar-systems.ts), in the function `jdnToSeleucid`.

## References

- E. J. Bickerman, *Chronology of the Ancient World*, 2nd ed., Thames & Hudson, London, 1980.
- Wikipedia: [Seleucid era](https://en.wikipedia.org/wiki/Seleucid_era).
