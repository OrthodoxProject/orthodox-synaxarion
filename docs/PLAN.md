# Plan: corecturile primului import

Primul import a umplut `data/` din surse (vezi [Importul din surse](SCHEMA.md#importul-din-surse)). Greșelile lui se corectează de mână, iar importul se schimbă astfel încât un import nou să nu le mai facă.

Cum se lucrează la fiecare corectură:

1. Cazul se confirmă din sursele din `build/cache/` (paginile de zi OCA, calendarele doxologia, listele orthodox-calendar). Paginile doxologia ale sfinților și textele zilelor de pe copticchurch.net nu sunt în cache: se citesc pe site.
2. Regula nouă intră în `tools/lib/import/`, cu teste în `tests/import.test.ts` care cad pe uneltele de dinainte. Fiecare schimbare se verifică pe diferența dintre două importuri noi ale datelor de bază (`git archive b07ebeb5 data`), unul cu uneltele de dinainte și unul cu cele noi: `node tools/import.ts --offline --data <copie>/data --cache <cache>`.
3. Datele se corectează de mână: ID-urile publicate rămân, cele unite trec în `aliases`, titlurile oficiale merg cu rândurile lor, rândurile Patriarhiei Ecumenice și ale Serbiei se adaugă sau se scot (`confidence: low`, în ordinea din calendarul rusesc). Numele care lipsesc în română vin prin `npm run translate`.
4. Un import offline pe o copie a datelor corectate nu scrie nimic, iar `npm run check` trece. Numerele din [SCHEMA.md](SCHEMA.md#exemplele-din-v01) se actualizează.

## Făcut

- PR #10–#12, #15–#25, #27, #28: sfinți dublați sau încrucișați, titluri de pomeniri luate drept nume, genul din titlu, grupurile și rudele din rânduri, cheia *Ev-* / *Eu-*, locul care încheie o listă la aducerile de moaște, sfinții listelor ținuți prin moaștele lor.
- Rândurile OCA puse pe primul nume al listei altui rând din aceeași zi: un al doilea rând al aceleiași surse ajunge la un sfânt doar cu locul care încheie lista fiecăruia. Despărțiți: Serghie din Paflagonia (28 iunie) de Serghie de la Valaam și încă 13 sfinți (4 februarie, 15 februarie, 13 martie, 16 aprilie, 14 mai, 12 iunie, 18 iunie de două ori, 3 iulie, 17 august, 7 octombrie, 9 noiembrie, 19 noiembrie, 13 decembrie, 19 decembrie).
- Ierarhii numiți de un calendar după scaun și de celălalt după locul unde au trăit: Sf. Nectarie de la Eghina (9 noiembrie, cu aducerea moaștelor din 3 septembrie) și Sf. Vasile de Ostrog (29 aprilie), fiecare unit cu persoana OCA.
- Sfinții listelor ținuți în altă zi decât cea a calendarelor: Sf. Ioan de Kronstadt (19 octombrie), Sf. Gherman de Alaska (12 decembrie), Sf. Spiridon al Serbiei (15 iunie) erau deja uniți în date; Sf. Zlata din Meglen (30 octombrie) e unită acum cu persoana OCA.

## Urmează

- **18 iunie**: *Sf. Cuv. Leontie Dionisiatul, Izvorâtorul de mir* (doxologia) stă pe Sf. Mc. Leontie (`leontius`). E *Venerable Leontius the Hagiorite* al OCA, de la Mănăstirea Dionisiu (`leontius-the-hagiorite`). Al doilea rând doxologia al zilei ajunge la un nume fără loc (*Sfântul Mucenic Leontie*), care nu e o listă.
- **4 februarie**: *Sf. Sfințit Mc. Avramie* (doxologia, calendarul oficial) stă pe `abraham`, împreună cu *Venerable Abraham* din rândul OCA *Venerable Abraham and Coprius of Pechenga*. Ca sfințit mucenic, e probabil *Hieromartyr Abramius, Bishop of Arbela in Assyria* (`abramius-of-arbela`); pagina doxologia nu spune scaunul. Potrivirea dintre Abraham și Abramius iese la egalitate, iar chipul sfințeniei nu decide.
- **11 septembrie**: *Saint Euphrosynos the Cook of Alexandria* (OCA 102581), un bărbat, stă pe Sf. Eufrosina din Alexandria (`euphrosyne-of-alexandria`): cheia „același nume complet în altă zi” nu ține seama de gen.
- **19 ianuarie**: *Sf. Ier. Arsenie, Arhiepiscop de Corfu* (`arsenie-of-corfu`) și *Saint Arsenius, Archbishop of Kerkyra* (`arsenius-of-kerkyra`) sunt același sfânt (Corfu e Kerkyra); amândouă numele au un scaun, deci trebuie o echivalență de locuri.
- **16 aprilie**: *Sf. Mc. Fecioară Hionia* (`hionia`) și *Chionia* din rândul OCA al Sf. Agapia, Irina și Hionia (`chionia`) sunt două persoane pentru aceeași sfântă.
- **Bisericile copte fără sfânt**: aproape 25 de rânduri despre sfințirea sau zidirea unei biserici nu au subiect. Pe 3 Baounah, *The Construction of the first church of St. George in the cities of Birma and Beer Maa (Water Well) in the Oases* e biserica Sf. Mare Mucenic Gheorghe (`george-prince-of-the-martyrs`): textul copticchurch.net îl numește „the great martyr St. George”, mort sub Dioclețian.
- Rămase din PR #25: Sf. Crescent din Mira, *Herman* / *Gherman*, sursa implicită `src:doxologia`.

## De unde se continuă

De la `main`, câte un PR pentru fiecare punct din [Urmează](#urmează), după pașii de mai sus.
