---
title: Calendarul japonez (era imperială)
label: Japonez (era imperială)
summary: >-
  Calendarul oficial al Japoniei: lunile și zilele calendarului gregorian, cu anii numărați după era împăratului (nengō). Era de acum, Reiwa, a început la 1 mai 2019, la urcarea pe tron a împăratului Naruhito.
---

## Descriere

Din 1873, Japonia folosește lunile și zilele calendarului gregorian, dar anii se numără, în actele oficiale și în viața de zi cu zi, după era (*gengō* sau *nengō*) împăratului care domnește. Primul an al unei ere se numește *gannen* și ține de la începutul erei până la 31 decembrie; anul următor este anul 2. Era Reiwa („armonie frumoasă”) a început la 1 mai 2019, așa că 2026 este anul 8 Reiwa (令和8年).

Erele de după adoptarea calendarului gregorian sunt Meiji (până la 29 iulie 1912), Taishō (30 iulie 1912 – 24 decembrie 1926), Shōwa (25 decembrie 1926 – 7 ianuarie 1989), Heisei (8 ianuarie 1989 – 30 aprilie 2019) și Reiwa.

## Istorie

Primul nume de eră, Taika, a fost dat în 645, după model chinezesc. Vreme de secole, erele se schimbau și în timpul aceleiași domnii, după întâmplări fericite sau după nenorociri. Din 1868 (Meiji), era se schimbă numai la urcarea pe tron a unui nou împărat, regulă păstrată de Legea numelor de eră din 1979. Calendarul lunisolar tradițional, de origine chineză, a fost înlocuit cu cel gregorian: ziua a 3-a a lunii a 12-a din anul 5 Meiji a devenit 1 ianuarie 1873, anul 6 Meiji.

## Metoda de calcul

Site-ul ia luna și ziua din calendarul gregorian și caută era în care cade ziua; anul erei este anul gregorian minus anul în care a început era, plus 1. Datele dinainte de 1873 nu sunt convertite. Calculul se face în [`tools/lib/calendar-systems.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar-systems.ts) (funcția `jdnToJapanese`); data în japoneză vine din biblioteca ICU, cu care testele compară și calculul.

## Referințe

- Biblioteca Națională a Dietei (Japonia), [*The Japanese Calendar*](https://www.ndl.go.jp/koyomi/e/).
- Legea numelor de eră (元号法, *Gengō-hō*), 1979.
- Wikipedia: [Japanese calendar](https://en.wikipedia.org/wiki/Japanese_calendar), [Japanese era name](https://en.wikipedia.org/wiki/Japanese_era_name).
