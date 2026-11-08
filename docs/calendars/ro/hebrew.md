---
title: Calendarul ebraic
label: Ebraic
summary: >-
  Calendarul lunisolar al iudaismului: luni de 29 sau 30 de zile, după fazele Lunii, și o lună adăugată în 7 ani din 19, ca sărbătorile să rămână în anotimpul lor. Anii se numără de la facerea lumii, socotită în 3761 î.Hr.; ziua începe la apusul soarelui.
---

## Descriere

Calendarul ebraic potrivește lunile după Lună și anii după Soare. O lună are 29 sau 30 de zile, cât un ciclu al fazelor Lunii; anul obișnuit are 12 luni (353, 354 sau 355 de zile), iar anul „plin” are 13, prin dublarea lunii Adar (383, 384 sau 385 de zile). În fiecare ciclu de 19 ani sunt 7 ani cu 13 luni: anii 3, 6, 8, 11, 14, 17 și 19 ai ciclului.

Lunile sunt Tișri, Heșvan, Kislev, Tevet, Șvat, Adar (Adar I și Adar II în anii cu 13 luni), Nisan, Iyar, Sivan, Tamuz, Av și Elul. Anul începe la 1 Tișri, cu Roș Hașana; în Scriptură însă, prima lună este Nisan, luna Paștelui iudaic (Pesah).

Anii se numără de la facerea lumii (*Anno Mundi*), pe care tradiția rabinică o socotește în 3761 î.Hr.: anul 5787 a început la 12 septembrie 2026. Ziua începe la apusul soarelui, așa că sărbătorile încep în seara dinaintea datei lor; site-ul arată data din timpul zilei.

## Istorie

În vremea celui de-al Doilea Templu, începutul fiecărei luni era vestit de Sinedriu, după mărturia celor care văzuseră secera Lunii noi, iar luna a 13-a se adăuga atunci când primăvara întârzia. Tradiția atribuie calendarul fix, calculat, patriarhului Hillel al II-lea (în jurul anului 359), care ar fi făcut publice regulile ca să le poată folosi comunitățile din diaspora. Regulile au fost descrise pe deplin de Maimonide, în secolul al XII-lea, în *Mișne Tora*, la Legile sfințirii lunii noi, și nu s-au mai schimbat de atunci.

Pentru creștini, calendarul ebraic este legat de Paști: Hristos a pătimit în zilele Paștelui iudaic, iar o parte dintre primii creștini serbau Paștile la 14 Nisan.

## Metoda de calcul

Calculul pornește de la *molad*, momentul mediu al Lunii noi. Ora se împarte în 1080 de „părți”, iar luna medie are 29 de zile, 12 ore și 793 de părți. Pentru anul *a*, lunile scurse de la facerea lumii și ziua moladului lui Tișri sunt (împărțiri întregi):

```
luni  = (235·a − 234) / 19
părți = 12084 + 13753·luni
zile  = 29·luni + părți / 25920
```

13 753 de părți sunt cele 12 ore și 793 de părți peste 29 de zile, 12 084 de părți așază primul molad (numit BaHaRaD), iar 25 920 de părți fac o zi. Ziua se amână apoi după regulile numite *dehiyyot*: Roș Hașana nu cade niciodată duminica, miercurea sau vinerea, iar alte două reguli țin anul între 353–355 și 383–385 de zile. Din lungimea anului rezultă dacă Heșvan și Kislev au 29 sau 30 de zile. Anul *a* are 13 luni când `(7·a + 1) mod 19 < 7`.

Site-ul urmează algoritmul din *Calendrical Calculations*, în [`tools/lib/calendar-systems.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar-systems.ts) (funcția `jdnToHebrew`); testele îl compară zi cu zi cu biblioteca ICU, din care vine și data scrisă în ebraică.

## Referințe

- Maimonide, *Mișne Tora*, Legile sfințirii lunii noi (*Hilkhot Kiddush ha-Hodesh*), pe [Sefaria](https://www.sefaria.org/Mishneh_Torah%2C_Sanctification_of_the_New_Month).
- Arthur Spier, *The Comprehensive Hebrew Calendar*, ed. a 3-a, Feldheim, 1986.
- E. M. Reingold, N. Dershowitz, *Calendrical Calculations: The Ultimate Edition*, ed. a 4-a, Cambridge University Press, 2018.
- [Hebcal](https://www.hebcal.com/), calendar ebraic și convertor de date.
- Wikipedia: [Calendarul ebraic](https://ro.wikipedia.org/wiki/Calendarul_ebraic), [Hebrew calendar](https://en.wikipedia.org/wiki/Hebrew_calendar).
