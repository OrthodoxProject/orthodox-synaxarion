---
title: The Indian national calendar (Saka era)
label: Indian national (Saka)
summary: >-
  The official civil calendar of India since 1957, alongside the Gregorian one: a solar year that begins on 22 March (21 March in leap years), with months named after the Hindu months and years counted in the Saka era, from AD 78.
---

## Description

The year begins on 1 Chaitra, that is on 22 March, or on 21 March in leap years. Chaitra has 30 days (31 in leap years), the next five months — Vaishakha, Jyeshtha, Ashadha, Shravana, Bhadra — have 31 each, and the last six — Ashvin, Kartika, Agrahayana, Pausha, Magha, Phalguna — 30 each. The leap years are those of the Gregorian calendar. Years are counted in the Saka era, which begins in AD 78: the year 1948 Saka began on 22 March 2026.

The calendar is used in the official publications of the Indian government (the Gazette of India), on public radio and in government calendars. Hindu, Buddhist and Jain feasts, however, follow lunisolar religious calendars, the *panchang*, which differ from one region to another.

## History

In the 1950s India had dozens of local calendars. In 1952 the government appointed a Calendar Reform Committee, led by the astrophysicist Meghnad Saha, which proposed a single civil calendar and common rules for the religious calendars. The national calendar was adopted from 1 Chaitra 1879 Saka, that is 22 March 1957.

## Method of calculation

For a day of the Gregorian year *Y*: from the beginning of the Saka year (22 March, or 21 March in leap years) onwards, the Saka year is *Y* − 78; before it, *Y* − 79, and the beginning of the year is taken from the previous Gregorian year. The lengths of the months are then subtracted from the number of days since 1 Chaitra: 30 or 31, five times 31, then 30. The computation is in [`tools/lib/calendar-systems.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar-systems.ts) (function `jdnToIndian`); the tests compare it day by day with the ICU library, which also writes the date in Hindi.

## References

- *Report of the Calendar Reform Committee*, Council of Scientific and Industrial Research, New Delhi, 1955.
- E. M. Reingold, N. Dershowitz, *Calendrical Calculations: The Ultimate Edition*, 4th ed., Cambridge University Press, 2018, the chapters on the Hindu calendars.
- Wikipedia: [Indian national calendar](https://en.wikipedia.org/wiki/Indian_national_calendar).
