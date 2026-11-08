---
title: The Islamic (Hijri) calendar
label: Islamic (Hijri)
summary: >-
  The lunar calendar of Islam: 12 months of 29 or 30 days, in a year of 354 or 355 days that goes through all the seasons in about 33 years. Years are counted from the Hijra (622). The site shows the Umm al-Qura calendar of Saudi Arabia; where months begin with the sighting of the new Moon, the date may differ by a day or two.
---

## Description

The Islamic calendar is purely lunar: its months follow the phases of the Moon, with no adjustment to the Sun. The 12 months are Muharram, Safar, Rabi’ al-Awwal, Rabi’ al-Thani, Jumada al-Ula, Jumada al-Akhira, Rajab, Sha’ban, Ramadan (the month of fasting), Shawwal, Dhu al-Qa’da and Dhu al-Hijja (the month of the pilgrimage to Mecca). The year has 354 or 355 days, about 11 days fewer than the solar year, so Ramadan and the other feasts go through all the seasons in about 33 years.

Years are counted from the Hijra, the emigration of the Prophet Muhammad from Mecca to Medina in AD 622 (*Anno Hegirae*, abbreviated AH). The day begins at sunset.

By tradition, a month begins when the crescent of the new Moon is seen after sunset. As visibility depends on place and weather, many countries announce the beginning of the months by observation or by criteria of their own, and dates may differ by a day or two from one country to another. Saudi Arabia uses for civil purposes the computed Umm al-Qura calendar, which the site shows; even there, the beginning of Ramadan and of the feasts is decided by the sighting of the Moon.

## History

The Qur'an speaks of the twelve months of the year and forbids the insertion of a month (*nasī’*), by which the Arabs had kept the year in step with the seasons (sura 9, verses 36–37). The caliph Umar introduced, around 638, the counting of years from the Hijra, with the era beginning on 1 Muharram of the year of the emigration, that is on 16 July 622 (Old Style).

For astronomy and administration, arithmetical calendars were also used, with a 30-year cycle in which 11 years have one more day. The Umm al-Qura calendar, published in Saudi Arabia, is computed astronomically: since 1420 AH (1999), a month begins on the day after the 29th day of the previous month if, on that 29th day, the conjunction of the Moon and the Sun takes place before sunset at Mecca and the Moon sets after the Sun.

## Method of calculation

The site does not compute this calendar itself: it takes it from the ICU library (International Components for Unicode) that comes with Node.js, which contains the tables of the Umm al-Qura calendar for the years 1300–1600 AH (about AD 1882–2174) and uses the arithmetical calendar outside them. The conversion is in [`tools/lib/calendar-systems.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar-systems.ts), in the function `jdnToIslamic`, and the date in Arabic also comes from ICU.

For comparison, in the arithmetical calendar the year *y* has 355 days when `(14 + 11·y) mod 30 < 11` and 354 otherwise; the months have 30 and 29 days in turn, and the last one has 30 days in long years.

## References

- The Qur'an, sura 9 (At-Tawba), verses 36–37, on [Quran.com](https://quran.com/9/36-37).
- Robert Harry van Gent, [*The Umm al-Qura Calendar of Saudi Arabia*](https://webspace.science.uu.nl/~gent0113/islam/ummalqura.htm).
- E. M. Reingold, N. Dershowitz, *Calendrical Calculations: The Ultimate Edition*, 4th ed., Cambridge University Press, 2018.
- ICU, [calendar documentation](https://unicode-org.github.io/icu/userguide/datetime/calendar/).
- Wikipedia: [Islamic calendar](https://en.wikipedia.org/wiki/Islamic_calendar).
