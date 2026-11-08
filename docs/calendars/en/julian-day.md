---
title: The Julian Day
label: Julian Day
summary: >-
  The number of days elapsed since 1 January 4713 BC (Julian calendar), used by astronomers to reckon time without years and months. Every conversion between calendars on this site goes through it.
---

## Description

The Julian Day (abbreviated JD) counts days continuously from noon on 1 January 4713 BC of the Julian calendar, which is 24 November 4714 BC in the Gregorian calendar extended backwards. The Julian Day Number (JDN) of a date is the whole number that begins at its noon: 1 January 2000 has the number 2,451,545. Astronomers also use fractions of a day: JD 2,451,544.5 is the midnight before that noon. For smaller numbers there is the Modified Julian Date, MJD = JD − 2,400,000.5, which begins at midnight.

As it has no years, months or weeks, the Julian Day is a bridge between calendars: any date becomes a day number, and the number becomes a date of any other calendar. The difference between two numbers is the number of days between the dates, and the remainder of the division by 7 gives the day of the week.

## History

In 1583, in *De emendatione temporum*, Joseph Scaliger proposed the "Julian period" of 7980 years, the product of three cycles used in chronology: the solar cycle of 28 years, after which the days of the week return to the same dates of the Julian calendar, the lunar cycle of 19 years, on which the Paschalion rests, and the [indiction](byzantine.md) of 15 years. All three last began together in 4713 BC, before every historical date Scaliger knew. The name comes from the Julian year, on which the period is built. In the 19th century the astronomer John Herschel proposed counting days from the beginning of the period, and the Julian Day became the everyday tool of astronomy.

## Method of calculation

The conversion formulas are those on the pages of the [Gregorian calendar](gregorian.md) and the [Julian calendar](julian.md). On this site, the Gregorian date of the day is first turned into its Julian Day Number, from which all the other dates are computed. The functions are in [`tools/lib/calendar.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar.ts).

## References

- Joseph Justus Scaliger, *De emendatione temporum*, Paris, 1583.
- John F. W. Herschel, *Outlines of Astronomy*, London, 1849.
- Jean Meeus, *Astronomical Algorithms*, 2nd ed., Willmann-Bell, 1998, chapter 7.
- Sean E. Urban, P. Kenneth Seidelmann (eds.), *Explanatory Supplement to the Astronomical Almanac*, 3rd ed., University Science Books, 2013.
- Wikipedia: [Julian day](https://en.wikipedia.org/wiki/Julian_day).
