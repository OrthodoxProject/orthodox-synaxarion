---
title: The Gregorian and Revised Julian calendars
label: Gregorian (New Calendar)
summary: >-
  The civil calendar of almost the whole world, introduced in 1582 by Pope Gregory XIII. The Revised Julian calendar, the "New Calendar" of the Romanian Orthodox Church since 1924, has the same dates until the year 2800.
---

## Description

The Gregorian calendar is a solar calendar: the year has 365 days, and one year in four has 366, with 29 February. Century years (1700, 1800, 1900…) are leap years only when divisible by 400, so 2000 was a leap year and 2100 will not be. The mean year is 365.2425 days long, very close to the tropical year, the year of the seasons, of about 365.2422 days; the difference adds up to a day only in some three thousand years.

The Revised Julian calendar, the "New Calendar" of the Romanian Orthodox Church, keeps the months and days of the Julian calendar but has another rule for century years: they are leap years only when the year divided by 900 leaves 200 or 600. From 1 March 1600 to 28 February 2800 the two calendars have exactly the same dates; the first difference comes in 2800, a leap year in the Gregorian calendar but not in the revised one.

On this site, the day pages carry the civil date, which is the Gregorian date, and every other calendar starts from it.

## History

The [Julian calendar](julian.md) had a mean year of 365.25 days, about 11 minutes longer than the tropical year. By the 16th century the spring equinox, which the First Ecumenical Council of Nicaea (325) had found around 21 March, had moved back to 11 March, and the computation of Easter was drifting away from the course of the Moon and the Sun. Pope Gregory XIII promulgated the reform with the bull *Inter gravissimas* (24 February 1582), following the proposal of the physician and astronomer Aloysius Lilius, worked out by the mathematician Christopher Clavius. To bring the equinox back to 21 March, Thursday 4 October 1582 was followed by Friday 15 October 1582.

Catholic countries adopted the reform at once, Protestant countries in the 17th and 18th centuries, and Orthodox countries only in the 20th century. Romania adopted the Gregorian calendar for civil use in 1919: 31 March 1919 was followed by 14 April 1919.

The Revised Julian calendar was proposed by the Serbian astronomer Milutin Milanković and adopted at the Pan-Orthodox Congress of Constantinople in 1923. The Ecumenical Patriarchate and the Church of Greece took it up in March 1924, and the Romanian Orthodox Church in the same year, when 1 October 1924 became 14 October. Pascha, however, is still computed on the Julian calendar (the Julian Paschalion) by almost every Orthodox Church, so that it remains the same day throughout Orthodoxy; the best-known exception is the Orthodox Church of Finland. The Churches of Jerusalem, Russia, Serbia and Georgia, as well as Mount Athos, kept the Julian calendar, the [Old Calendar](julian.md).

## Method of calculation

Every conversion on this site goes through the [Julian Day](julian-day.md), a count of days from a fixed origin. A Gregorian date *(year, month, day)* becomes a day number as follows (all divisions are integer divisions, rounded down):

```
a = (14 − month) / 12
y = year + 4800 − a
m = month + 12·a − 3
JDN = day + (153·m + 2) / 5 + 365·y + y/4 − y/100 + y/400 − 32045
```

The formula counts the year from 1 March, so that the leap day falls at its end; `(153·m + 2) / 5` adds the days of the past months and `y/4 − y/100 + y/400` the leap days. The way back undoes the cycles of 400, 100 and 4 years in turn. For the Revised Julian calendar the site uses the same formulas, which is exact for the years 1600–2799.

The computation is in [`tools/lib/calendar.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar.ts), in the functions `gregorianToJdn` and `jdnToGregorian`.

## References

- Gregory XIII, bull *Inter gravissimas*, 24 February 1582 ([Wikipedia](https://en.wikipedia.org/wiki/Inter_gravissimas)).
- G. V. Coyne, M. A. Hoskin, O. Pedersen (eds.), *Gregorian Reform of the Calendar: Proceedings of the Vatican Conference to Commemorate its 400th Anniversary, 1582–1982*, Specola Vaticana, 1983.
- E. G. Richards, *Mapping Time: The Calendar and its History*, Oxford University Press, 1998.
- E. M. Reingold, N. Dershowitz, *Calendrical Calculations: The Ultimate Edition*, 4th ed., Cambridge University Press, 2018.
- Claus Tøndering, [*Frequently Asked Questions about Calendars*](https://www.tondering.dk/claus/calendar.html).
- Wikipedia: [Gregorian calendar](https://en.wikipedia.org/wiki/Gregorian_calendar), [Revised Julian calendar](https://en.wikipedia.org/wiki/Revised_Julian_calendar).
