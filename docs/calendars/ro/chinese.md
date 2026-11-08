---
title: Calendarul chinezesc
label: Chinezesc
summary: >-
  Calendarul lunisolar tradițional al Chinei, după care se țin Anul Nou chinezesc și sărbătorile din Asia de Est: luni care încep la Luna nouă și o lună intercalară în 7 ani din 19. Anii poartă nume dintr-un ciclu de 60, cu animalele zodiacului chinezesc.
---

## Descriere

Fiecare lună începe în ziua Lunii noi și are 29 sau 30 de zile. Anul are 12 luni (353–355 de zile) sau 13 (383–385 de zile); luna adăugată, „intercalară”, poartă numărul lunii după care vine. Anul Nou cade de obicei la a doua Lună nouă după solstițiul de iarnă, între 21 ianuarie și 20 februarie: în 2026 la 17 februarie, iar în 2027 la 6 februarie.

Anii nu se numără, ci se numesc după un ciclu de 60. Zece „trunchiuri cerești” (jiǎ, yǐ, bǐng, dīng, wù, jǐ, gēng, xīn, rén, guǐ), legate două câte două de cele cinci elemente — lemn, foc, pământ, metal, apă —, se îmbină cu douăsprezece „ramuri pământești” (zǐ, chǒu, yín, mǎo, chén, sì, wǔ, wèi, shēn, yǒu, xū, hài), fiecare cu animalul ei: Șobolanul, Bivolul, Tigrul, Iepurele, Dragonul, Șarpele, Calul, Capra, Maimuța, Cocoșul, Câinele, Mistrețul. Anul început la 17 februarie 2026 este anul bǐngwǔ, al Calului de Foc.

Din calendarul chinezesc s-au format calendarele tradiționale din Coreea și Vietnam, precum și cel al Japoniei de până în 1873; cel vietnamez, socotit după ora Vietnamului, are uneori alte date decât cel chinezesc.

## Istorie

Calendarele lunisolare chineze sunt atestate de peste trei mii de ani, iar curtea imperială le-a reformat de zeci de ori, pe măsură ce astronomia devenea mai exactă. Regulile de azi vin din calendarul Shixian (1645), pregătit cu ajutorul iezuitului Johann Adam Schall von Bell, care a introdus mișcarea adevărată a Soarelui. Republica Chineză a adoptat calendarul gregorian pentru uz civil în 1912, iar calendarul tradițional a rămas pentru sărbători; din 1929, calculele se fac pentru meridianul de 120° est, al orei Beijingului. Regulile sunt fixate astăzi în standardul național chinez GB/T 33661-2017.

## Metoda de calcul

Calendarul se calculează din poziții astronomice:

1. Lunile încep în ziua, după ora Chinei (UTC+8), în care are loc Luna nouă.
2. Anul solar e împărțit de 24 de „termeni solari”, la fiecare 15° de longitudine a Soarelui; 12 dintre ei, termenii principali, dau numerele lunilor: luna în care cade solstițiul de iarnă este luna a 11-a.
3. Dacă de la un solstițiu de iarnă la următorul sunt 13 luni, prima lună fără termen principal devine luna intercalară.

Biblioteca ICU, pe care site-ul o folosește pentru alte calendare, face acest calcul cu aproximări care greșesc atunci când Luna nouă cade foarte aproape de miezul nopții: de exemplu, pune Anul Nou 2027 la 7 februarie în loc de 6. De aceea site-ul folosește tabelele de conversie ale Observatorului din Hong Kong: din ele s-au extras ziua de Anul Nou, luna intercalară și lungimea fiecărei luni pentru anii care încep între 1901 și 2099, iar conversia a fost verificată cu toate zilele din tabele. Calculul se face în [`tools/lib/calendar-systems.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar-systems.ts), funcția `jdnToChinese`; în afara anilor 1901–2100, site-ul nu arată data chinezească.

## Referințe

- Helmer Aslaksen, [*The Mathematics of the Chinese Calendar*](https://www.math.nus.edu.sg/aslaksen/calendar/cal.pdf), National University of Singapore.
- Observatorul din Hong Kong, [*Gregorian-Lunar Calendar Conversion Table*](https://www.hko.gov.hk/en/gts/time/conversion.htm).
- GB/T 33661-2017, *Calculation and promulgation of the Chinese calendar*, standard național al Chinei.
- E. M. Reingold, N. Dershowitz, *Calendrical Calculations: The Ultimate Edition*, ed. a 4-a, Cambridge University Press, 2018.
- Wikipedia: [Calendarul chinezesc](https://ro.wikipedia.org/wiki/Calendarul_chinezesc), [Chinese calendar](https://en.wikipedia.org/wiki/Chinese_calendar).
