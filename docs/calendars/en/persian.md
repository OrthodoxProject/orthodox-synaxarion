---
title: The Persian (Solar Hijri) calendar
label: Persian (Solar Hijri)
summary: >-
  The official calendar of Iran, also used, with other month names, in Afghanistan: a solar year that begins at the spring equinox, at Nowruz, with years counted from the Hijra (622). It is one of the most accurate solar calendars.
---

## Description

The Persian year begins at Nowruz, the day of the spring equinox, 20 or 21 March. The first six months — Farvardin, Ordibehesht, Khordad, Tir, Mordad, Shahrivar — have 31 days, the next five — Mehr, Aban, Azar, Dey, Bahman — have 30, and the last, Esfand, has 29 or 30. The months thus follow quite closely the passage of the Sun through the signs of the zodiac: in summer, when the Earth is farther from the Sun and the Sun seems to move more slowly, the months are longer.

Years are counted from the Hijra, as in the [Islamic calendar](islamic.md), but in solar years, so there are fewer of them: the year 1405 began on 21 March 2026. The calendar is official in Iran; in Afghanistan it is used with the zodiacal names of the months (Hamal, Sawr, Jawza…).

## History

The calendar continues the Jalali calendar, drawn up in 1079 by a group of astronomers that included the poet and mathematician Omar Khayyam, at the request of the Seljuk sultan Malik-Shah. The Jalali year began at the equinox and was remarkably accurate. The present form, with Persian month names and fixed lengths, was adopted by the Iranian parliament on 31 March 1925 (11 Farvardin 1304).

## Method of calculation

The official rule is astronomical: if the equinox occurs before noon (Iran time), that day is 1 Farvardin; otherwise it is the next day. The site uses the arithmetical rule that the ICU library also uses, with a 33-year cycle in which 8 years are leap years: the year *y* is a leap year when `(25·y + 11) mod 33 < 8`. For the present years the two rules give the same days (the years 1399 and 1403, for example, were leap years), and a check against equinox times computed after Jean Meeus found no difference between 1925 and 2150; they can differ only in years when the equinox falls very close to noon. For a day *JDN* (integer divisions):

```
days        = JDN − 1948320
year        = 1 + (33·days + 3) / 12053
day of year = days − 365·(year − 1) − (8·year + 21) / 33     (from 0)
month       = day of year / 31 + 1          in the first 6 months
month       = (day of year − 6) / 30 + 1    in the others
```

The computation is in [`tools/lib/calendar-systems.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar-systems.ts) (function `jdnToPersian`); the tests compare it day by day with ICU, which also writes the date in Persian.

## References

- Kazimierz M. Borkowski, "The Persian calendar for 3000 years", *Earth, Moon, and Planets*, 74, 1996, pp. 223–230.
- *Encyclopædia Iranica*, entry ["Calendars"](https://www.iranicaonline.org/articles/calendars).
- E. M. Reingold, N. Dershowitz, *Calendrical Calculations: The Ultimate Edition*, 4th ed., Cambridge University Press, 2018.
- Jean Meeus, *Astronomical Algorithms*, 2nd ed., Willmann-Bell, 1998, chapter 27 (equinoxes).
- Wikipedia: [Solar Hijri calendar](https://en.wikipedia.org/wiki/Solar_Hijri_calendar).
