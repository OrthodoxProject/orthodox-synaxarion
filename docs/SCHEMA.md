# Schema v0.1: cum sunt organizate datele

Ghid pentru cine adaugă sau corectează date.

## Comenzi

```bash
npm install
```

```bash
npm run check
```

`npm run check` verifică tipurile uneltelor, rulează testele și validează tot folderul `data/`. Separat:

| Comandă | Ce face |
|---|---|
| `npm run validate` | validează `data/` (schema, apoi regulile dintre fișiere); se oprește cu cod 1 dacă există erori |
| `npm run format` | rescrie fișierele în formatul canonic: JSON cu 2 spații, LF, Unicode NFC, ș/ț cu virgulă în fișierele românești |
| `npm run import` | importă sfinții și praznicele din sursele din `data/sources/` (vezi [Importul din surse](#importul-din-surse)) |
| `npm run labels` | verifică etichetele din `.github/labels.yml` și formularele de issue (vezi [Dacă nu vrei să editezi fișierele](#dacă-nu-vrei-să-editezi-fișierele)) |
| `npm test` | testează validatorul, calendarul, wiki-ul, importul, etichetele și formularele |

Cerință: Node 24 sau mai nou (Node rulează direct fișierele TypeScript din `tools/`, fără compilare).

În VS Code, `.vscode/settings.json` leagă fiecare fișier de schema lui, deci editorul arată erorile și completează câmpurile pe măsură ce scrii.

## Structura folderului `data/`

```text
data/
├─ persons/<id>.json              persoane sfinte (sfinți, Maica Domnului, îngeri)
├─ groups/<id>.json               grupuri (mucenici, familii, sobor)
├─ commemorations/<id>.json       pomeniri: praznice, zile de sfinți, aduceri de moaște, icoane, evenimente
├─ places/<id>.json               locuri
├─ icons/<id>.json                icoane făcătoare de minuni
├─ hymns/<id>.json                imne (tropar, condac …)
├─ sources/<id>.json              surse bibliografice
├─ media/<id>.json                imagini, înregistrări
├─ traditions/<id>/
│  ├─ tradition.json              Biserica: calendar, pascalie, legenda semnelor
│  ├─ menaion/MM/DD.json          pomenirile cu dată fixă, în ordinea din calendar
│  ├─ movable.json                pomenirile mobile + regulile de mutare
│  ├─ observances.json            zile libere, zile naționale, aniversări
│  └─ overrides/<an>.json         fapte din calendarul oficial pe un an (corecții și teste)
└─ i18n/<limbă>/
   ├─ vocab.json                  etichetele tuturor codurilor
   ├─ <colecție>/<id>.json        nume și texte (persons, groups, commemorations, places, icons, hymns, media)
   ├─ <colecție>/<id>.md          text lung (viața completă), cu antet YAML
   └─ traditions/<id>.json        numele Bisericii, titlurile oficiale, etichetele semnelor și ale zilelor
```

Exemple de urmărit: [persons/lazarus-of-galesion.json](../data/persons/lazarus-of-galesion.json), cu [numele în română](../data/i18n/ro/persons/lazarus-of-galesion.json) și [viața](../data/i18n/ro/persons/lazarus-of-galesion.md); [calendarul BOR pe 7 noiembrie](../data/traditions/romanian/menaion/11/07.json).

## Convenții

- **Straturi**: fișierele din afara `i18n/` nu conțin text de afișat, doar coduri, date, numere, ID-uri și URL-uri. Orice text pentru cititor stă în `i18n/<limbă>/`.
- **ID-uri**: litere mici, cifre și cratimă, în engleză (`nicholas-of-myra`). Cratima dublă separă o parte a aceleiași entități (`nicholas-of-myra--translation-of-relics`). Un ID publicat nu se mai schimbă; dacă trebuie, vechiul ID trece în `aliases`, iar adresa lui de pe site duce mai departe la pagina înregistrării.
- **Coduri** de vocabular: litere mici și underscore (`great_martyr`, `gospel_book`). Fiecare cod are etichetă în `i18n/<limbă>/vocab.json`, sub cheia `<spațiu>.<cod>` (ex. `holiness_type.great_martyr`).
- **Referințe**: cu prefixul tipului: `person:`, `group:`, `comm:`, `place:`, `icon:`, `hymn:`, `src:`, `media:`. Tradițiile se scriu fără prefix (`romanian`).
- **O singură direcție**: pomenirea indică persoana (`subjects`), copilul indică părintele (`child_of`). Legăturile inverse (pomenirile unui sfânt, `parent_of`) se calculează.
- **Cinstirea e pe tradiție**: rezultă din calendarele tradițiilor. `veneration` se completează doar pentru detalii (cinstire locală, de când) sau pentru cinstire fără zi în calendar.
- **Date istorice**: EDTF. `1053-11-07` (exact), `0968~` (aproximativ), `1053?` (nesigur), `03XX` (secolul IV), `[1714,1716]` (unul dintre ani), `1688/1714` (interval). Adaugă `calendar: julian` sau `gregorian` când ziua contează.
- **Date bisericești**: luna și ziua din Minei (`11-07`), aceleași pe stil vechi și pe stil nou. Data civilă rezultă din stilul calendaristic al fiecărei tradiții (pe stil vechi, Mineiul e cu 13 zile în urmă în 1900–2099). La copți și etiopieni, luna 13 există.
- **Lecturi**: cod USFM, apoi capitol:verset. `, ` adaugă versete din același capitol, `; ` începe alt capitol: `GAL 5:22-26; 6:1-2`, `HEB 11:9-10, 32-40`, `JHN 15:17-16:2`. Psalmii urmează numerotarea Septuagintei.
- **Diacritice**: în română doar *ș ț* cu virgulă dedesubt; `npm run format` le corectează automat.
- **Surse**: orice persoană, grup și icoană are cel puțin o sursă. Textele copiate (imne, vieți) au nevoie de licență liberă, de domeniu public sau de permisiune; altfel păstrăm doar începutul imnului și un link.

## Regulile de dată

```jsonc
{ "type": "fixed", "month": 11, "day": 7 }                                   // dată din Minei
{ "type": "fixed", "month": 2, "day": 29, "non_leap": { "month": 2, "day": 28 } } // 29 februarie
{ "type": "fixed", "month": 1, "day": 7, "calendar": "coptic" }              // 7 Thout
{ "type": "pascha", "offset": 7 }                                            // Duminica Tomii
{ "type": "pentecost_sunday", "n": 2 }                                       // a doua duminică după Rusalii
{ "type": "weekday_before", "weekday": "saturday", "anchor": "11-08" }       // Moșii de toamnă
{ "type": "weekday_after", "weekday": "saturday", "anchor": { "pascha": 49 }, "nth": 2 }
{ "type": "weekday_in_range", "weekday": "sunday", "from": "12-18", "to": "12-24" }
{ "type": "monthly", "calendar": "coptic", "day": 12 }                       // în fiecare lună coptă
{ "type": "unspecified", "note": "…" }                                       // doar în ciorne
```

`date_rule` din pomenire e data obișnuită. Fiecare tradiție o așază în calendarul ei: o pomenire din `menaion/11/07.json` cade la 7 noiembrie în acea tradiție. Dacă o tradiție o pune altundeva intenționat, linia primește `"differs_from_default": true`. Mutările (Sf. Gheorghe în Lunea Luminată) stau în `movable.json`, la `transfers`.

## Calendarul unei tradiții

O linie din calendar are una sau mai multe pomeniri tipărite împreună, plus semnul tradiției:

```json
{
  "commemorations": ["comm:john-cassian--repose", "comm:germanus-of-dobruja--repose"],
  "symbol": "blue-half-parenthesized"
}
```

- `symbol` trimite la `symbol_legend` din `tradition.json` (glifa și culoarea). Etichetele semnelor stau în `i18n/<limbă>/traditions/<id>.json`, la `symbols`.
- Titlul oficial al liniei (ex. *Sf. Cuv. Ioan Casian și Gherman, din Dobrogea*) stă în același fișier de limbă, la `official_titles`, sub cheia primei pomeniri. E un citat: îl păstrăm cum îl tipărește Biserica, cu diacriticele corectate.
- `overrides/<an>.json` adună fapte din calendarul oficial pe un an (lecturi, glas, voscresnă, post, numărul duminicii, zile libere). Sunt datele de control pentru calculul calendarului.

## Limbi

- Fiecare limbă are fișierele ei: `i18n/ro/...`, `i18n/en/...`, `i18n/sr-Cyrl/...`, `i18n/grc/...`. Codurile urmează BCP 47.
- O persoană, un grup, un loc, o icoană și o tradiție au nevoie de nume în cel puțin o limbă. Pentru română și engleză (limbile primei versiuni), lipsa e semnalată ca avertisment.
- Zilele de sfinți (`kind: repose`) își iau titlul din persoană, deci nu au nevoie de fișier de limbă propriu; îl adaugi doar pentru nume populare (`names.folk`, ex. *Sângeorz*, *Никољдан*).
- `translation.method` spune de unde vine textul: `original` (scris direct în limba respectivă), `human` (tradus de un om) sau `machine` (traducere automată), iar `translation.from` din ce limbă s-a tradus. Site-ul arată traducerea automată în limba cititorului, cu nota „Traducere automată din …, încă nerevizuită”; nota dispare când cineva o verifică și trece `translation.status` la `reviewed`.
- Formele gramaticale (`names.forms.genitive`, `names.forms.vocative`) servesc la titluri și rugăciuni: *Acatistul Sfântului Ierarh Nicolae*, *Sfinte Ierarhe Nicolae, roagă-te pentru noi*.

## Cum adaugi un sfânt

1. Verifică dacă există deja (caută după nume, inclusiv în `variants`).
2. Creează `data/persons/<id>.json`: `id`, `kind`, `gender`, `holiness_types`, `sources`, `editorial` (`{ "status": "draft" }`), plus ce știi sigur (date, locuri, moaște).
3. Creează `data/i18n/ro/persons/<id>.json` cu cel puțin `names.display` și `translation`.
4. Creează pomenirea `data/commemorations/<id>--repose.json` (`kind: repose`, `subjects`, `date_rule`).
5. Așază pomenirea în calendarul fiecărei tradiții care o cinstește: `data/traditions/<tradiție>/menaion/MM/DD.json`.
6. Rulează `npm run format`, apoi `npm run check`, și deschide un PR.

## Dacă nu vrei să editezi fișierele

Deschide un [issue](https://github.com/OrthodoxProject/orthodox-synaxarion/issues/new/choose) și alege formularul potrivit. Formularele sunt în engleză, dar poți scrie în română.

| Formular | Când îl folosești |
|---|---|
| Correct the data | un nume, un titlu, o dată, ziua din calendar, o cruce sau un link e greșit; doi sfinți sunt amestecați într-o înregistrare sau același sfânt apare de două ori |
| Add a missing saint or feast | lipsește un sfânt, un grup, un praznic sau o icoană, ori lipsește din calendarul unei Biserici |
| Names and translations | nume sau texte într-o limbă care nu le are încă |
| Review draft records | verifici ciornele după o sursă sigură (calendarul oficial, un sinaxar) |
| Propose a source | o carte, un calendar oficial sau un site de citat ori de importat |
| Add a Church's calendar | calendarul unei Biserici care nu e încă în date |
| Bug in the website or the tools | site-ul, căutarea, calendarele ICS, API-ul sau comenzile `npm` nu merg cum trebuie |
| Idea or question | orice altceva, inclusiv o schimbare a schemei sau a vocabularului |

Pentru orice fapt dă sursa: fără ea datele nu se pot schimba.

Etichetele, din `.github/labels.yml`, arată tipul (`type:`), partea din repository (`area:`), Biserica (`tradition:`), limba (`lang:`) și stadiul (`status:`). Formularele pun singure `status: triage` și tipul; restul le pun cei care îngrijesc proiectul. Când adaugi o tradiție în `data/traditions/` sau o limbă în `data/i18n/`, adaugă și eticheta ei în `.github/labels.yml` și opțiunea ei în formulare (`… (id)`); `npm test` verifică.

## Importul din surse

```bash
npm run import
```

`npm run import` (`tools/import.ts`) citește sursele din `data/sources/` și adaugă în `data/` sfinții, praznicele, moaștele și icoanele pe care le listează. Se iau doar fapte: numele, ziua, crucea din calendar și linkul paginii. Viețile și imnurile nu se copiază, fiindcă sursele nu au licență liberă.

| Sursă | Ce se ia | Unde ajunge |
|---|---|---|
| calendar.patriarhia.ro | titlul oficial al fiecărei zile din 2026, cu crucile și culorile lor și cu notele de post | calendarul BOR (`romanian`), `official_titles`, semnele rândurilor și postul din `overrides/<an>.json` |
| doxologia.ro | sfinții fiecărei zile din calendarul lunar, cu pagina fiecăruia | calendarul BOR, numele în română, `external_ids.doxologia` |
| oca.org (Lives of the Saints) | pomenirile fiecărei zile, cu ID-ul OCA | calendarul rusesc (`russian`), numele în engleză, `external_ids.oca` |
| orthodox-calendar | listele de sfinți locali ruși și sârbi (doar indexul: zi, nume, link, chipul sfințeniei) | `russian`, `serbian`, la data din Minei; lista românească doar completează sfinții deja găsiți |
| copticchurch.net, st-takla.org | sinaxarul copt, cu linkurile zilelor | calendarul copt (`coptic`), numele în engleză |
| armenianchurch.ge | praznicele și pomenirile armene, grupate pe luni | `traditions/armenian/movable.json`, cu regulă `unspecified` |

Cum lucrează:

- **Descărcarea** respectă `robots.txt` și pauza cerută de fiecare site (OCA cere 10 secunde între pagini), deci prima rulare durează cam două ore. Paginile rămân în `build/cache/` (necomis); `--offline` lucrează doar cu ele, `--dry-run` doar raportează. Ca să descarci din nou (de exemplu calendarul unui an nou), șterge `build/cache/`.
- **O nouă rulare** recunoaște ce a importat deja (după ID-ul OCA, pagina doxologia, titlul oficial al rândului sau linkul sursei) și adaugă doar ce lipsește.
- **Aceeași pomenire din surse diferite** devine o singură înregistrare: în aceeași zi, numele se compară după o cheie de transliterare (*Pigasie* / *Pegasius*, *Hristofor* / *Christopher*), după un tabel de echivalențe (*Ioan* / *John*, *Vasile* / *Basil*) și după epitete, locuri și numere (*din Veria* nu e *of Dymsk*, *Eustatie I* nu e *Eustatie al II-lea*). Același sfânt în altă zi (aceeași pagină doxologia, același nume complet) rămâne aceeași persoană, cu încă o pomenire.
- **Listele rusă și sârbă din orthodox-calendar** dau ziua civilă în care aceste Biserici, pe stil vechi, țin pomenirea: Sf. Serafim de Sarov apare pe 15 ianuarie, iar ziua lui din Minei e 2 ianuarie. Importul caută sfântul la data din Minei (cu 13 zile mai devreme, socotit ca într-un an bisect: 1 martie e 17 februarie); dacă nu-l găsește acolo, îl caută la data civilă, unde OCA ține câțiva sfinți din secolul XX (Sf. Tihon, Sfinții Mucenici Împărătești). Numele fără titlu din liste (*Basil of Ostrog*) iau chipul sfințeniei din listă și se potrivesc cu un alt sfânt doar dacă se potrivesc și chipul sfințeniei, și locul.
- **Numele unei persoane** e numele sfântului, nu titlul pomenirii: din *Repose of Venerable Seraphim, Wonderworker of Sarov*, *Beheading of Venerable Cornelius* sau *Adormirea Sfântului Apostol Ioan* rămâne numele sfântului, iar *Glorification of Saint John of Kronstadt* devine o pomenire `glorification` a Sf. Ioan de Kronstadt. Aducerile de moaște (*Relocation of the relics of …*, *First Translation of the relics of …*) devin pomeniri `relics_translation` ale sfântului, întâmplările din viața lui sau din istoria moaștelor lui (*Nativity of Saint Nicholas*, *Entrance of the Apostle Andrew into Georgia*, *The Coming of Saint Severus … to Egypt*, *The Burning of Saint Sava's relics*) pomeniri `event` ale lui, evenimentele fără sfânt (*Commemoration of the Great Earthquake …*) pomeniri `event` fără subiect, iar *The Holy Transfiguration of our Lord …* și *the Life giving Annunciation* sunt praznicele Schimbării la Față și Bunei Vestiri. Niciuna nu devine persoană.
- **Locurile și epitetele de după nume** rămân în nume (*Mitropolitul Moscovei și Kolomnei*, *Iustin Martirul și Filosoful*, *of Prague, Bohemia and Moravo-Cilezsk*, *King and Hymnographer*), iar titlurile dinaintea lor nu devin nume (*Holy and Righteous Ancestors of God, Joachim and Anna*, *Unmercenary Physicians Cosmas and Damian*). *Equals of the Apostles and Teachers of the Slavs, Cyril and Methodius*, *Constantine with his Mother Helen* și *Cleopatra with her son John* numesc câte doi sfinți; un rând cu însoțitori numărați (*Empress Augusta, Porphyrius the General, the 50 philosophers and the 200 Soldiers …*, *Christ’s seventy-two Disciples*) e un grup. Un rând copt care numește un sfânt și o aducere de moaște (*The Martyrdom of St. Timothy and the Relocation of the Body of St. Theodore*) sau două grupuri (*Holy Martyrs Alphaeus, Zacchaeus, Romanus and John, and the Commemoration of the Saints Thomas, Victor, and Isaac*) dă două pomeniri pe același rând de calendar.
- **Dublurile unite** păstrează ID-ul publicat, iar celălalt trece în `aliases`; importul nu dă unei înregistrări noi un ID aflat în `aliases`.
- **Pomenirile fixe ale OCA** sunt cele care cad în aceeași zi în 2026 și în 2028; celelalte țin de ciclul mobil și se lasă deoparte. La fel, duminicile, Săptămâna Mare și celelalte zile mobile din calendarul românesc.
- **Patriarhia Ecumenică și Biserica Sârbă** primesc pomenirile pe care le au și calendarul BOR, și cel al OCA (Mineiul bizantin comun), cu `confidence: low`, plus sfinții locali sârbi. Biserica Greciei rămâne de completat.
- **Sfinții universali** (Maica Domnului, arhanghelii, apostolii, prorocii, Sf. Ioan Botezătorul) din sinaxarul copt și din calendarul armean trimit la aceleași persoane ca în calendarele bizantine. Un rând trimite la Maica Domnului doar când e despre ea (*The Commemoration of the Virgin St. Mary*, *The Apparition of the Pure Lady the Virgin …*), nu când îi poartă numele o altă sfântă (*St. Mary of Egypt*, *St. Melitina the Virgin*, *the Virgin Sandoukht*) sau când o numește doar ca rudă (*St. Anna, the mother of the Theotokos*); la fel, *the Baptist* trimite la Sf. Ioan Botezătorul, nu la tatăl sau la mama lui. Dintre mai mulți apostoli sau proroci cu același nume, epitetul îl alege pe cel numit (*St. John the Evangelist* e Sf. Ap. Ioan, *Obadiah, the Prophet* e Sf. Proroc Avdie). Ceilalți sfinți ai acestor rânduri sunt persoane copte sau armene; un rând copt nou despre un sfânt copt deja cunoscut trimite la el, nu face o persoană nouă.
- **Postul din calendarul oficial** (notele „Dezlegare la pește”, „Harți”, „Post” și „Dezlegare la brânză, lapte, ouă și pește” din titlul zilei) ajunge în `data/traditions/romanian/overrides/<an>.json`. Calendarul oficial tipărește toate dezlegările la pește, deci o zi în care [modelul de post](#calendarul-calculat) ar da pește, iar calendarul nu, primește postul modelului fără dezlegare. Postul deja scris pentru o zi nu se rescrie; valorile care diferă de calendarul oficial se numără în raport la `patriarhia.fasting-kept`.
- **Înregistrările existente nu se rescriu**: importul le recunoaște și le pune doar în calendarele în care lipseau; rândurile noi se adaugă după cele existente ale zilei. Toate înregistrările noi sunt ciorne, cu sursele lor și cu nota „Importat automat … de verificat” în `editorial.notes`.

- **Traducerile automate** nu contează la potrivire: numele se compară doar cu ce au scris sursele și redactorii.

Ce rămâne de lucru după import: numele în limba care lipsește (sfinții găsiți doar în română sau doar în engleză apar ca avertismente `i18n.missing-locale`, până îi traduce `npm run translate`), zilele armene, chipul sfințeniei acolo unde titlul nu-l spune (notat în `editorial.notes`), și revizuirea potrivirilor făcute automat.

## Traducerea numelor

```bash
npm run translate -- --export
```

Multe înregistrări au nume doar într-una din limbile site-ului: sfinții din calendarul OCA, din sinaxarul copt și din calendarul armean doar în engleză, cei din calendarul BOR doar în română. `npm run translate -- --export` (`tools/translate.ts`) scrie, pentru fiecare limbă, ce îi lipsește în `build/translate/<limbă>.json` (necomis): numele și textele scurte (`summary`, `synaxarion`) din fișierele de limbă, plus viețile lungi (`.md`). Fiecare intrare are textul de tradus (`source`), limba lui (`from`) și context: felul înregistrării, genul, chipul sfințeniei, tradițiile care o pomenesc și numele pe care înregistrările legate de ea le au deja în limba țintă.

Completezi `target` cu traducerea, în aceeași formă ca `source` (pentru persoane și `names.full`, `names.short`, `names.given`, în stilul limbii țintă: *Sf. Cuv. Anatolie I de la Optina* / *Venerable Anatole I of Optina*), apoi:

```bash
npm run translate -- --apply
```

`--apply` scrie fișierele în `data/i18n/<limbă>/`, cu `translation` `{ "status": "machine", "method": "machine", "from": "en", "date": … }`; `--method human` le marchează ca traduse de un om. Intrările necompletate se sar. Textul pe care o înregistrare îl are deja într-o limbă nu se înlocuiește niciodată; o traducere automată mai veche, da. Variantele de nume, numele populare și onomasticile nu se traduc: țin de fiecare limbă. Rulează apoi `npm run check`.

## Ce verifică validatorul

Fiecare problemă are un cod stabil. Erorile opresc CI-ul; avertismentele doar semnalează.

| Cod | Tip | Ce înseamnă |
|---|---|---|
| `schema` | eroare | fișierul nu respectă schema (câmp lipsă, valoare greșită, dată EDTF sau referință biblică invalidă) |
| `json.parse`, `format.non-canonical`, `format.line-endings` | eroare | JSON invalid sau neformatat (rezolvă `npm run format`) |
| `text.not-nfc`, `text.cedilla` | eroare | Unicode nenormalizat; ş/ţ cu sedilă în română |
| `path.unexpected`, `path.id-mismatch`, `path.locale-mismatch`, `path.tradition-mismatch`, `path.date-mismatch`, `path.year-mismatch` | eroare | fișier în alt loc decât cel prevăzut, sau conținut care nu se potrivește cu calea |
| `ref.missing`, `ref.unknown-tradition`, `ref.unknown-symbol` | eroare | trimitere către ceva ce nu există |
| `alias.conflict`, `relation.self`, `place.cycle` | eroare | ID-uri sau legături incoerente |
| `person.no-commemoration`, `group.no-commemoration` | eroare | persoană sau grup fără nicio pomenire |
| `date.invalid`, `rule.unspecified-not-draft` | eroare | zi care nu există în calendarul respectiv; regulă necunoscută într-o înregistrare care nu e ciornă |
| `calendar.duplicate` | eroare | aceeași pomenire de două ori în calendarul unei tradiții |
| `group.count-mismatch`, `group.duplicate-member` | eroare | grup cu mai mulți membri decât numărul declarat, sau membru repetat |
| `i18n.orphan`, `i18n.missing`, `text.orphan` | eroare | fișier de limbă fără înregistrare, înregistrare fără niciun nume, text lung fără fișierul cu nume |
| `license.text-not-allowed` | eroare | text integral de imn cu licență care nu permite publicarea |
| `tradition.missing-definition`, `override.*`, `observance.duplicate-id` | eroare | probleme în fișierele unei tradiții |
| `i18n.missing-locale`, `vocab.missing-label`, `vocab.missing-file` | avertisment | lipsesc texte sau etichete în română ori engleză |
| `calendar.not-placed`, `calendar.default-date-mismatch`, `calendar.fixed-in-movable`, `calendar.transfer-unplaced` | avertisment | pomenire necuprinsă în niciun calendar, sau așezată altfel decât data ei obișnuită |
| `rule.leap-day-without-fallback`, `icon.no-commemoration`, `tradition.title-unused`, `tradition.label-*`, `i18n.unknown-writing`, `text.empty` | avertisment | detalii de completat |

## Exemplele din v0.1

Datele din `data/` au pornit de la 17 cazuri-limită alese ca să pună schema la încercare (grupuri de sfinți, 29 februarie, sărbători mobile, mutări, aceeași pomenire în tradiții diferite, sfinți cinstiți într-o singură familie de Biserici), plus Adormirea Maicii Domnului, Sf. Roman Melodul (autorul condacului Nașterii), Sf. Cuv. Gherman din Dobrogea și Sf. Doamnă Maria Brâncoveanu: 28 de persoane, 4 grupuri, 28 de pomeniri, 27 de locuri, o icoană, 2 imne, 9 surse. Titlurile, semnele și lecturile BOR ale acestor exemple vin din calendarul oficial pe 2026.

Restul vine din [importul din surse](#importul-din-surse). Pe scurt, acum:

- 3.755 de persoane (cu nume din surse: 1.554 în română, 3.101 în engleză, 900 în ambele), 356 de grupuri, 4.652 de pomeniri, 306 icoane;
- calendarul BOR are toate cele 366 de zile (1.625 de rânduri, 765 cu titlul oficial), cel rusesc 366 de zile (2.798 de rânduri), cele ale Patriarhiei Ecumenice și Serbiei câte 355 de zile (899 și 973 de rânduri, cu încredere scăzută), cel copt 365 de zile (696 de rânduri); cele 146 de pomeniri armene așteaptă regula zilei;
- 8 tradiții: BOR, Patriarhia Ecumenică, Biserica Greciei, Rusia, Serbia (Biserici răsăritene), copți și armeni (Biserici orientale), Biserica Asiriană a Răsăritului;
- texte în 8 limbi: română, engleză, greacă (modernă și bizantină), rusă, sârbă (chirilică), armeană, arabă.

**Toate înregistrările sunt ciorne** (`editorial.status: draft`) și trebuie revizuite înainte de publicare. Ce mai e de verificat e notat în `editorial.notes`.

## Calendarul calculat

```bash
npm run generate -- --year 2026
```

Comanda scrie zilele fiecărei tradiții în `build/days/<tradiție>/<an>/<MM-DD>.json`, plus un fișier pe an cu toate zilele. Opțiuni: `--tradition romanian` (se poate repeta), `--from 2025 --to 2030`. Folderul `build/` nu se comite. Forma unei zile e descrisă de [schema/build/day.schema.json](../schema/build/day.schema.json).

| Câmp | Ce conține |
|---|---|
| `date`, `weekday` | ziua civilă (calendarul gregorian) |
| `church_calendar`, `church_date` | stilul tradiției în acea zi și data din Minei (sau data coptă / etiopiană) |
| `julian_date` | aceeași zi pe stil vechi |
| `pascha_offset` | zile față de Paștile anului civil (negativ înainte de Paști) |
| `lines` | rândurile de calendar, cu pomenirile, semnul și rangul; `transferred_from` arată ziua de unde a fost mutat un rând |
| `ongoing` | perioadele în curs, de ex. ziua 3 din cele 5 ale înainte-prăznuirii |
| `tone`, `eothinon` | glasul săptămânii și voscresna duminicii (doar la Bisericile răsăritene) |
| `fasting` | postul zilei, pentru tradițiile cu `fasting_model`, sau din calendarul oficial |
| `readings` | lecturile proprii ale pomenirilor, sau toate lecturile din calendarul oficial |
| `observances`, `flags` | zilele libere și celelalte zile din `observances.json`; `flags.public_holiday` |
| `sunday_after_pentecost`, `notes`, `official` | din `overrides/<an>.json`; `official` arată că ziua conține fapte din calendarul oficial |

Cum calculează motorul (`tools/lib/calendar.ts`, `tools/lib/days.ts`):

- **Data bisericească**: stilul vechi e calendarul iulian; stilul nou e calculat ca gregorian, ceea ce e exact între 1600 și 2799. Înainte de data din `calendar_history`, tradiția folosește stilul vechi; în 1900 diferența dintre stiluri era de 12 zile, apoi de 13.
- **29 februarie**: în anii nebisecți, rândurile din `menaion/02/29.json` trec la data din `non_leap` a primei pomeniri (implicit 28 februarie), înaintea rândurilor proprii ale zilei, cum le tipărește calendarul oficial.
- **Paștile**: pascalia iuliană sau gregoriană, după `paschalion`.
- **Mutări** (`transfers`): perioadele se măsoară în zile față de Paști: săptămâna brânzei −55…−49, Postul Mare −48…−9, Săptămâna Mare −6…−1, Paștile 0, Săptămâna Luminată 1…6, Triodul −70…−1, Penticostarul 0…56. `before_pascha` înseamnă între −70 și −1. Se mută doar rândurile cu dată fixă.
- **Glasul**: glasul 1 începe în Duminica Tomii și se schimbă duminica, ciclic; de la Florii până în Sâmbăta Luminată nu există glasul săptămânii.
- **Voscresna**: în duminicile Penticostarului are valori fixe (Toma 1, Mironosițe 3, Slăbănog 4, Samarineancă 7, Orb 8, Sfinții Părinți 10); de la Duminica Tuturor Sfinților ciclul de 11 începe cu 1. Floriile, Paștile și Rusaliile nu au voscresnă.
- **Postul** (`fasting_model: "romanian"`): perioadele de post, miercurea și vinerea, harțile și dezlegările la pește, cum le tipăresc calendarele oficiale din 2025 și 2026. Pește se dă miercurea și vinerea de la Duminica Tomii la Rusalii; sâmbăta și duminica în Postul Sf. Petru și Pavel și în Postul Crăciunului, aici doar de la Intrarea în biserică (21 noiembrie) până la 19 decembrie; în aceste două posturi, și lunea, marțea și joia cu un sfânt cu cruce, iar miercurea și vinerea doar la un praznic cu (†) roșu; plus Bunavestirea, Floriile, Schimbarea la Față, Intrarea în biserică și Sf. Nicolae. Dezlegările de la sfinți sunt aproximative: zilele exacte vin din calendarul oficial.
- **Calendarul oficial** (`overrides/<an>.json`) are întâietate. `npm run generate` arată zilele în care glasul, voscresna sau postul calculate diferă de el. Pentru 2026, testele cer să nu existe alte diferențe decât două dezlegări pe care nicio regulă nu le dă (11 iunie și 2 decembrie) și ca modelul să nu dea pește în nicio zi în care calendarul oficial nu dă.
- Pomenirile cu regula `unspecified` nu apar în zile; comanda le numără separat.

## Limitări

- postul urmează doar modelul românesc; în anii fără calendar oficial importat, dezlegările de la sfinți sunt aproximative; celelalte tradiții primesc postul doar din calendarul oficial;
- lecturile zilei (ciclul Apostolului și al Evangheliei) și numerotarea duminicilor după Rusalii (saltul lucan) nu se calculează încă; vin doar din calendarul oficial;
- site-ul, wiki-ul, API-ul și fișierele ICS nu se generează încă;
- schemele nu au `$id`; se leagă între ele prin căi relative.
