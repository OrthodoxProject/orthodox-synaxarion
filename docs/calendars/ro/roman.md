---
title: Calendarul roman (ab urbe condita)
label: Roman (ab urbe condita)
summary: >-
  Anii numărați de la întemeierea Romei (ab urbe condita, a.u.c.), pe care Varro a socotit-o în 753 î.Hr., cu ziua scrisă în felul roman, după calende, none și ide, în calendarul iulian, calendarul Romei din 45 î.Hr.
---

## Descriere

Anul *ab urbe condita* („de la întemeierea Cetății”) se obține adunând 753 la anul erei creștine: anul 2026 este anul 2779 a.u.c. Romanii numărau zilele altfel decât noi. Fiecare lună avea trei zile de reper: calendele (ziua 1), nonele (ziua 5, sau 7 în martie, mai, iulie și octombrie) și idele (ziua 13, sau 15 în aceleași luni). Celelalte zile se numărau înapoi, până la reperul următor, socotind ambele capete, iar ziua dinaintea unui reper se numea *pridie*. De exemplu, 26 octombrie este *ante diem VII Kalendas Novembres*, a șaptea zi înainte de calendele lui noiembrie, prescurtat „a.d. VII Kal. Nov.”, iar 25 decembrie este „a.d. VIII Kal. Ian.”.

Ziua bisectă a calendarului iulian era 24 februarie, numărată de două ori ca „a șasea zi înainte de calendele lui martie” (*bis sextum*), de unde și cuvântul „bisect”.

Site-ul scrie data romană în calendarul [iulian](julian.md), calendarul Romei de la reforma lui Cezar, așa că ea rămâne cu 13 zile în urma datei gregoriene.

## Istorie

Data întemeierii Romei a fost calculată de erudiții romani abia în secolul I î.Hr. Marcus Terentius Varro a fixat-o la 21 aprilie 753 î.Hr., ziua sărbătorii Parilia, iar alții au propus 752 î.Hr. (în *Fasti Capitolini*) sau 751 î.Hr. (Cato). Romanii își datau de obicei anii după numele consulilor; numărătoarea de la întemeierea Romei apare la unii istorici — Titus Livius și-a intitulat istoria *Ab urbe condita libri* — și a fost folosită mai ales de cronologii moderni.

Pe la 525, călugărul Dionisie cel Mic, originar din Scythia Minor (Dobrogea de azi), a început să numere anii de la Întruparea lui Hristos; anul 1 al erei lui corespunde anului 754 a.u.c. Așa s-a născut era creștină folosită astăzi.

## Metoda de calcul

```
anul a.u.c. = anul iulian + 753
```

Ziua romană se află din data [iuliană](julian.md) *(an, lună, zi)*: ziua 1 sunt calendele; până la none, numărul zilei este `none − zi + 1`; până la ide, `ide − zi + 1`; după ide, `lungimea lunii − zi + 2`, înaintea calendelor lunii următoare, unde 1 înseamnă ziua reperului și 2 înseamnă *pridie*. În februarie, în anii bisecți, ziua de 24 este *a.d. bis VI Kal. Mart.*, iar zilele de după ea se numără ca într-o lună de 29 de zile. Numerele se scriu cu cifre romane. Calculul se face în [`tools/lib/calendar-systems.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar-systems.ts), cu funcțiile `jdnToRoman` și `romanDay`.

## Referințe

- Censorinus, *De die natali*, capitolul 21 (despre ere și despre anii de la întemeierea Romei).
- Macrobius, *Saturnalia*, cartea I, capitolele 12–16 (lunile, calendele, nonele și idele).
- E. J. Bickerman, *Chronology of the Ancient World*, ed. a 2-a, Thames & Hudson, Londra, 1980.
- Denis Feeney, *Caesar's Calendar: Ancient Time and the Beginnings of History*, University of California Press, 2007.
- Wikipedia: [Ab urbe condita](https://ro.wikipedia.org/wiki/Ab_urbe_condita), [Calendarul roman](https://ro.wikipedia.org/wiki/Calendarul_roman), [Roman calendar](https://en.wikipedia.org/wiki/Roman_calendar).
