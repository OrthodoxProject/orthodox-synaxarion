---
title: The Hebrew calendar
label: Hebrew
summary: >-
  The lunisolar calendar of Judaism: months of 29 or 30 days following the phases of the Moon, and a month added in 7 years out of 19 so that the feasts stay in their season. Years are counted from the creation of the world, reckoned in 3761 BC; the day begins at sunset.
---

## Description

The Hebrew calendar fits the months to the Moon and the years to the Sun. A month has 29 or 30 days, the length of a cycle of the Moon's phases; a common year has 12 months (353, 354 or 355 days) and a "full" year 13, by doubling the month of Adar (383, 384 or 385 days). In every 19-year cycle there are 7 years of 13 months: years 3, 6, 8, 11, 14, 17 and 19 of the cycle.

The months are Tishri, Heshvan, Kislev, Tevet, Shevat, Adar (Adar I and Adar II in years of 13 months), Nisan, Iyar, Sivan, Tammuz, Av and Elul. The year begins on 1 Tishri, with Rosh Hashanah; in Scripture, however, the first month is Nisan, the month of Passover (Pesach).

Years are counted from the creation of the world (*Anno Mundi*), which rabbinic tradition places in 3761 BC: the year 5787 began on 12 September 2026. The day begins at sunset, so feasts begin on the evening before their date; the site shows the daytime date.

## History

In the time of the Second Temple, the beginning of each month was proclaimed by the Sanhedrin on the testimony of those who had seen the crescent of the new Moon, and the 13th month was added when spring was late. Tradition attributes the fixed, computed calendar to the patriarch Hillel II (around 359), who is said to have made the rules public so that the communities of the diaspora could use them. The rules were fully described by Maimonides in the 12th century, in the *Mishneh Torah*, in the Laws of the Sanctification of the New Moon, and have not changed since.

For Christians, the Hebrew calendar is tied to Pascha: Christ suffered in the days of the Jewish Passover, and some of the first Christians kept Pascha on 14 Nisan.

## Method of calculation

The computation starts from the *molad*, the mean moment of the new Moon. The hour is divided into 1080 "parts", and the mean month lasts 29 days, 12 hours and 793 parts. For the year *y*, the months elapsed since the creation and the day of the molad of Tishri are (integer divisions):

```
months = (235·y − 234) / 19
parts  = 12084 + 13753·months
days   = 29·months + parts / 25920
```

13,753 parts are the 12 hours and 793 parts beyond 29 days, 12,084 parts place the first molad (called BaHaRaD), and 25,920 parts make a day. The day is then postponed by the rules called *dehiyyot*: Rosh Hashanah never falls on a Sunday, Wednesday or Friday, and two further rules keep the year to 353–355 or 383–385 days. The length of the year decides whether Heshvan and Kislev have 29 or 30 days. The year *y* has 13 months when `(7·y + 1) mod 19 < 7`.

The site follows the algorithm of *Calendrical Calculations* in [`tools/lib/calendar-systems.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar-systems.ts) (function `jdnToHebrew`); the tests compare it day by day with the ICU library, which also writes the date in Hebrew.

## References

- Maimonides, *Mishneh Torah*, Laws of the Sanctification of the New Moon (*Hilkhot Kiddush ha-Hodesh*), on [Sefaria](https://www.sefaria.org/Mishneh_Torah%2C_Sanctification_of_the_New_Month).
- Arthur Spier, *The Comprehensive Hebrew Calendar*, 3rd ed., Feldheim, 1986.
- E. M. Reingold, N. Dershowitz, *Calendrical Calculations: The Ultimate Edition*, 4th ed., Cambridge University Press, 2018.
- [Hebcal](https://www.hebcal.com/), a Jewish calendar and date converter.
- Wikipedia: [Hebrew calendar](https://en.wikipedia.org/wiki/Hebrew_calendar).
