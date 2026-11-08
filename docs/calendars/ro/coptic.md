---
title: Calendarul copt (era martirilor)
label: Copt (era martirilor)
summary: >-
  Calendarul Bisericii Ortodoxe Copte: 12 luni de 30 de zile și o lună scurtă de 5 sau 6 zile, cu anul începând la 11 sau 12 septembrie. Anii se numără din 284, de la urcarea pe tron a lui Dioclețian, sub care au murit mulți mucenici.
---

## Descriere

Anul copt are 12 luni a câte 30 de zile — Tut, Babah, Hatur, Kiahk, Tubah, Amșir, Baramhat, Baramuda, Bașans, Bauna, Abib și Mesra (în coptă: Thout, Paopi, Hathor, Koiak, Tobi, Meshir, Paremhat, Parmouti, Pashons, Paoni, Epip, Mesori) — urmate de luna mică, Nasi, cu 5 zile, sau 6 în anii bisecți. Ca în calendarul iulian, un an din patru este bisect, așa că anul copt păstrează mereu același raport cu calendarul iulian. Între 1900 și 2099, 1 Tut cade la 11 septembrie pe stil nou, sau la 12 septembrie în anul dinaintea unui an bisect.

Anii se numără din anul 284, urcarea pe tron a împăratului Dioclețian; Biserica Coptă îi numește „anii martirilor” (*Anno Martyrum*), în amintirea mucenicilor persecuției lui. Anul nou, Nayrouz, este și sărbătoarea martirilor.

Calendarul copt este calendarul liturgic al Bisericii Ortodoxe Copte, al cărei sinaxar e rânduit pe lunile lui, și a rămas în uz la țăranii din Egipt, pentru muncile câmpului.

## Istorie

Calendarul copt continuă vechiul calendar civil egiptean, care avea deja 12 luni de 30 de zile și 5 zile adăugate, dar niciun an bisect, așa că aluneca prin anotimpuri. După cucerirea Egiptului, Augustus a introdus, în jurul anului 25 î.Hr., o zi bisectă la patru ani, iar calendarul a devenit calendarul alexandrin. Anii lui Dioclețian au fost folosiți mai întâi în tabelele astronomice și pascale de la Alexandria, iar creștinii egipteni i-au păstrat ca „era martirilor”.

În 525, Dionisie cel Mic, călugăr originar din Scythia Minor (Dobrogea de azi), a continuat tabelele pascale alexandrine, dar a înlocuit anii lui Dioclețian, ca să nu păstreze numele unui persecutor, cu anii de la Întruparea lui Hristos: așa s-a născut era creștină.

## Metoda de calcul

Calendarul copt are aceeași structură în fiecare an, așa că legătura cu [ziua iuliană](julian-day.md) e o formulă simplă. Ziua 1 Tut a anului 1 (29 august 284, stil vechi) este ziua iuliană 1 825 030; pentru o dată *(an, lună, zi)* (împărțiri întregi):

```
JDN = 1825030 + 365·(an − 1) + an/4 + 30·(lună − 1) + zi − 1
```

Un an copt este bisect când restul împărțirii lui la 4 este 3. Pentru drumul invers, anul se află din numărul zilelor scurse, apoi luna și ziua din ziua anului. Site-ul calculează data în [`tools/lib/calendar.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar.ts) (funcția `jdnToCoptic`), iar testele o compară zi cu zi cu biblioteca ICU. Același calcul dă data bisericească în paginile tradiției copte.

## Referințe

- Aziz S. Atiya (ed.), *The Coptic Encyclopedia*, Macmillan, New York, 1991, articolul „Calendar, Coptic”.
- O. Neugebauer, *Ethiopic Astronomy and Computus*, Österreichische Akademie der Wissenschaften, Viena, 1979.
- E. M. Reingold, N. Dershowitz, *Calendrical Calculations: The Ultimate Edition*, ed. a 4-a, Cambridge University Press, 2018.
- Wikipedia: [Calendarul copt](https://ro.wikipedia.org/wiki/Calendarul_copt), [Coptic calendar](https://en.wikipedia.org/wiki/Coptic_calendar).
