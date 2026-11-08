---
title: The Ethiopian calendar
label: Ethiopian
summary: >-
  The official calendar of Ethiopia and the calendar of the Ethiopian Orthodox Tewahedo Church: the same months as the Coptic calendar, but years counted from the Incarnation according to the Alexandrian computation, 7–8 years behind the usual Christian era.
---

## Description

The Ethiopian year has 12 months of 30 days — Meskerem, Tikimt, Hidar, Tahsas, Tir, Yekatit, Megabit, Miyazya, Ginbot, Sene, Hamle and Nehase — and the short month of Pagume, of 5 or 6 days. The new year, Enkutatash, falls on 1 Meskerem, that is on 11 September, or on 12 September in the year before a Gregorian leap year. The months and days are those of the [Coptic calendar](coptic.md); only the count of the years differs.

The usual era, *Amete Mihret* ("years of mercy"), counts the years from the Incarnation, which the Alexandrian computation placed 7–8 years later than Dionysius Exiguus did: the year 2019 began on 11 September 2026. An older era, *Amete Alem* ("years of the world"), adds 5500 years.

It is the official calendar of Ethiopia and the liturgical calendar of the Ethiopian Orthodox Tewahedo Church and of the Eritrean Orthodox Tewahedo Church. In Ethiopia the hours are often counted from sunrise, so that 1 o'clock in the morning is the seventh hour after midnight; the site shows only the date.

## History

The calendar comes from the Alexandrian calendar, the Egyptian calendar as reformed by Augustus, and reached Ethiopia with Christianity in the 4th century. The era of the Incarnation goes back to the computation of the monk Annianus of Alexandria, at the beginning of the 5th century, who placed the creation of the world in 5492 BC and the Incarnation 5500 years later. The science of calendar and Paschal computation, *Bahire Hasab*, has remained a tradition of the Ethiopian clergy.

## Method of calculation

The computation is the Coptic one with another origin: 1 Meskerem of the year 1 (29 August AD 8, Old Style) is [Julian Day](julian-day.md) 1,724,221, and (integer divisions)

```
JDN = 1724221 + 365·(year − 1) + year/4 + 30·(month − 1) + day − 1
```

A year is a leap year when it leaves 3 when divided by 4. *Amete Alem* years are found by adding 5500. The site computes the date in [`tools/lib/calendar.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar.ts) (function `jdnToEthiopian`), and the tests compare it day by day with the ICU library, which also gives the month names in Amharic.

## References

- O. Neugebauer, *Ethiopic Astronomy and Computus*, Österreichische Akademie der Wissenschaften, Vienna, 1979.
- Siegbert Uhlig (ed.), *Encyclopaedia Aethiopica*, Harrassowitz, Wiesbaden, 2003–2014, entry "Calendar".
- E. M. Reingold, N. Dershowitz, *Calendrical Calculations: The Ultimate Edition*, 4th ed., Cambridge University Press, 2018.
- Wikipedia: [Ethiopian calendar](https://en.wikipedia.org/wiki/Ethiopian_calendar).
