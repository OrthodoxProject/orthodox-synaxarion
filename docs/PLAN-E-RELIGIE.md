# Plan: sinaxarul de pe e-religie.ro

[e-religie.ro](https://e-religie.ro/), platforma e-learning a profesorilor de religie (coordonată de Arhiepiscopia Craiovei, inspectoratele școlare din Dolj, Gorj, Vâlcea, Mehedinți și Olt și Facultatea de Teologie din Craiova), are un sinaxar cu o pagină pentru fiecare zi a anului. Îl citim ca sursă pentru sfinții pe care îi are. Issue: [#39](https://github.com/OrthodoxProject/orthodox-synaxarion/issues/39).

Ce se face cu fiecare sfânt al paginilor:

- **dacă e deja în date**, înregistrarea rămâne cum e și primește doar, în `sources`, linkul spre pagina zilei de pe e-religie, la secțiunea sfântului (`…/sinaxar-ziua-15-luna-11/#ancora-continut-2`); site-ul îl arată la *Surse*. Pomenirea nu trece în alt calendar decât cele în care era;
- **dacă lipsește**, devine o înregistrare nouă, în calendarul BOR al zilei, cu același fel de link.

| Sursă | Cum se citește |
|---|---|
| e-religie.ro (`src:e-religie`) | `https://e-religie.ro/sinaxar/<luna>/` trimite la zilele lunii; o zi e `https://e-religie.ro/sinaxar/<luna>/sinaxar-ziua-<ziua>-luna-<numărul lunii>/` (de ex. `sinaxar/noiembrie/sinaxar-ziua-15-luna-11/`). Cuprinsul paginii (*📑 Cuprins:*) numește sfinții zilei și trimite la secțiunea fiecăruia (`#ancora-continut-<n>`), unde e viața lui. WordPress, UTF-8; `robots.txt` permite tot și nu cere pauză între cereri |

Are toate drepturile rezervate („Copyright ©2026 e-religie.ro. All rights reserved.”), deci se iau doar fapte: cine se pomenește și în ce zi, cu linkul. Viețile nu se copiază.

## Făcut

- **Cititorul**, `tools/lib/import/sources/ereligie.ts`: paginile celor 12 luni, apoi pagina fiecărei zile, prin `PoliteFetcher` și cache-ul paginilor (`build/cache/e-religie.ro/`, 379 de pagini descărcate pe 15 noiembrie 2026). Din pagina zilei se iau doar rândurile cuprinsului: numele, ziua și ancora secțiunii. Sunt **1.396 de rânduri** în 366 de zile, mult mai multe decât pomenirile principale: în multe zile paginile au și ceilalți sfinți din Viețile Sfinților (până la 11 pe zi), dar și predici, povestiri și minuni (*Cuvânt la …*, *Povestire despre …*, *Minunea …*, *Alți sfinți pomeniți la …*), care se lasă deoparte.
- **Titlurile în formele calendarelor** (`ereligieTitle`): *Viața/Pătimirea/Pomenirea Sfântului X* e ziua Sf. X; *Preacuviosul*, *Părintele nostru*, *Cuvioasa Maică*, *Cuvioșii* sunt cinstiri (și în `parseRo`); praznicele scrise pe larg (*Cinstita Adormire a Preasfintei Măritei Stăpânei noastre …*) se scriu ca în calendar; un epitet după virgulă (*Macarie cel Mare, Egipteanul*, *Ștefan cel Mare și Sfânt*) nu e alt sfânt; cinstirile se scriu ca în calendarul oficial (*Sf. Cuv.*, *Sf. Mc.*), ca sfinții noi să arate ca ceilalți.
- **Citarea**, `Builder.cite`: rândurile se caută între pomenirile zilei; ce găsesc primește linkul (pomenirea, persoanele, grupul), iar `RecordWriter` scrie înregistrările existente cu citarea adăugată la sfârșitul lui `sources` (singura excepție de la regula că importul nu rescrie înregistrările existente). Reguli în plus pentru această sursă, care își descrie pe larg sfinții: celelalte nume ale unui rând care și-a găsit pomenirea sunt celelalte persoane ale ei; numele care e singurul de felul lui în ziua aceea, în sursă și în date, e același sfânt, dacă chipul sfințeniei, locurile și epitetele nu-i deosebesc; o potrivire cu alt chip al sfințeniei e alt sfânt (*Sfinții Mucenici Boris și Gleb* nu sunt *Saint Boris, Prince of Bulgaria*); un nume poate fi și sfântul unei aduceri de moaște a zilei. Un rând al cărui link îl citează deja o înregistrare (și una din altă zi) nu se mai potrivește încă o dată.
- Celelalte surse dau exact aceleași rezultate ca înainte (aceleași numere într-un import de probă), iar testele din `tests/import.test.ts` acoperă cititorul, titlurile și citarea (inclusiv că al doilea import nu mai scrie nimic).
- **Importul**: 939 de rânduri și-au găsit pomenirile, 383 ar fi fost sfinți noi, 46 parțial noi, 26 lăsate deoparte. Rândurile care ar fi adăugat un sfânt și potrivirile cu un scor slab al numelui (aproape 480) au fost verificate de mână, cu viețile scurte OCA și sfinții cu același nume din alte zile.

## Urmează

1. **Deciziile verificării**, aplicate peste ce a scris importul: rândurile ai căror sfinți sunt deja în date pierd înregistrările noi și citează înregistrările existente; rândurile parțial noi păstrează doar sfinții noi; potrivirile greșite își mută citarea. Un sfânt pe care datele îl țin în altă zi primește linkul doar la persoană, fără o pomenire nouă.
2. **Numele în engleză** ale sfinților noi (`npm run translate`), ca traduceri automate marcate.
3. `npm run format`, `npm run check`, un import offline peste rezultat care nu mai scrie nimic, numerele din [SCHEMA.md](SCHEMA.md#exemplele-din-v01), PR-ul.

## De unde se continuă

De la pasul 1. Paginile sunt în cache-ul copiei principale (`build/cache/e-religie.ro/`); importul se reface cu `node tools/import.ts --offline` peste `data/` din `main`.

## De știut

- O altă sesiune adaugă în paralel calendarul Mitropoliei Moldovei (calendar.ortodox.md, [#40](https://github.com/OrthodoxProject/orthodox-synaxarion/issues/40)) cu aceeași idee (referință la sfinții existenți) și schimbă aceleași fișiere ale importului și aceleași înregistrări: PR-ul care intră al doilea refăce importul peste `main`, nu îmbină fișierele de date de mână.
- Dubluri vechi găsite pe drum: Sf. Simeon Izvorâtorul de Mir (`simeon-izvoratorul-of-mir` / `simeon-the-myroblyte`, 13 februarie) și Sf. Mc. Avtonom (`avtonom` / `autonomus`, 12 septembrie).
