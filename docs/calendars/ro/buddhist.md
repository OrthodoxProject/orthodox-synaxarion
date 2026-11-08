---
title: Era budistă (calendarul thailandez)
label: Budist (era budistă)
summary: >-
  Anii numărați de la moartea lui Buddha (parinirvana), socotită de tradiție în 543 î.Hr. Thailanda o folosește oficial, cu lunile și zilele calendarului gregorian, așa că anul budist este anul creștin plus 543.
---

## Descriere

Era budistă (prescurtat E.B., în engleză B.E.) numără anii de la parinirvana, intrarea lui Buddha în nirvana la moartea sa. Thailanda o folosește ca eră oficială, în calendarul solar thailandez, care are lunile și zilele calendarului gregorian și anul începând la 1 ianuarie: anul 2569 al erei budiste este anul 2026.

În Sri Lanka, Myanmar, Cambodgia și Laos, era budistă se folosește în calendarele religioase, care sunt lunisolare: anul începe primăvara, în aprilie sau la Vesak, sărbătoarea nașterii, iluminării și morții lui Buddha, iar în unele dintre aceste țări numărătoarea are un an în plus (anul creștin plus 544). Site-ul arată forma thailandeză.

## Istorie

Tradiția theravada, păstrată în cronicile din Sri Lanka, așază moartea lui Buddha în 544/543 î.Hr. Istoricii de azi o pun mai târziu, de obicei în jurul anului 480 î.Hr. sau chiar spre 400 î.Hr. Siamul (Thailanda) a adoptat un calendar solar în 1888, cu anii numărați de la întemeierea Bangkokului; în 1912 a trecut la era budistă, iar anul nou, care cădea la 1 aprilie, a fost mutat la 1 ianuarie începând cu 1941, așa că anul 2483 a avut doar nouă luni.

## Metoda de calcul

```
anul erei budiste = anul gregorian + 543
```

Luna și ziua rămân cele gregoriene. Pentru datele dinainte de 1941, când anul thailandez începea la 1 aprilie, regula nu se aplică lunilor ianuarie–martie. Calculul se face în [`tools/lib/calendar-systems.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar-systems.ts) (funcția `jdnToBuddhist`), iar data în thailandeză vine din biblioteca ICU, cu care testele compară și calculul.

## Referințe

- Heinz Bechert (ed.), *The Dating of the Historical Buddha*, 3 vol., Vandenhoeck & Ruprecht, Göttingen, 1991–1997.
- J. C. Eade, *The Calendrical Systems of Mainland South-East Asia*, Brill, Leiden, 1995.
- Wikipedia: [Calendarul budist](https://ro.wikipedia.org/wiki/Calendarul_budist), [Thai solar calendar](https://en.wikipedia.org/wiki/Thai_solar_calendar), [Buddhist calendar](https://en.wikipedia.org/wiki/Buddhist_calendar).
