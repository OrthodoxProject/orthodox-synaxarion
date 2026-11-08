---
title: Calendarul persan (hegirian solar)
label: Persan (hegirian solar)
summary: >-
  Calendarul oficial al Iranului, folosit, cu alte nume ale lunilor, și în Afganistan: un an solar care începe la echinocțiul de primăvară, de Nowruz, cu anii numărați de la Hegira (622). Este unul dintre cele mai exacte calendare solare.
---

## Descriere

Anul persan începe de Nowruz, ziua echinocțiului de primăvară, 20 sau 21 martie. Primele șase luni — Farvardin, Ordibehesht, Khordad, Tir, Mordad, Shahrivar — au 31 de zile, următoarele cinci — Mehr, Aban, Azar, Dey, Bahman — au 30, iar ultima, Esfand, are 29 sau 30. Lunile urmează astfel destul de exact trecerea Soarelui prin semnele zodiacului: vara, când Pământul e mai departe de Soare și Soarele pare să se miște mai încet, lunile sunt mai lungi.

Anii se numără de la Hegira, ca în [calendarul islamic](islamic.md), dar în ani solari, așa că sunt mai puțini: anul 1405 a început la 21 martie 2026. Calendarul e oficial în Iran; în Afganistan se folosește cu numele zodiacale ale lunilor (Hamal, Sawr, Jawza…).

## Istorie

Calendarul continuă calendarul Jalali, alcătuit în 1079 de un grup de astronomi din care făcea parte poetul și matematicianul Omar Khayyam, la cererea sultanului selgiuc Malik-Shah. Anul Jalali începea la echinocțiu și avea o precizie remarcabilă. Forma de azi, cu nume persane ale lunilor și lungimi fixe, a fost adoptată de parlamentul Iranului la 31 martie 1925 (11 Farvardin 1304).

## Metoda de calcul

Regula oficială e astronomică: dacă echinocțiul are loc înainte de amiază (ora Iranului), ziua aceea este 1 Farvardin; altfel, ziua următoare. Site-ul folosește regula aritmetică pe care o folosește și biblioteca ICU, cu un ciclu de 33 de ani în care 8 ani sunt bisecți: anul *a* este bisect când `(25·a + 11) mod 33 < 8`. Pentru anii de azi, cele două reguli dau aceleași zile (de exemplu, anii 1399 și 1403 au fost bisecți), iar verificarea cu momentele echinocțiului calculate după Jean Meeus nu a găsit nicio diferență între 1925 și 2150; ele pot diferi doar în anii în care echinocțiul cade foarte aproape de amiază. Pentru o zi *JDN* (împărțiri întregi):

```
zile        = JDN − 1948320
an          = 1 + (33·zile + 3) / 12053
ziua anului = zile − 365·(an − 1) − (8·an + 21) / 33     (de la 0)
lună        = ziua anului / 31 + 1          în primele 6 luni
lună        = (ziua anului − 6) / 30 + 1    în celelalte
```

Calculul se face în [`tools/lib/calendar-systems.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar-systems.ts) (funcția `jdnToPersian`); testele îl compară zi cu zi cu ICU, din care vine și data scrisă în persană.

## Referințe

- Kazimierz M. Borkowski, „The Persian calendar for 3000 years”, *Earth, Moon, and Planets*, 74, 1996, p. 223–230.
- *Encyclopædia Iranica*, articolul [„Calendars”](https://www.iranicaonline.org/articles/calendars).
- E. M. Reingold, N. Dershowitz, *Calendrical Calculations: The Ultimate Edition*, ed. a 4-a, Cambridge University Press, 2018.
- Jean Meeus, *Astronomical Algorithms*, ed. a 2-a, Willmann-Bell, 1998, capitolul 27 (echinocțiile).
- Wikipedia: [Solar Hijri calendar](https://en.wikipedia.org/wiki/Solar_Hijri_calendar).
