# Plan: calendarele altor Biserici

Pe 15 noiembrie 2026 s-a cerut adăugarea, cu sinaxarele lor, a Bisericilor Ortodoxe ale Greciei, Republicii Moldova, Bulgariei, Ucrainei, Georgiei, Ciprului și Muntenegrului. S-a hotărât atunci:

- **Ucraina**: amândouă Bisericile, ca tradiții deosebite: Biserica Ortodoxă a Ucrainei (`ukraine-ocu`, autocefală prin tomosul din 2019, pe stil nou din 1 septembrie 2023) și Biserica Ortodoxă Ucraineană (`ukraine-uoc`, Mitropolitul Onufrie, pe stil vechi).
- **Republica Moldova**: amândouă mitropoliile. Mitropolia Chișinăului și a întregii Moldove (stil vechi) se face în issue-ul [#40](https://github.com/OrthodoxProject/orthodox-synaxarion/issues/40), din calendar.ortodox.md, ca tradiția `moldova`; aici e doar Mitropolia Basarabiei (`moldova-bessarabia`), care ține calendarul BOR.
- **Muntenegru**: Mitropolia Muntenegrului și a Litoralului (`montenegro`), eparhie a Bisericii Sârbe, pe stil vechi. „Biserica Ortodoxă Muntenegreană” nu e recunoscută de nicio Biserică ortodoxă și nu intră.
- **Grecia**: tradiția `greece` exista deja, fără calendar; se umple acum.

Issue: [#46](https://github.com/OrthodoxProject/orthodox-synaxarion/issues/46).

| Tradiție | Biserica | Calendar | De unde vin zilele |
|---|---|---|---|
| `greece` | Biserica Greciei | stil nou (din 1924) | saint.gr, verificat cu sinaxarul oficial de pe ecclesiagreece.gr |
| `cyprus` | Biserica Ciprului | stil nou (din 1924) | *Τυπική Διάταξη* a Bisericii Ciprului (churchofcyprus.org.cy) |
| `bulgarian` | Biserica Ortodoxă Bulgară | stil nou (din 20 decembrie 1968) | calendarul oficial de pe bg-patriarshia.bg |
| `georgian` | Biserica Ortodoxă a Georgiei | stil vechi | calendarul oficial de pe patriarchate.ge |
| `ukraine-ocu` | Biserica Ortodoxă a Ucrainei | stil nou (din 1 septembrie 2023) | *Богослужбові вказівки* ale Bisericii (pomisna.info) |
| `ukraine-uoc` | Biserica Ortodoxă Ucraineană | stil vechi | calendarul blagovist.info (cel de pe news.church.ua) |
| `montenegro` | Mitropolia Muntenegrului și a Litoralului | stil vechi | calendarul Serbiei (`calendar_from`), plus sfinții Muntenegrului |
| `moldova-bessarabia` | Mitropolia Basarabiei | stil nou | calendarul BOR (`calendar_from`) |

## Sursele

Sursele au toate drepturile rezervate (Sinodul Bisericii Bulgare permite citarea cu trimitere exactă la sursă), deci se iau doar fapte: cine se pomenește, în ce zi, cu semnul zilei și cu linkul paginii; viețile nu se copiază. Toate au fost citite întâi prin `robots.txt`.

- **Georgia, patriarchate.ge**: câte o pagină pe zi civilă, `https://patriarchate.ge/calendar/day/<AAAA-LL-ZZ>`, cu datele zilei în JSON (`<script data-page="app" …>`): ziua din Minei pe stil vechi (`old_month_day`) și pomenirile (`saints`), fiecare cu un ID care rămâne același de la un an la altul, titlul, culoarea, dacă e tipărită cu litere groase și dacă e fixă sau mobilă. `robots.txt` nu oprește nimic. Un an din Minei înseamnă 14 ianuarie – 13 ianuarie, plus 13 martie 2024 pentru 29 februarie. Titlurile sunt doar în georgiană, la genitiv („მოწამისა დიმიტრისა”), cu anii între paranteze.
- **Bulgaria, bg-patriarshia.bg**: calendarul pe un an întreg într-o singură pagină, `https://bg-patriarshia.bg/calendar/<an>` (2009–2026). E o alegere a Sinodului, nu tot Mineiul: 1–6 nume pe zi, cu sfinții bulgari, cu semnele `+`/`†` (praznic mare sau duminică) și `*` (praznic mijlociu). Sf. Gheorghe e pe 6 mai. Zilele mobile ale anului stau în aceeași celulă și se lasă deoparte, păstrând numele care se repetă în mai mulți ani.
- **Grecia, saint.gr**: câte o pagină pe zi, `https://www.saint.gr/<LL>/<ZZ>/index.aspx`, cu câte un titlu la nominativ pentru fiecare pomenire și pagina ei, `https://www.saint.gr/<id>/saint.aspx` (ID-ul merge în `external_ids.saint_gr`). E la zi (are sfinții canonizați după 2008). Sinaxarul oficial al Bisericii Greciei, pe ecclesiagreece.gr, are câte un paragraf pe zi, la genitiv, și nu mai e ținut la zi: servește la verificare.
- **Cipru, churchofcyprus.org.cy**: *Τυπική Διάταξη* a fiecărui an (2010–2026), câte un PDF pe lună: pentru fiecare zi, pomenirile cu slujbă și sfinții Ciprului. Restul Mineiului e cel grecesc.
- **Ucraina, Biserica Ortodoxă a Ucrainei**: *Богослужбові вказівки* (rânduiala slujbelor) a fiecărui an, câte un PDF pe pomisna.info (2025, 2026): pentru fiecare zi civilă, toate pomenirile, cu anii lor, icoanele, soboarele și sfinții canonizați de ea, plus duminica și lecturile. Rangul e spus în cuvinte (*бдінна*, *полієлейна*, *славословна* …). O pomenire în aceeași zi în ambii ani e fixă. Textul iese din PDF doar cu `pdftotext -enc UTF-8`. Calendarul ei nu e cel rusesc: pe 10 octombrie nu îi are pe Sf. Ambrozie de la Optina, Andrei de la Totma și Inochentie de Penza și are icoana de la Brailiv.
- **Ucraina, Biserica Ortodoxă Ucraineană**: calendarul blagovist.info, cel pe care îl arată și site-ul ei de știri (news.church.ua): câte o zi în JSON, `https://blagovist.info/calendar/jsCalData.php?dofcet=<AAAA-LL-ZZ>`, cu ambele date, cu toate pomenirile (sfinții locali și soboarele lor) și cu un link pentru fiecare; praznicele mari sunt cu majuscule, sfinții cu slujbă proprie cu litere groase. `robots.txt` oprește doar căutarea. Se citesc doi ani pe stil vechi (2026 și 2028), ca la OCA.
- **Mitropolia Basarabiei**: nu are un calendar al ei; sfinții ei, Sf. Ier. Iraclie și Alexandru ai Basarabiei (canonizați de Sinodul BOR în 2024), sunt deja în calendarul BOR, deci `calendar_from` îi dă tot.
- **Muntenegru**: nici Mitropolia, nici Patriarhia Sârbă nu publică un calendar pe zile. Mitropolia ține calendarul Bisericii Sârbe, iar sfinții Muntenegrului (Sf. Vasile de Ostrog, Sf. Petru de Cetinje, Sf. Ioan Vladimir, Sf. Ștefan Piperski, Sf. Isaia de Onogošt, Sf. Simeon Dajbabski, Sf. Ioanichie Lipovac, cei 42 de mucenici de la Momišići …) se adaugă de mână. Calendarul sârbesc însuși, azi ghicit (pomenirile comune calendarului BOR și celui OCA), s-ar putea reface din pravoslavno.rs, care are pe fiecare zi numele principale și ziua pe stil vechi.

## Făcut

- **Tradițiile** (definiția, numele în română, engleză și în limba Bisericii, ID-ul Wikidata, eticheta `tradition:` și opțiunea din formularele de issue), cu limbile noi bulgară, ucraineană și georgiană (`lang: bg`, `lang: uk`, `lang: ka`). O tradiție fără rânduri nu apare încă pe site.
- **Calendarul moștenit** (`calendar_from`): o mitropolie care ține calendarul Bisericii-mame îl primește întreg (rândurile fixe și mobile, mutările, faptele oficiale pe an, semnele și titlurile oficiale) și adaugă doar ce are în plus; un rând propriu ia locul rândului moștenit al aceleiași pomeniri (vezi [Calendarul unei tradiții](SCHEMA.md#calendarul-unei-tradiții)). Mitropolia Basarabiei și Mitropolia Muntenegrului au astfel de acum calendarul întreg.
- **Georgia** (`npm run import:traditions`, vezi [Calendarele altor Biserici](SCHEMA.md#calendarele-altor-biserici)): din calendarul oficial al Patriarhiei Georgiei, anul 2026 pe stil vechi, 1.470 de pomeniri fixe (praznicele mobile trecute ca fixe se recunosc după nota zilei și se lasă deoparte). Calendarul georgian are acum 1.341 de rânduri în 362 de zile: 1.245 de pomeniri găsite în aceeași zi în celelalte calendare, 11 sfinți ținuți acolo în altă zi (cu `differs_from_default`), 4 ținuți în ziua lor prin moaște sau proslăvire, plus 135 de pomeniri noi, cu 216 sfinți și 31 de grupuri numiți în georgiană (sfinții Georgiei pe care nu-i are OCA: Sf. Gavriil Urgebadze, Sf. Calistrat Țințadze, Sf. Ambrozie Helaia, Sf. Ilie Ciavciavadze, Sf. Tamara Marjanișvili …, și însoțitorii pe care celelalte calendare nu-i numesc). Un al doilea import nu scrie nimic, iar importul de bază, offline peste datele noi, la fel. Potrivirea importului primește pentru asta numele din alte limbi (`Unit.foreign`): se compară cu numele românesc și cu cel englezesc deopotrivă, ca între limbi.

## Urmează

1. **Rândurile georgiene lăsate deoparte**: 104, pe care `node tools/import-traditions.ts --offline --report <fișier>` le listează: 14 icoane și 9 praznice locale (de pus ca pomeniri noi, cu titlul lor), 5 aduceri și aflări de moaște, 23 de sfinți cu mai mulți omonimi în alte zile (de ales sfântul, de mână), 27 de rânduri cu mai multe nume găsite doar după un nume de mai târziu, 26 de evenimente și de rânduri fără nume sigure (soboare, mucenici numiți doar după loc, întâmplări din istoria Georgiei). Importul nu face din ele înregistrări noi, ca să nu facă dubluri sau nume din cuvinte obișnuite.
2. **Numele în română și engleză** ale celor 247 de înregistrări georgiene noi, cu `npm run translate` (traducere automată, marcată ca atare), și verificarea numelor georgiene trecute automat la nominativ.
3. **Celelalte Biserici**, câte una pe PR, cu același import (un cititor al sursei și unul al titlurilor în limba ei): Bulgaria, Grecia, Cipru, Biserica Ortodoxă Ucraineană, Biserica Ortodoxă a Ucrainei. Fiecare se verifică pe tot anul deodată (raportul importului), apoi un import offline care nu mai scrie nimic și `npm run check`.
4. **Sfinții Muntenegrului**, adăugați de mână în calendarul Mitropoliei.

## De unde se continuă

De la pasul 3, cu Bulgaria (calendarul pe ani de pe bg-patriarshia.bg); pașii 1 și 2 se pot face oricând. Paginile anului 2026 de pe patriarchate.ge sunt în `build/cache/` din dosarul principal.
