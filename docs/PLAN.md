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
- Al doilea rând al unei surse dintr-o zi ajunge la un sfânt deja găsit doar dacă îl numește întocmai (același prenume, aceleași epitete și locuri). Despărțiți: *Sf. Cuv. Leontie Dionisiatul* (18 iunie, acum cu *Venerable Leontius the Hagiorite*), *Sf. Mc. Zina* (22 iunie, cu *Zenas* al OCA), *Sf. Fevronia, Cneaghină de Murom* (25 iunie, cu *Saint Fevronia* al OCA), *Sf. Mc. Filumen* (29 noiembrie, cu *Philoumenus of Ancyra*), *Sf. Cuv. Zaharia Postitorul* (24 martie), *Sf. Anastasie Sinaitul, Patriarhul Antiohiei* (20 aprilie), *Sf. Mc. Iustin* (1 iunie) și 25 de rânduri OCA (8 ianuarie, 19 ianuarie, 17 februarie, 27 februarie, 23 martie, 1 aprilie, 7 mai, 15 mai, 3 iulie, 29 iulie, 7 august, 26 august de două ori, 22 septembrie de două ori, 4 octombrie, 21 octombrie, 24 octombrie, 26 octombrie, 27 octombrie, 1 noiembrie, 3 noiembrie, 23 noiembrie, 2 decembrie, 31 decembrie).
- Același nume complet în altă zi nu leagă un bărbat de o femeie, nici un mucenic de un sfânt care n-a fost mucenic: *Saint Euphrosynos the Cook* (11 septembrie) e acum Sf. Cuv. Eufrosin Bucătarul, nu Sf. Eufrosina din Alexandria; Ioan din *Venerable Mark the Grave-Digger, Theophilus, and John, of the Kiev Near Caves* (29 decembrie) nu mai e fiul Sf. Teodor Varangul.
- Tabelele de nume și locuri: *Sf. Sfințit Mc. Avramie* (4 februarie) e *Hieromartyr Abramius, Bishop of Arbela* (pagina vieții de pe doxologia: „episcop de Arbilia”), nu *Venerable Abraham* de la Pecenga; *Corfu* e *Kerkyra* (Sf. Ier. Arsenie, 19 ianuarie); *Hionia* e *Chionia* (16 aprilie) și *Haritina* e *Charitina of Amisos* (5 octombrie).

## Urmează

- **Aceeași persoană de două ori**, pe care importul nu o poate uni încă: *Sf. Cuv. Zaharia Postitorul de la Lavra Peșterilor* și *Venerable Zachariah the Ascetic of the Kiev Caves* (24 martie; la fel *Sf. Cuv. Agapit de la Lavra Pecerska* și *Agapitus the Unmercenary Physician of the Kiev Caves*, 1 iunie): trebuie echivalența *Lavra Peșterilor* / *Lavra Pecerska* / *Kiev Caves*. *Saint Akepsimas* (OCA 100205) e, după pagina lui, *Akepsimas the Hermit of Cyrrhus in Syria* (OCA 103169), din aceeași zi (3 noiembrie). *Venerable Nilus the Myrrhgusher of Lavra of Mount Athos* (7 mai) e *Venerable Nilus the Myrrhgusher of Mount Athos* (12 noiembrie): cheia numelui complet nu se înscrie pentru o persoană găsită întâi într-o altă limbă.
- **29 noiembrie**: rândul oficial *Sf. Mc. Paramon și Filumen* stă pe Sf. Sfințit Mc. Filumen de la Fântâna lui Iacov (1979), nu pe mucenicul Filumen din Ancira. **1 aprilie**: *Sf. Mc. Gherontie* (doxologia) stă pe *Venerable Gerontius the Canonarch*, probabil e Gherontie din *Martyrs Gerontius and Basilides*. Chipul sfințeniei ar alege între două potriviri egale, dar o regulă care îl ia în seamă pune azi două rânduri OCA pe același sfânt (1 aprilie, 25 iunie): perechile din `prematch` nu le văd pe cele făcute apoi de `matchNames`.
- **De verificat**: numele complet unește *Teodot, Episcopul Ancirei* (7 iunie) cu *Teodot din Ancira* și *Martyr Alexander of Rome* (13 mai) cu *Alexander, Pope of Rome*.
- **Bisericile copte fără sfânt**: aproape 25 de rânduri despre sfințirea sau zidirea unei biserici nu au subiect. Pe 3 Baounah, *The Construction of the first church of St. George in the cities of Birma and Beer Maa (Water Well) in the Oases* e biserica Sf. Mare Mucenic Gheorghe (`george-prince-of-the-martyrs`): textul copticchurch.net îl numește „the great martyr St. George”, mort sub Dioclețian.
- Rămase din PR #25: Sf. Crescent din Mira, *Herman* / *Gherman*, sursa implicită `src:doxologia`.

## De unde se continuă

De la `main`, câte un PR pentru fiecare punct din [Urmează](#urmează), după pașii de mai sus.
