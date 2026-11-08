---
title: Calendarul bahá'í (Badíʿ)
label: Bahá'í
summary: >-
  Calendarul credinței bahá'í: 19 luni de câte 19 zile și încă 4 sau 5 zile, cu anul nou (Naw-Rúz) la echinocțiul de primăvară. Anii se numără din 1844; ziua începe la apusul soarelui.
---

## Descriere

Calendarul Badíʿ („cel nou”, „cel minunat”) are 19 luni de câte 19 zile, adică 361 de zile, iar înaintea ultimei luni se adaugă 4 sau 5 zile, Ayyám-i-Há, cât e nevoie ca anul următor să înceapă tot la echinocțiu. Lunile poartă numele unor atribute ale lui Dumnezeu: Bahá (Splendoare), Jalál (Slavă), Jamál (Frumusețe), ʻAẓamat (Măreție), Núr (Lumină), Raḥmat (Milostivire), Kalimát (Cuvinte), Kamál (Desăvârșire), Asmáʼ (Nume), ʻIzzat (Putere), Mashíyyat (Voință), ʻIlm (Cunoaștere), Qudrat (Tărie), Qawl (Vorbire), Masáʼil (Întrebări), Sharaf (Cinste), Sulṭán (Suveranitate), Mulk (Stăpânire) și ʻAláʼ (Înălțime). Ultima lună, ʻAláʼ, este luna postului.

Anul nou, Naw-Rúz, este ziua echinocțiului de primăvară, 20 sau 21 martie. Anii se numără din 1844, anul în care Báb și-a vestit misiunea: anul 183 a început la 21 martie 2026. Ziua începe la apusul soarelui; site-ul arată data din timpul zilei.

## Istorie

Calendarul a fost întemeiat de Báb, în *Bayán*-ul persan, și confirmat de Bahá'u'lláh în *Kitáb-i-Aqdas*, care a rânduit ca Naw-Rúz să fie ziua în care Soarele intră în semnul Berbecului. Multă vreme, comunitățile din Occident au folosit o formă simplificată, cu Naw-Rúz fixat la 21 martie și cu zilele Ayyám-i-Há potrivite după anii bisecți gregorieni. De la Naw-Rúz 2015 (anul 172), Casa Universală a Dreptății a pus în aplicare calendarul în toată lumea, cu Teheranul ca loc de referință: Naw-Rúz este ziua, socotită de la un apus la altul la Teheran, în care cade echinocțiul.

## Metoda de calcul

Pentru anii 2015–2064, site-ul ia data lui Naw-Rúz din tabelul publicat de Centrul Mondial Bahá'í, calculat după momentul echinocțiului și ora apusului la Teheran; tabelul a fost verificat cu momentele echinocțiului calculate după Jean Meeus. Pentru anii 1844–2014 folosește forma veche, cu Naw-Rúz la 21 martie. Cu *z* = numărul zilelor de la Naw-Rúz, începând de la 0:

```
dacă z < 342:  lună = z / 19 + 1, zi = (z mod 19) + 1
Ayyám-i-Há:    (Naw-Rúz următor − Naw-Rúz) − 361 zile, după luna a 18-a
apoi:          luna 19, ʻAláʼ
```

Calculul se face în [`tools/lib/calendar-systems.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar-systems.ts), funcția `jdnToBahai`. În afara anilor 1844–2064, site-ul nu arată data bahá'í.

## Referințe

- Bahá'u'lláh, [*Kitáb-i-Aqdas*](https://www.bahai.org/library/authoritative-texts/bahaullah/kitab-i-aqdas/), cu notele despre calendar.
- Casa Universală a Dreptății, [scrisoarea din 10 iulie 2014](https://www.bahai.org/library/authoritative-texts/the-universal-house-of-justice/messages/20140710_001/1) către bahá'íi din lume, despre calendarul Badíʿ.
- Centrul Mondial Bahá'í, *Bahá'í Dates 172 to 221 B.E.*, tabelul datelor de Naw-Rúz și ale sărbătorilor pentru 2015–2065.
- E. M. Reingold, N. Dershowitz, *Calendrical Calculations: The Ultimate Edition*, ed. a 4-a, Cambridge University Press, 2018.
- Jean Meeus, *Astronomical Algorithms*, ed. a 2-a, Willmann-Bell, 1998, capitolul 27 (echinocțiile).
- Wikipedia: [Baháʼí calendar](https://en.wikipedia.org/wiki/Bah%C3%A1%CA%BC%C3%AD_calendar).
