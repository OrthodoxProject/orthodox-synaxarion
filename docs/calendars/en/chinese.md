---
title: The Chinese calendar
label: Chinese
summary: >-
  The traditional lunisolar calendar of China, which sets the Chinese New Year and the feasts of East Asia: months that begin at the new Moon and a leap month in 7 years out of 19. Years are named from a cycle of 60, with the animals of the Chinese zodiac.
---

## Description

Each month begins on the day of the new Moon and has 29 or 30 days. The year has 12 months (353–355 days) or 13 (383–385 days); the added, "leap" month takes the number of the month it follows. The New Year usually falls on the second new Moon after the winter solstice, between 21 January and 20 February: in 2026 on 17 February, and in 2027 on 6 February.

Years are not numbered but named from a cycle of 60. Ten "heavenly stems" (jiǎ, yǐ, bǐng, dīng, wù, jǐ, gēng, xīn, rén, guǐ), linked two by two to the five elements — wood, fire, earth, metal, water —, combine with twelve "earthly branches" (zǐ, chǒu, yín, mǎo, chén, sì, wǔ, wèi, shēn, yǒu, xū, hài), each with its animal: Rat, Ox, Tiger, Rabbit, Dragon, Snake, Horse, Goat, Monkey, Rooster, Dog, Pig. The year that began on 17 February 2026 is the bǐngwǔ year, of the Fire Horse.

From the Chinese calendar grew the traditional calendars of Korea and Vietnam, and that of Japan until 1873; the Vietnamese one, reckoned on Vietnam's time, sometimes has other dates than the Chinese one.

## History

Chinese lunisolar calendars are attested for more than three thousand years, and the imperial court reformed them dozens of times as astronomy became more accurate. Today's rules come from the Shixian calendar (1645), prepared with the help of the Jesuit Johann Adam Schall von Bell, which introduced the true motion of the Sun. The Republic of China adopted the Gregorian calendar for civil use in 1912, and the traditional calendar remained for the feasts; since 1929 the computations have been made for the meridian of 120° east, the meridian of Beijing time. The rules are now fixed in the Chinese national standard GB/T 33661-2017.

## Method of calculation

The calendar is computed from astronomical positions:

1. Months begin on the day, in China's time (UTC+8), on which the new Moon occurs.
2. The solar year is divided by 24 "solar terms", one every 15° of the Sun's longitude; 12 of them, the principal terms, give the months their numbers: the month in which the winter solstice falls is the 11th month.
3. If there are 13 months from one winter solstice to the next, the first month without a principal term becomes the leap month.

The ICU library, which the site uses for other calendars, makes this computation with approximations that fail when the new Moon falls very close to midnight: for example, it puts the New Year of 2027 on 7 February instead of the 6th. The site therefore uses the conversion tables of the Hong Kong Observatory: the day of the New Year, the leap month and the length of each month were taken from them for the years beginning from 1901 to 2099, and the conversion was checked against every day of the tables. The computation is in [`tools/lib/calendar-systems.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar-systems.ts), in the function `jdnToChinese`; outside 1901–2100 the site shows no Chinese date.

## References

- Helmer Aslaksen, [*The Mathematics of the Chinese Calendar*](https://www.math.nus.edu.sg/aslaksen/calendar/cal.pdf), National University of Singapore.
- Hong Kong Observatory, [*Gregorian-Lunar Calendar Conversion Table*](https://www.hko.gov.hk/en/gts/time/conversion.htm).
- GB/T 33661-2017, *Calculation and promulgation of the Chinese calendar*, national standard of China.
- E. M. Reingold, N. Dershowitz, *Calendrical Calculations: The Ultimate Edition*, 4th ed., Cambridge University Press, 2018.
- Wikipedia: [Chinese calendar](https://en.wikipedia.org/wiki/Chinese_calendar).
