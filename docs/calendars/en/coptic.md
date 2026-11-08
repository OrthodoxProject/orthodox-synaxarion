---
title: The Coptic calendar (Era of the Martyrs)
label: Coptic (Era of the Martyrs)
summary: >-
  The calendar of the Coptic Orthodox Church: 12 months of 30 days and a short month of 5 or 6 days, with the year beginning on 11 or 12 September. Years are counted from 284, the accession of Diocletian, under whom many martyrs died.
---

## Description

The Coptic year has 12 months of 30 days — Thout, Paopi, Hathor, Koiak, Tobi, Meshir, Paremhat, Parmouti, Pashons, Paoni, Epip and Mesori (in Arabic: Tut, Babah, Hatur, Kiahk, Tubah, Amshir, Baramhat, Baramuda, Bashans, Bauna, Abib, Mesra) — followed by the little month, Nasie, of 5 days, or 6 in leap years. As in the Julian calendar, one year in four is a leap year, so the Coptic year always keeps the same relation to the Julian calendar. Between 1900 and 2099, 1 Thout falls on 11 September New Style, or on 12 September in the year before a leap year.

Years are counted from 284, the accession of the Emperor Diocletian; the Coptic Church calls them the "years of the martyrs" (*Anno Martyrum*), in memory of the martyrs of his persecution. The new year, Nayrouz, is also the feast of the martyrs.

The Coptic calendar is the liturgical calendar of the Coptic Orthodox Church, whose synaxarium is arranged by its months, and it is still used by Egyptian farmers for the work of the fields.

## History

The Coptic calendar continues the ancient Egyptian civil calendar, which already had 12 months of 30 days and 5 added days but no leap years, so it drifted through the seasons. After the conquest of Egypt, Augustus introduced a leap day every four years, around 25 BC, and the calendar became the Alexandrian calendar. The years of Diocletian were first used in the astronomical and Paschal tables of Alexandria, and the Egyptian Christians kept them as the "Era of the Martyrs".

In 525, Dionysius Exiguus, a monk from Scythia Minor (today's Dobruja, in Romania), continued the Alexandrian Paschal tables but replaced the years of Diocletian, so as not to keep the name of a persecutor, with the years from the Incarnation of Christ: this is how the Christian era was born.

## Method of calculation

The Coptic calendar has the same structure every year, so its link to the [Julian Day](julian-day.md) is a simple formula. 1 Thout of the year 1 (29 August 284, Old Style) is Julian Day 1,825,030; for a date *(year, month, day)* (integer divisions):

```
JDN = 1825030 + 365·(year − 1) + year/4 + 30·(month − 1) + day − 1
```

A Coptic year is a leap year when it leaves 3 when divided by 4. For the way back, the year comes from the number of days elapsed, then the month and day from the day of the year. The site computes the date in [`tools/lib/calendar.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar.ts) (function `jdnToCoptic`), and the tests compare it day by day with the ICU library. The same computation gives the church date on the pages of the Coptic tradition.

## References

- Aziz S. Atiya (ed.), *The Coptic Encyclopedia*, Macmillan, New York, 1991, entry "Calendar, Coptic".
- O. Neugebauer, *Ethiopic Astronomy and Computus*, Österreichische Akademie der Wissenschaften, Vienna, 1979.
- E. M. Reingold, N. Dershowitz, *Calendrical Calculations: The Ultimate Edition*, 4th ed., Cambridge University Press, 2018.
- Wikipedia: [Coptic calendar](https://en.wikipedia.org/wiki/Coptic_calendar).
