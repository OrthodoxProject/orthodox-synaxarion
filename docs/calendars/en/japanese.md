---
title: The Japanese calendar (imperial eras)
label: Japanese (imperial era)
summary: >-
  The official calendar of Japan: the months and days of the Gregorian calendar, with years counted by the era of the emperor (nengō). The present era, Reiwa, began on 1 May 2019, at the accession of Emperor Naruhito.
---

## Description

Since 1873 Japan has used the months and days of the Gregorian calendar, but years are counted, in official documents and in everyday life, by the era (*gengō* or *nengō*) of the reigning emperor. The first year of an era is called *gannen* and lasts from the beginning of the era to 31 December; the next year is year 2. The Reiwa era ("beautiful harmony") began on 1 May 2019, so 2026 is the year Reiwa 8 (令和8年).

The eras since the adoption of the Gregorian calendar are Meiji (until 29 July 1912), Taishō (30 July 1912 – 24 December 1926), Shōwa (25 December 1926 – 7 January 1989), Heisei (8 January 1989 – 30 April 2019) and Reiwa.

## History

The first era name, Taika, was given in 645, on the Chinese model. For centuries eras also changed within a reign, after happy events or disasters. Since 1868 (Meiji) the era changes only at the accession of a new emperor, a rule kept by the Era Name Act of 1979. The traditional lunisolar calendar, of Chinese origin, was replaced by the Gregorian one: the 3rd day of the 12th month of the year Meiji 5 became 1 January 1873, the year Meiji 6.

## Method of calculation

The site takes the month and day from the Gregorian calendar and finds the era in which the day falls; the year of the era is the Gregorian year minus the year in which the era began, plus 1. Dates before 1873 are not converted. The computation is in [`tools/lib/calendar-systems.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar-systems.ts) (function `jdnToJapanese`); the date in Japanese comes from the ICU library, with which the tests also compare the computation.

## References

- National Diet Library (Japan), [*The Japanese Calendar*](https://www.ndl.go.jp/koyomi/e/).
- Era Name Act (元号法, *Gengō-hō*), 1979.
- Wikipedia: [Japanese calendar](https://en.wikipedia.org/wiki/Japanese_calendar), [Japanese era name](https://en.wikipedia.org/wiki/Japanese_era_name).
