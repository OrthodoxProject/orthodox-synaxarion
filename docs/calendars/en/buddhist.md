---
title: The Buddhist era (Thai calendar)
label: Buddhist (Buddhist era)
summary: >-
  Years counted from the death of the Buddha (parinirvana), placed by tradition in 543 BC. Thailand uses it officially with the months and days of the Gregorian calendar, so the Buddhist year is the Christian year plus 543.
---

## Description

The Buddhist era (abbreviated B.E.) counts the years from the parinirvana, the Buddha's entry into nirvana at his death. Thailand uses it as its official era, in the Thai solar calendar, which has the months and days of the Gregorian calendar and a year beginning on 1 January: the year 2569 of the Buddhist era is 2026.

In Sri Lanka, Myanmar, Cambodia and Laos, the Buddhist era is used in the religious calendars, which are lunisolar: the year begins in spring, in April or at Vesak, the feast of the birth, enlightenment and death of the Buddha, and in some of these countries the count is one year ahead (the Christian year plus 544). The site shows the Thai form.

## History

The Theravada tradition, preserved in the chronicles of Sri Lanka, places the death of the Buddha in 544/543 BC. Historians today place it later, usually around 480 BC or even towards 400 BC. Siam (Thailand) adopted a solar calendar in 1888, with years counted from the founding of Bangkok; in 1912 it changed to the Buddhist era, and the new year, which had fallen on 1 April, was moved to 1 January from 1941, so that the year 2483 had only nine months.

## Method of calculation

```
year of the Buddhist era = Gregorian year + 543
```

The month and day are the Gregorian ones. For dates before 1941, when the Thai year began on 1 April, the rule does not apply to January–March. The computation is in [`tools/lib/calendar-systems.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar-systems.ts) (function `jdnToBuddhist`), and the date in Thai comes from the ICU library, with which the tests also compare the computation.

## References

- Heinz Bechert (ed.), *The Dating of the Historical Buddha*, 3 vols., Vandenhoeck & Ruprecht, Göttingen, 1991–1997.
- J. C. Eade, *The Calendrical Systems of Mainland South-East Asia*, Brill, Leiden, 1995.
- Wikipedia: [Thai solar calendar](https://en.wikipedia.org/wiki/Thai_solar_calendar), [Buddhist calendar](https://en.wikipedia.org/wiki/Buddhist_calendar).
