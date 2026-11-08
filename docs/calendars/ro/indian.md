---
title: Calendarul național indian (era Saka)
label: Național indian (Saka)
summary: >-
  Calendarul civil oficial al Indiei din 1957, alături de cel gregorian: un an solar care începe la 22 martie (21 în anii bisecți), cu lunile purtând numele lunilor hinduse și anii numărați în era Saka, din 78 d.Hr.
---

## Descriere

Anul începe la 1 Chaitra, adică la 22 martie, sau la 21 martie în anii bisecți. Chaitra are 30 de zile (31 în anii bisecți), următoarele cinci luni — Vaishakha, Jyeshtha, Ashadha, Shravana, Bhadra — au câte 31, iar ultimele șase — Ashvin, Kartika, Agrahayana, Pausha, Magha, Phalguna — câte 30. Anii bisecți sunt aceiași ca în calendarul gregorian. Anii se numără în era Saka, care începe în anul 78 d.Hr.: anul 1948 Saka a început la 22 martie 2026.

Calendarul e folosit în publicațiile oficiale ale guvernului indian (Gazette of India), la radioul public și în calendarele guvernamentale. Sărbătorile hinduse, budiste și jainiste urmează însă calendare religioase lunisolare, *panchang*, care diferă de la o regiune la alta.

## Istorie

În anii 1950, India avea zeci de calendare locale. Guvernul a numit în 1952 un Comitet pentru reforma calendarului, condus de astrofizicianul Meghnad Saha, care a propus un calendar civil unic și reguli comune pentru calendarele religioase. Calendarul național a fost adoptat de la 1 Chaitra 1879 Saka, adică 22 martie 1957.

## Metoda de calcul

Pentru o zi din anul gregorian *A*: de la începutul anului Saka (22 martie, sau 21 martie în anii bisecți) încolo, anul Saka este *A* − 78; înainte, este *A* − 79, iar începutul anului se ia din anul gregorian anterior. Din numărul zilelor de la 1 Chaitra se scad apoi lungimile lunilor: 30 sau 31, de cinci ori 31 și apoi 30. Calculul se face în [`tools/lib/calendar-systems.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar-systems.ts) (funcția `jdnToIndian`); testele îl compară zi cu zi cu biblioteca ICU, din care vine și data scrisă în hindi.

## Referințe

- *Report of the Calendar Reform Committee*, Council of Scientific and Industrial Research, New Delhi, 1955.
- E. M. Reingold, N. Dershowitz, *Calendrical Calculations: The Ultimate Edition*, ed. a 4-a, Cambridge University Press, 2018, capitolele despre calendarele hinduse.
- Wikipedia: [Indian national calendar](https://en.wikipedia.org/wiki/Indian_national_calendar).
