---
title: The Roman calendar (ab urbe condita)
label: Roman (ab urbe condita)
summary: >-
  Years counted from the founding of Rome (ab urbe condita, AUC), which Varro placed in 753 BC, with the day written in the Roman way, by the Kalends, Nones and Ides, on the Julian calendar, the calendar of Rome from 45 BC.
---

## Description

The year *ab urbe condita* ("from the founding of the City") is found by adding 753 to the year of the Christian era: 2026 is the year 2779 AUC. The Romans counted days differently from us. Each month had three fixed days: the Kalends (day 1), the Nones (day 5, or 7 in March, May, July and October) and the Ides (day 13, or 15 in the same months). The other days were counted backwards to the next fixed day, counting both ends, and the day before a fixed day was called *pridie*. For example, 26 October is *ante diem VII Kalendas Novembres*, the seventh day before the Kalends of November, abbreviated "a.d. VII Kal. Nov.", and 25 December is "a.d. VIII Kal. Ian.".

The leap day of the Julian calendar was 24 February, counted twice as "the sixth day before the Kalends of March" (*bis sextum*), whence the word "bissextile".

The site writes the Roman date on the [Julian calendar](julian.md), the calendar of Rome since Caesar's reform, so it runs 13 days behind the Gregorian date.

## History

The date of the founding of Rome was computed by Roman scholars only in the 1st century BC. Marcus Terentius Varro set it on 21 April 753 BC, the feast of the Parilia, while others proposed 752 BC (in the *Fasti Capitolini*) or 751 BC (Cato). The Romans usually dated their years by the names of the consuls; the count from the founding of Rome appears in some historians — Livy entitled his history *Ab urbe condita libri* — and was used above all by modern chronologists.

Around 525, the monk Dionysius Exiguus, from Scythia Minor (today's Dobruja, in Romania), began counting the years from the Incarnation of Christ; the year 1 of his era corresponds to the year 754 AUC. This is how the Christian era used today was born.

## Method of calculation

```
year AUC = Julian year + 753
```

The Roman day is found from the [Julian](julian.md) date *(year, month, day)*: day 1 is the Kalends; up to the Nones the day's number is `Nones − day + 1`; up to the Ides, `Ides − day + 1`; after the Ides, `length of the month − day + 2`, before the Kalends of the next month, where 1 means the fixed day itself and 2 means *pridie*. In February of leap years, the 24th is *a.d. bis VI Kal. Mart.*, and the days after it are counted as in a month of 29 days. The numbers are written in Roman numerals. The computation is in [`tools/lib/calendar-systems.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar-systems.ts), in the functions `jdnToRoman` and `romanDay`.

## References

- Censorinus, *De die natali*, chapter 21 (on eras and on the years from the founding of Rome).
- Macrobius, *Saturnalia*, book I, chapters 12–16 (the months, the Kalends, Nones and Ides).
- E. J. Bickerman, *Chronology of the Ancient World*, 2nd ed., Thames & Hudson, London, 1980.
- Denis Feeney, *Caesar's Calendar: Ancient Time and the Beginnings of History*, University of California Press, 2007.
- Wikipedia: [Ab urbe condita](https://en.wikipedia.org/wiki/Ab_urbe_condita), [Roman calendar](https://en.wikipedia.org/wiki/Roman_calendar).
