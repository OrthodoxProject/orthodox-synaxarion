---
title: The Bahá'í (Badíʿ) calendar
label: Bahá'í
summary: >-
  The calendar of the Bahá'í Faith: 19 months of 19 days and another 4 or 5 days, with the new year (Naw-Rúz) at the spring equinox. Years are counted from 1844; the day begins at sunset.
---

## Description

The Badíʿ ("new", "wondrous") calendar has 19 months of 19 days, 361 days in all, and before the last month 4 or 5 days are added, Ayyám-i-Há, as many as are needed for the next year to begin at the equinox again. The months are named after attributes of God: Bahá (Splendour), Jalál (Glory), Jamál (Beauty), ʻAẓamat (Grandeur), Núr (Light), Raḥmat (Mercy), Kalimát (Words), Kamál (Perfection), Asmáʼ (Names), ʻIzzat (Might), Mashíyyat (Will), ʻIlm (Knowledge), Qudrat (Power), Qawl (Speech), Masáʼil (Questions), Sharaf (Honour), Sulṭán (Sovereignty), Mulk (Dominion) and ʻAláʼ (Loftiness). The last month, ʻAláʼ, is the month of fasting.

The new year, Naw-Rúz, is the day of the spring equinox, 20 or 21 March. Years are counted from 1844, the year in which the Báb declared his mission: the year 183 began on 21 March 2026. The day begins at sunset; the site shows the daytime date.

## History

The calendar was established by the Báb in the Persian *Bayán* and confirmed by Bahá'u'lláh in the *Kitáb-i-Aqdas*, which set Naw-Rúz on the day the Sun enters the sign of Aries. For a long time the communities of the West used a simplified form, with Naw-Rúz fixed on 21 March and the days of Ayyám-i-Há following the Gregorian leap years. From Naw-Rúz 2015 (the year 172), the Universal House of Justice put the calendar into effect throughout the world, with Tehran as the point of reference: Naw-Rúz is the day, reckoned from sunset to sunset in Tehran, in which the equinox falls.

## Method of calculation

For 2015–2064, the site takes the date of Naw-Rúz from the table published by the Bahá'í World Centre, computed from the moment of the equinox and the time of sunset in Tehran; the table was checked against equinox times computed after Jean Meeus. For 1844–2014 it uses the earlier form, with Naw-Rúz on 21 March. With *d* the number of days since Naw-Rúz, counting from 0:

```
if d < 342:   month = d / 19 + 1, day = (d mod 19) + 1
Ayyám-i-Há:   (next Naw-Rúz − Naw-Rúz) − 361 days, after the 18th month
then:         month 19, ʻAláʼ
```

The computation is in [`tools/lib/calendar-systems.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar-systems.ts), in the function `jdnToBahai`. Outside 1844–2064 the site shows no Bahá'í date.

## References

- Bahá'u'lláh, [*Kitáb-i-Aqdas*](https://www.bahai.org/library/authoritative-texts/bahaullah/kitab-i-aqdas/), with the notes on the calendar.
- The Universal House of Justice, [letter of 10 July 2014](https://www.bahai.org/library/authoritative-texts/the-universal-house-of-justice/messages/20140710_001/1) to the Bahá'ís of the world, on the Badíʿ calendar.
- Bahá'í World Centre, *Bahá'í Dates 172 to 221 B.E.*, the table of the dates of Naw-Rúz and of the holy days for 2015–2065.
- E. M. Reingold, N. Dershowitz, *Calendrical Calculations: The Ultimate Edition*, 4th ed., Cambridge University Press, 2018.
- Jean Meeus, *Astronomical Algorithms*, 2nd ed., Willmann-Bell, 1998, chapter 27 (equinoxes).
- Wikipedia: [Baháʼí calendar](https://en.wikipedia.org/wiki/Bah%C3%A1%CA%BC%C3%AD_calendar).
