---
title: Calendarul bizantin (era de la facerea lumii)
label: Bizantin (de la facerea lumii)
summary: >-
  Anii numărați de la facerea lumii, pe care Bizanțul o socotea la 1 septembrie 5509 î.Hr., cu lunile calendarului iulian și anul începând la 1 septembrie. A datat documentele bizantine, rusești și românești până în epoca modernă.
---

## Descriere

Calendarul bizantin folosește lunile și zilele calendarului [iulian](julian.md), dar numără anii de la facerea lumii (*Anno Mundi*), pe care cronologii bizantini o așezau la 1 septembrie 5509 î.Hr. Anul începe la 1 septembrie, ca anul bisericesc de azi: anul 7535 de la facerea lumii a început la 1 septembrie 2026 pe stil vechi, adică la 14 septembrie pe stil nou.

Lângă anul lumii se scria de obicei indictionul, locul anului într-un ciclu de 15 ani. Ciclurile nu se numerotau, așa că indictionul spune doar al câtelea an din ciclu este; împreună cu anul lumii, data devine fără echivoc. Documentele grecești scriu numerele cu litere: anul 7535 este ͵ζφλεʹ, iar indictionul 5 este εʹ.

## Istorie

Indictionul a început ca ciclu fiscal: la fiecare 15 ani se reevalua impozitul funciar al Imperiului Roman. Primul ciclu a fost socotit de la 1 septembrie 312, iar din 537 o lege a lui Iustinian a cerut ca indictionul să apară în datarea actelor.

Cronologii creștini au încercat să calculeze vârsta lumii din genealogiile Vechiului Testament, după Septuaginta. Au rezultat mai multe ere: era alexandrină (5492 î.Hr.), era din *Chronicon Paschale* (5507 î.Hr.) și era constantinopolitană (5509 î.Hr.), care s-a impus în Bizanț și a rămas era oficială a Imperiului până la căderea Constantinopolului, în 1453. Odată cu cărțile bisericești, era a trecut la slavi și la români. Rusia a părăsit-o abia prin decretul lui Petru cel Mare: după 31 decembrie 7208 a urmat 1 ianuarie 1700.

În Țara Românească și în Moldova, actele cancelariilor domnești, scrise în slavonă și apoi în română, erau datate „de la facerea lumii” (cu „leatul” 7000 și ceva) până în secolul al XVIII-lea. Pentru a afla anul erei creștine, se scad 5508 ani pentru lunile ianuarie–august și 5509 pentru septembrie–decembrie.

În Biserica Ortodoxă, 1 septembrie a rămas începutul anului bisericesc, „Începutul indictionului”, iar slujba zilei pomenește anul cel nou.

## Metoda de calcul

Pornind de la data [iuliană](julian.md) *(an, lună, zi)*:

```
anul lumii  = an + 5509   pentru septembrie–decembrie
anul lumii  = an + 5508   pentru ianuarie–august
indictionul = ((anul lumii − 1) mod 15) + 1
```

Ziua și luna rămân cele din calendarul iulian. Site-ul folosește data pe stil vechi, cum a fost definită era; Bisericile pe stil nou serbează începutul anului bisericesc la 1 septembrie pe stil nou, cu 13 zile mai devreme. Calculul se face în [`tools/lib/calendar-systems.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar-systems.ts), funcția `jdnToByzantine`.

## Referințe

- V. Grumel, *La chronologie* (Traité d'études byzantines, I), Presses Universitaires de France, Paris, 1958.
- A. P. Kazhdan (ed.), *The Oxford Dictionary of Byzantium*, Oxford University Press, 1991, articolele despre ere și despre indiction.
- E. J. Bickerman, *Chronology of the Ancient World*, ed. a 2-a, Thames & Hudson, Londra, 1980.
- Wikipedia: [Calendarul bizantin](https://ro.wikipedia.org/wiki/Calendarul_bizantin), [Indiction](https://ro.wikipedia.org/wiki/Indiction), [Byzantine calendar](https://en.wikipedia.org/wiki/Byzantine_calendar).
