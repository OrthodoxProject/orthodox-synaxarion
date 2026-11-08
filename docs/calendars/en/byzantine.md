---
title: The Byzantine calendar (era of the world)
label: Byzantine (from Creation)
summary: >-
  Years counted from the creation of the world, which Byzantium placed on 1 September 5509 BC, with the months of the Julian calendar and the year beginning on 1 September. It dated Byzantine, Russian and Romanian documents until modern times.
---

## Description

The Byzantine calendar uses the months and days of the [Julian calendar](julian.md) but counts the years from the creation of the world (*Anno Mundi*), which Byzantine chronologists placed on 1 September 5509 BC. The year begins on 1 September, like today's church year: the year 7535 from the creation began on 1 September 2026 Old Style, that is on 14 September New Style.

Next to the year of the world, documents usually gave the indiction, the place of the year in a cycle of 15 years. The cycles were not numbered, so the indiction alone only tells which year of a cycle it is; together with the year of the world, the date becomes unambiguous. Greek documents write numbers with letters: the year 7535 is ͵ζφλεʹ, and indiction 5 is εʹ.

## History

The indiction began as a fiscal cycle: every 15 years the land tax of the Roman Empire was reassessed. The first cycle was counted from 1 September 312, and from 537 a law of Justinian required documents to be dated by the indiction.

Christian chronologists tried to compute the age of the world from the genealogies of the Old Testament, following the Septuagint. Several eras resulted: the Alexandrian era (5492 BC), the era of the *Chronicon Paschale* (5507 BC) and the Constantinopolitan era (5509 BC), which prevailed in Byzantium and remained the official era of the Empire until the fall of Constantinople in 1453. Together with the church books, the era passed to the Slavs and the Romanians. Russia gave it up only by the decree of Peter the Great: 31 December 7208 was followed by 1 January 1700.

In Wallachia and Moldavia, the documents of the princely chanceries, written in Slavonic and later in Romanian, were dated "from the creation of the world" until the 18th century. To find the year of the Christian era, subtract 5508 years for January–August and 5509 for September–December.

In the Orthodox Church, 1 September remained the beginning of the church year, the "Beginning of the Indiction", and the service of the day prays for the new year.

## Method of calculation

Starting from the [Julian](julian.md) date *(year, month, day)*:

```
year of the world = year + 5509   for September–December
year of the world = year + 5508   for January–August
indiction = ((year of the world − 1) mod 15) + 1
```

The day and month are those of the Julian calendar. The site uses the Old Style date, as the era was defined; New Calendar Churches keep the beginning of the church year on 1 September New Style, 13 days earlier. The computation is in [`tools/lib/calendar-systems.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar-systems.ts), in the function `jdnToByzantine`.

## References

- V. Grumel, *La chronologie* (Traité d'études byzantines, I), Presses Universitaires de France, Paris, 1958.
- A. P. Kazhdan (ed.), *The Oxford Dictionary of Byzantium*, Oxford University Press, 1991, the entries on eras and on the indiction.
- E. J. Bickerman, *Chronology of the Ancient World*, 2nd ed., Thames & Hudson, London, 1980.
- Wikipedia: [Byzantine calendar](https://en.wikipedia.org/wiki/Byzantine_calendar), [Indiction](https://en.wikipedia.org/wiki/Indiction).
