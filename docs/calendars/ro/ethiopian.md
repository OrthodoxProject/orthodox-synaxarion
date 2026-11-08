---
title: Calendarul etiopian
label: Etiopian
summary: >-
  Calendarul oficial al Etiopiei și calendarul Bisericii Ortodoxe Etiopiene Tewahedo: aceleași luni ca în calendarul copt, dar anii numărați de la Întruparea lui Hristos după calculul alexandrin, cu 7–8 ani în urma erei creștine obișnuite.
---

## Descriere

Anul etiopian are 12 luni de 30 de zile — Meskerem, Tikimt, Hidar, Tahsas, Tir, Yekatit, Megabit, Miyazya, Ginbot, Sene, Hamle și Nehase — și luna scurtă Pagume, de 5 sau 6 zile. Anul nou, Enkutatash, cade la 1 Meskerem, adică la 11 septembrie, sau la 12 septembrie în anul dinaintea unui an bisect gregorian. Lunile și zilele coincid cu cele ale [calendarului copt](coptic.md); diferă doar numărarea anilor.

Era obișnuită, *Amete Mihret* („anii milostivirii”), numără anii de la Întrupare, pe care calculul alexandrin o punea cu 7–8 ani mai târziu decât Dionisie cel Mic: anul 2019 a început la 11 septembrie 2026. O eră mai veche, *Amete Alem* („anii lumii”), adaugă 5500 de ani.

Calendarul este calendarul oficial al Etiopiei și calendarul liturgic al Bisericii Ortodoxe Etiopiene Tewahedo și al Bisericii Ortodoxe Eritreene Tewahedo. În Etiopia, orele se numără adesea de la răsăritul soarelui, așa că ora 1 dimineața este a șaptea oră după miezul nopții; site-ul arată doar data.

## Istorie

Calendarul vine din calendarul alexandrin, calendarul egiptean reformat de Augustus, și a ajuns în Etiopia odată cu creștinismul, în secolul al IV-lea. Era Întrupării pornește de la calculul călugărului Annianus din Alexandria, de la începutul secolului al V-lea, care punea facerea lumii în 5492 î.Hr. și Întruparea la 5500 de ani după aceea. Știința calculelor calendaristice și pascale, *Bahire Hasab*, a rămas o tradiție a clerului etiopian.

## Metoda de calcul

Calculul este identic cu cel copt, cu altă origine: ziua 1 Meskerem a anului 1 (29 august 8 d.Hr., stil vechi) este [ziua iuliană](julian-day.md) 1 724 221, iar (împărțiri întregi)

```
JDN = 1724221 + 365·(an − 1) + an/4 + 30·(lună − 1) + zi − 1
```

Un an este bisect când restul împărțirii lui la 4 este 3. Anii Amete Alem se obțin adunând 5500. Site-ul calculează data în [`tools/lib/calendar.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar.ts) (funcția `jdnToEthiopian`), iar testele o compară zi cu zi cu biblioteca ICU, din care vin și numele lunilor în amharică.

## Referințe

- O. Neugebauer, *Ethiopic Astronomy and Computus*, Österreichische Akademie der Wissenschaften, Viena, 1979.
- Siegbert Uhlig (ed.), *Encyclopaedia Aethiopica*, Harrassowitz, Wiesbaden, 2003–2014, articolul „Calendar”.
- E. M. Reingold, N. Dershowitz, *Calendrical Calculations: The Ultimate Edition*, ed. a 4-a, Cambridge University Press, 2018.
- Wikipedia: [Calendarul etiopian](https://ro.wikipedia.org/wiki/Calendarul_etiopian), [Ethiopian calendar](https://en.wikipedia.org/wiki/Ethiopian_calendar).
