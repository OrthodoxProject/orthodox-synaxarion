---
title: The Armenian calendar (Armenian era)
label: Armenian (Armenian era)
summary: >-
  The old calendar of Armenia, with years counted from AD 552: 12 months of 30 days and 5 added days, with no leap years, so the year drifts through the seasons. It dated Armenian manuscripts and inscriptions for a thousand years.
---

## Description

The Armenian year always has 365 days: 12 months of 30 days — Navasard, Hori, Sahmi, Tre, Kaghots, Arats, Mehekan, Areg, Ahekan, Mareri, Margats, Hrotits — and 5 days added at the end, Aveleats ("the superfluous ones"). As there are no leap years, the new year, 1 Navasard, comes one day earlier every four years and goes round the whole year in 1461 Armenian years. In 2026, 1 Navasard fell on 21 July (New Style).

Years are counted from AD 552. In manuscripts and inscriptions the year was written with the letters of the Armenian alphabet, which also serve as numerals, after the abbreviation ԹՎ ("in the year"): the year 1476 is ԹՎ ՌՆՀԶ.

Today the Armenian Apostolic Church follows the Gregorian calendar, and the Armenian Patriarchate of Jerusalem the Julian calendar; the Armenian era has remained a historical and cultural era.

## History

The Armenian Church first computed Easter with the 200-year tables of Andreas of Byzantium, received in Armenia in 352. When the tables ran out, on 11 July 552, the Armenians began a new era, adopted, according to tradition, at the Second Council of Dvin in the middle of the 6th century. The 365-day year continues an older calendar of Armenia, similar to the Egyptian and Persian ones.

In 1084, the scholar Hovhannes Sarkavag drew up a fixed calendar with a day added every four years, called the "little era", but it did not replace the great era. Dating by the Armenian era remained usual in manuscripts until modern times.

## Method of calculation

1 Navasard of the year 1 (11 July 552, Old Style) is [Julian Day](julian-day.md) 1,922,868. For a day *JDN* (integer divisions):

```
days        = JDN − 1922868
year        = days / 365 + 1
day of year = days − 365·(year − 1)      (0 to 364)
month       = day of year / 30 + 1       (month 13 is the 5 added days)
day         = (day of year mod 30) + 1
```

The computation is in [`tools/lib/calendar-systems.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar-systems.ts), in the function `jdnToArmenian`, after *Calendrical Calculations*.

## References

- Édouard Dulaurier, *Recherches sur la chronologie arménienne, technique et historique*, Imprimerie impériale, Paris, 1859.
- Vlad Bănățeanu, "Le calendrier arménien et les anciens noms des mois", *Studia et Acta Orientalia*, 10, 1980, pp. 33–46.
- Jost Gippert, "Old Armenian and Caucasian Calendar Systems", *The Annual of the Society for the Study of Caucasia*, 1, 1989, pp. 3–12.
- E. M. Reingold, N. Dershowitz, *Calendrical Calculations: The Ultimate Edition*, 4th ed., Cambridge University Press, 2018.
- Wikipedia: [Armenian calendar](https://en.wikipedia.org/wiki/Armenian_calendar).
