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
| `ukraine-ocu` | Biserica Ortodoxă a Ucrainei | stil nou (din 2023) | de ales |
| `ukraine-uoc` | Biserica Ortodoxă Ucraineană | stil vechi | de ales |
| `montenegro` | Mitropolia Muntenegrului și a Litoralului | stil vechi | calendarul Serbiei (`calendar_from`), plus sfinții Muntenegrului |
| `moldova-bessarabia` | Mitropolia Basarabiei | stil nou | calendarul BOR (`calendar_from`), plus sfinții Basarabiei |

## Sursele

Sursele au toate drepturile rezervate (Sinodul Bisericii Bulgare permite citarea cu trimitere exactă la sursă), deci se iau doar fapte: cine se pomenește, în ce zi, cu semnul zilei și cu linkul paginii; viețile nu se copiază. Toate au fost citite întâi prin `robots.txt`.

- **Georgia, patriarchate.ge**: câte o pagină pe zi civilă, `https://patriarchate.ge/calendar/day/<AAAA-LL-ZZ>`, cu datele zilei în JSON (`<script data-page="app" …>`): ziua din Minei pe stil vechi (`old_month_day`) și pomenirile (`saints`), fiecare cu un ID care rămâne același de la un an la altul, titlul, culoarea, dacă e tipărită cu litere groase și dacă e fixă sau mobilă. `robots.txt` nu oprește nimic. Un an din Minei înseamnă 14 ianuarie – 13 ianuarie, plus 13 martie 2024 pentru 29 februarie. Titlurile sunt doar în georgiană, la genitiv („მოწამისა დიმიტრისა”), cu anii între paranteze.
- **Bulgaria, bg-patriarshia.bg**: calendarul pe un an întreg într-o singură pagină, `https://bg-patriarshia.bg/calendar/<an>` (2009–2026). E o alegere a Sinodului, nu tot Mineiul: 1–6 nume pe zi, cu sfinții bulgari, cu semnele `+`/`†` (praznic mare sau duminică) și `*` (praznic mijlociu). Sf. Gheorghe e pe 6 mai. Zilele mobile ale anului stau în aceeași celulă și se lasă deoparte, păstrând numele care se repetă în mai mulți ani.
- **Grecia, saint.gr**: câte o pagină pe zi, `https://www.saint.gr/<LL>/<ZZ>/index.aspx`, cu câte un titlu la nominativ pentru fiecare pomenire și pagina ei, `https://www.saint.gr/<id>/saint.aspx` (ID-ul merge în `external_ids.saint_gr`). E la zi (are sfinții canonizați după 2008). Sinaxarul oficial al Bisericii Greciei, pe ecclesiagreece.gr, are câte un paragraf pe zi, la genitiv, și nu mai e ținut la zi: servește la verificare.
- **Cipru, churchofcyprus.org.cy**: *Τυπική Διάταξη* a fiecărui an (2010–2026), câte un PDF pe lună: pentru fiecare zi, pomenirile cu slujbă și sfinții Ciprului. Restul Mineiului e cel grecesc.
- **Muntenegru**: nici Mitropolia, nici Patriarhia Sârbă nu publică un calendar pe zile. Mitropolia ține calendarul Bisericii Sârbe, iar sfinții Muntenegrului (Sf. Vasile de Ostrog, Sf. Petru de Cetinje, Sf. Ioan Vladimir, Sf. Ștefan Piperski, Sf. Isaia de Onogošt, Sf. Simeon Dajbabski, Sf. Ioanichie Lipovac, cei 42 de mucenici de la Momišići …) se adaugă de mână. Calendarul sârbesc însuși, azi ghicit (pomenirile comune calendarului BOR și celui OCA), s-ar putea reface din pravoslavno.rs, care are pe fiecare zi numele principale și ziua pe stil vechi.

## Făcut

- **Tradițiile** (definiția, numele în română, engleză și în limba Bisericii, ID-ul Wikidata, eticheta `tradition:` și opțiunea din formularele de issue), cu limbile noi bulgară, ucraineană și georgiană (`lang: bg`, `lang: uk`, `lang: ka`). O tradiție fără rânduri nu apare încă pe site.
- **Calendarul moștenit** (`calendar_from`): o mitropolie care ține calendarul Bisericii-mame îl primește întreg (rândurile fixe și mobile, mutările, faptele oficiale pe an, semnele și titlurile oficiale) și adaugă doar ce are în plus; un rând propriu ia locul rândului moștenit al aceleiași pomeniri (vezi [Calendarul unei tradiții](SCHEMA.md#calendarul-unei-tradiții)). Mitropolia Basarabiei și Mitropolia Muntenegrului au astfel de acum calendarul întreg.

## Urmează

1. **Importul din surse în alte limbi**, începând cu Georgia: numele se trec în litere latine (`tools/lib/import/translit.ts`), titlurile („მოწამისა”, „Св. мчк”, „Άγιος”) se citesc cu câte un tabel pe limbă și se scriu ca titlurile englezești pe care importul le citește deja, iar fiecare rând se caută, cu potrivirea importului (`Builder.match`), între pomenirile pe care calendarele din date le țin în aceeași zi din Minei. Ce se găsește primește rândul în calendarul nou; ce nu se găsește devine înregistrare nouă, cu numele în limba sursei, ciornă, de tradus apoi cu `npm run translate`.
2. **Câte o Biserică pe PR**, cu verificarea pe tot anul deodată (rândurile negăsite și potrivirile nesigure, cu un script), apoi un import offline care nu mai scrie nimic și `npm run check`. Ordinea: Georgia, Bulgaria, Grecia, Cipru, Ucraina.
3. **Sfinții locului** pentru Mitropolia Muntenegrului și Mitropolia Basarabiei.
4. **Ucraina**: sursele celor două Biserici, de ales.

## De unde se continuă

De la pasul 1, cu Georgia: paginile anului 2026 de pe patriarchate.ge sunt deja în `build/cache/` din dosarul principal.
