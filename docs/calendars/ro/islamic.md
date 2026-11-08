---
title: Calendarul islamic (hegirian)
label: Islamic (hegirian)
summary: >-
  Calendarul lunar al islamului: 12 luni de 29 sau 30 de zile, într-un an de 354 sau 355 de zile care trece prin toate anotimpurile în vreo 33 de ani. Anii se numără de la Hegira (622). Site-ul arată calendarul Umm al-Qura al Arabiei Saudite; după vederea Lunii noi, data poate diferi cu o zi sau două.
---

## Descriere

Calendarul islamic este pur lunar: lunile urmează fazele Lunii, fără nicio potrivire după Soare. Cele 12 luni sunt Muharram, Safar, Rabi’ al-Awwal, Rabi’ al-Thani, Jumada al-Ula, Jumada al-Akhira, Rajab, Sha’ban, Ramadan (luna postului), Shawwal, Dhu al-Qa’da și Dhu al-Hijja (luna pelerinajului la Mecca). Anul are 354 sau 355 de zile, cu aproximativ 11 zile mai puțin decât anul solar, așa că Ramadanul și celelalte sărbători trec prin toate anotimpurile în vreo 33 de ani.

Anii se numără de la Hegira, emigrarea profetului Mahomed de la Mecca la Medina, în 622 d.Hr. (*Anno Hegirae*, prescurtat AH). Ziua începe la apusul soarelui.

După tradiție, o lună începe atunci când secera Lunii noi e văzută după apus. Fiindcă vizibilitatea depinde de loc și de vreme, multe țări vestesc începutul lunilor după observații sau după criterii proprii, iar datele pot diferi cu o zi sau două de la o țară la alta. Arabia Saudită folosește pentru uz civil calendarul calculat Umm al-Qura, pe care îl arată și site-ul; și acolo însă începutul Ramadanului și al sărbătorilor se hotărăște după vederea Lunii.

## Istorie

Coranul vorbește despre cele 12 luni ale anului și interzice adăugarea unei luni (*nasī’*), cu care arabii țineau mai înainte anul în pas cu anotimpurile (sura 9, versetele 36–37). Califul Omar a introdus, în jurul anului 638, numărarea anilor de la Hegira, cu începutul erei la 1 Muharram al anului emigrării, adică la 16 iulie 622 (stil vechi).

Pentru astronomie și administrație s-au folosit și calendare aritmetice, cu un ciclu de 30 de ani în care 11 ani au o zi în plus. Calendarul Umm al-Qura, publicat în Arabia Saudită, se calculează astronomic: din 1420 AH (1999), o lună începe în ziua de după ziua a 29-a a lunii precedente dacă, în ziua aceea, conjuncția Lunii cu Soarele a avut loc înainte de apus, la Mecca, iar Luna apune după Soare.

## Metoda de calcul

Site-ul nu calculează singur acest calendar: îl ia din biblioteca ICU (International Components for Unicode) inclusă în Node.js, care cuprinde tabelele calendarului Umm al-Qura pentru anii 1300–1600 AH (aproximativ 1882–2174 d.Hr.) și folosește în afara lor calendarul aritmetic. Conversia se face în [`tools/lib/calendar-systems.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar-systems.ts), funcția `jdnToIslamic`, iar data în arabă vine tot din ICU.

Pentru comparație, în calendarul aritmetic anul *a* are 355 de zile când `(14 + 11·a) mod 30 < 11` și 354 în rest; lunile au, pe rând, 30 și 29 de zile, iar ultima are 30 de zile în anii lungi.

## Referințe

- Coranul, sura 9 (At-Tawba), versetele 36–37, pe [Quran.com](https://quran.com/9/36-37).
- Robert Harry van Gent, [*The Umm al-Qura Calendar of Saudi Arabia*](https://webspace.science.uu.nl/~gent0113/islam/ummalqura.htm).
- E. M. Reingold, N. Dershowitz, *Calendrical Calculations: The Ultimate Edition*, ed. a 4-a, Cambridge University Press, 2018.
- ICU, [documentația calendarelor](https://unicode-org.github.io/icu/userguide/datetime/calendar/).
- Wikipedia: [Calendarul islamic](https://ro.wikipedia.org/wiki/Calendarul_islamic), [Hegira](https://ro.wikipedia.org/wiki/Hegira), [Islamic calendar](https://en.wikipedia.org/wiki/Islamic_calendar).
