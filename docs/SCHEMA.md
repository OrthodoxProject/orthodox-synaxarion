# Schema v0.1: cum sunt organizate datele

Ghid pentru cine adaugă sau corectează date. Motivele din spatele structurii sunt în [PLAN.md](PLAN.md), iar întrebările încă deschise în [INTREBARI.md](INTREBARI.md).

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
| `npm test` | testează validatorul |

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
- **ID-uri**: litere mici, cifre și cratimă, în engleză (`nicholas-of-myra`). Cratima dublă separă o parte a aceleiași entități (`nicholas-of-myra--translation-of-relics`). Un ID publicat nu se mai schimbă; dacă trebuie, vechiul ID trece în `aliases`.
- **Coduri** de vocabular: litere mici și underscore (`great_martyr`, `gospel_book`). Fiecare cod are etichetă în `i18n/<limbă>/vocab.json`, sub cheia `<spațiu>.<cod>` (ex. `holiness_type.great_martyr`).
- **Referințe**: cu prefixul tipului: `person:`, `group:`, `comm:`, `place:`, `icon:`, `hymn:`, `src:`, `media:`. Tradițiile se scriu fără prefix (`romanian`).
- **O singură direcție**: pomenirea indică persoana (`subjects`), copilul indică părintele (`child_of`). Legăturile inverse (pomenirile unui sfânt, `parent_of`) se calculează.
- **Cinstirea e pe tradiție**: rezultă din calendarele tradițiilor. `veneration` se completează doar pentru detalii (cinstire locală, de când) sau pentru cinstire fără zi în calendar.
- **Date istorice**: EDTF. `1053-11-07` (exact), `0968~` (aproximativ), `1053?` (nesigur), `03XX` (secolul IV), `[1714,1716]` (unul dintre ani), `1688/1714` (interval). Adaugă `calendar: julian` sau `gregorian` când ziua contează.
- **Date bisericești**: luna și ziua din Minei (`11-07`), aceleași pe stil vechi și pe stil nou. Data civilă o calculează generatorul (faza 2). La copți și etiopieni, luna 13 există.
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
- `overrides/<an>.json` adună fapte din calendarul oficial pe un an (lecturi, glas, voscresnă, post, numărul duminicii, zile libere). Motorul din faza 2 le va folosi ca teste.

## Limbi

- Fiecare limbă are fișierele ei: `i18n/ro/...`, `i18n/en/...`, `i18n/sr-Cyrl/...`, `i18n/grc/...`. Codurile urmează BCP 47.
- O persoană, un grup, un loc, o icoană și o tradiție au nevoie de nume în cel puțin o limbă. Pentru română și engleză (limbile primei versiuni), lipsa e semnalată ca avertisment.
- Zilele de sfinți (`kind: repose`) își iau titlul din persoană, deci nu au nevoie de fișier de limbă propriu; îl adaugi doar pentru nume populare (`names.folk`, ex. *Sângeorz*, *Никољдан*).
- `translation.method` spune de unde vine textul: `original`, `human`, `machine` sau `ai_assisted`. Textele `machine` și `ai_assisted` nu se publică până nu ajung la statutul `reviewed`.
- Formele gramaticale (`names.forms.genitive`, `names.forms.vocative`) servesc la titluri și rugăciuni: *Acatistul Sfântului Ierarh Nicolae*, *Sfinte Ierarhe Nicolae, roagă-te pentru noi*.

## Cum adaugi un sfânt

1. Verifică dacă există deja (caută după nume, inclusiv în `variants`).
2. Creează `data/persons/<id>.json`: `id`, `kind`, `gender`, `holiness_types`, `sources`, `editorial` (`{ "status": "draft" }`), plus ce știi sigur (date, locuri, moaște).
3. Creează `data/i18n/ro/persons/<id>.json` cu cel puțin `names.display` și `translation`.
4. Creează pomenirea `data/commemorations/<id>--repose.json` (`kind: repose`, `subjects`, `date_rule`).
5. Așază pomenirea în calendarul fiecărei tradiții care o cinstește: `data/traditions/<tradiție>/menaion/MM/DD.json`.
6. Rulează `npm run format`, apoi `npm run check`, și deschide un PR.

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

Datele din `data/` sunt cele 17 cazuri-limită din [PLAN.md §13](PLAN.md#13-etape), plus Adormirea Maicii Domnului, Sf. Roman Melodul (autorul condacului Nașterii), Sf. Cuv. Gherman din Dobrogea și Sf. Doamnă Maria Brâncoveanu. Pe scurt:

- 28 de persoane, 4 grupuri, 28 de pomeniri, 27 de locuri, o icoană, 2 imne, 9 surse;
- 8 tradiții: BOR, Patriarhia Ecumenică, Biserica Greciei, Rusia, Serbia (Biserici răsăritene), copți și armeni (Biserici orientale), Biserica Asiriană a Răsăritului;
- texte în 8 limbi: română, engleză, greacă (modernă și bizantină), rusă, sârbă (chirilică), armeană, arabă.

Titlurile, semnele și lecturile BOR vin din calendarul oficial pe 2026; legăturile OCA și coptice vin din datele orthodox-calendar.

**Toate înregistrările sunt ciorne** (`editorial.status: draft`), iar textele sunt redactate cu ajutorul AI (`translation.method: ai_assisted`). Le marchează așa tocmai ca să fie revizuite de un om înainte de publicare. Ce trebuie verificat e notat în `editorial.notes`.

## Ce nu face încă v0.1

- nu calculează zilele (pascalia, regulile de dată, mutările, glasul, postul): faza 2;
- nu are reguli de post pe tradiție și nici ciclul complet al lecturilor: faza 2;
- nu generează site-ul, wiki-ul, API-ul și fișierele ICS: fazele 4–5;
- `$id`-urile schemelor se adaugă când le publicăm pe site; până atunci schemele se leagă între ele prin căi relative.
