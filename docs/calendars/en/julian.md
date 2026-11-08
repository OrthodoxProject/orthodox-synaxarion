---
title: The Julian calendar (Old Calendar)
label: Julian (Old Calendar)
summary: >-
  The calendar introduced by Julius Caesar in 45 BC, with a leap year every four years. It is the "Old Calendar" of the Orthodox Churches that kept it; between 1900 and 2100 it runs 13 days behind the Gregorian calendar.
---

## Description

The Julian calendar has 12 months with the same names and lengths as in the Gregorian calendar, and a year of 365 days with one more day, 29 February, in every year divisible by 4. Its mean year is therefore 365.25 days long, about 11 minutes longer than the tropical year, so its dates fall behind the seasons by one day every 128 years.

Compared with the [Gregorian calendar](gregorian.md), the difference grew by one day in every century year not divisible by 400: 10 days in 1582, 11 from 1700, 12 from 1800, 13 from 1900. The difference of 13 days lasts until 28 February 2100 (Old Style), after which it becomes 14 days. This is why Christmas on the Old Calendar, 25 December, now falls on 7 January, and the Old Style 1 January on 14 January.

## History

Julius Caesar reformed the Roman calendar in 46 BC on the advice of the Alexandrian astronomer Sosigenes, and the new calendar came into force on 1 January 45 BC. The year 46 BC had 445 days, to bring the months back in line with the seasons. After Caesar's death the pontiffs wrongly inserted a leap day every three years instead of four; Augustus corrected the mistake by leaving out several leap days.

The Julian calendar became the calendar of the Roman Empire and then of the Church. The First Ecumenical Council (Nicaea, 325) asked that Pascha be celebrated by all on the same day, and its computation, made in Alexandria, rested on the Julian calendar and a lunar cycle of 19 years; from it grew the Julian Paschalion that the Orthodox Churches still use.

The Gregorian reform of 1582 gradually replaced the Julian calendar in civil life. In the Church it remained as the "Old Calendar": the Churches of Jerusalem, Russia, Serbia and Georgia and Mount Athos use it, and almost all the other Orthodox Churches still compute Pascha with it. The Romanian Orthodox Church used it until 30 September 1924 (Old Style), when it adopted the [Revised Julian calendar](gregorian.md).

## Method of calculation

The Julian calendar is also converted through the [Julian Day](julian-day.md). A Julian date *(year, month, day)* becomes a day number with the formula (integer divisions, rounded down):

```
a = (14 − month) / 12
y = year + 4800 − a
m = month + 12·a − 3
JDN = day + (153·m + 2) / 5 + 365·y + y/4 − 32083
```

It is the Gregorian formula without the correction for century years. The way back undoes the same cycles of 4 years and 5 months. The computation is in [`tools/lib/calendar.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar.ts), in the functions `julianToJdn` and `jdnToJulian`; the same computation gives the Old Style dates on the traditions' pages.

## References

- Macrobius, *Saturnalia*, book I, chapter 14 (Caesar's reform).
- Denis Feeney, *Caesar's Calendar: Ancient Time and the Beginnings of History*, University of California Press, 2007.
- E. G. Richards, *Mapping Time: The Calendar and its History*, Oxford University Press, 1998.
- E. M. Reingold, N. Dershowitz, *Calendrical Calculations: The Ultimate Edition*, 4th ed., Cambridge University Press, 2018.
- Wikipedia: [Julian calendar](https://en.wikipedia.org/wiki/Julian_calendar).
