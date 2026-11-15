# Plan: pomenirile Mineiului din sinaxarul zilei

Calendarul oficial al Patriarhiei Române (calendar.patriarhia.ro) are în titlul zilei doar pomenirile principale. Celelalte pomeniri din Minei sunt în sinaxarul zilei, în rândurile *Tot în această zi, pomenirea …*. Calendarul oficial le dă doar în unele zile, în lista *Mineiul mai menționează la această dată …*: în copia citită pe 11 noiembrie 2026, 68 de zile între 27 septembrie și 21 decembrie, fără 15 noiembrie. Două site-uri publică sinaxarul Mineiului pentru fiecare zi a anului, iar din ele se pot lua pomenirile care lipsesc. Issue: [#36](https://github.com/OrthodoxProject/orthodox-synaxarion/issues/36).

| Sursă | Cum se citește |
|---|---|
| calendar-ortodox.ro (`src:calendar-ortodox`) | câte o pagină pe zi, `https://www.calendar-ortodox.ro/luna/<luna>/<luna><ziua>.htm` (de ex. `luna/noiembrie/noiembrie15.htm`); HTML static în ISO-8859-2, neschimbat de ani de zile; nu are `robots.txt` |
| Arhiepiscopia Argeșului și Muscelului (`src:arhiepiscopia-arges`) | câte o postare pe zi în secțiunea *Sinaxar*, publicată în ajun; adresa e `sinaxar-<ziua>-<luna>`, dar o zi poate avea mai multe postări (`sinaxar-15-noiembrie` și `sinaxar-15-noiembrie-2`, cu aceleași rânduri), deci postările se caută prin WordPress: `/wp-json/wp/v2/posts?search=…`; UTF-8; `robots.txt` oprește doar `/wp-admin/` |

Amândouă au toate drepturile rezervate, deci se iau doar fapte: cine se pomenește și în ce zi, cu linkul paginii zilei. Viețile nu se copiază.

## Făcut

- **15 noiembrie, de mână.** Sesizarea: în ziua aceasta BOR îi mai pomenește pe Preacuviosul Părintele nostru Chintian, episcopul Seleuciei, și pe Sfântul Mucenic Dimitrie, care lipseau din calendarul BOR al site-ului. Cele două surse mai au un rând care lipsea: *Sfinții Mucenici Elpidie, Marcel, Eustohie și cei împreună cu dânșii*. Ce s-a schimbat în date:
  - cele două surse sunt în `data/sources/` (`calendar-ortodox.json`, `arhiepiscopia-arges.json`);
  - calendarul BOR are trei rânduri noi, după cele existente și în ordinea din sinaxar: Sf. Cuv. Chintian, Sf. Mc. Elpidie, Marcel, Eustohie și cei împreună cu dânșii, Sf. Mc. Dimitrie;
  - Sf. Chintian e o persoană nouă, `quinctian-of-seleucia`, cu pomenirea `quinctian-of-seleucia--repose`; numele englezesc vine de la Wikipedia (*Saint Quinctian (Kyntion), Bishop of Seleucia*, secolul al IV-lea, în [November 15 (Eastern Orthodox liturgics)](https://en.wikipedia.org/wiki/November_15_(Eastern_Orthodox_liturgics))); OCA și doxologia nu îl au;
  - celelalte două pomeniri erau deja în date, din OCA, doar în calendarul rusesc: `elpidius-and-companions` (*Martyrs Elpidius, Marcellus, and Eustochius, who suffered under Julian the Apostate*) și `demetrios-of-thrace--repose` (*Martyr Dēmḗtrios of Thrace*). Viețile scurte ale OCA spun același lucru ca sinaxarul românesc: Elpidie era senator sub Iulian Apostatul; Dimitrie a fost prins sub împăratul Maximian și arhontele Publius și i s-a tăiat capul. Pomenirile și persoanele lor (`elpidius`, `marcellus-2`, `eustochius-2`, `demetrios-of-thrace`) au acum și cele două surse românești, încrederea `medium`, iar numele românești ale surselor au luat locul traducerilor automate (Sf. Mc. Eustohie, nu *Eustohie, care a pătimit sub Iulian Apostatul*; Sf. Mc. Dimitrie, nu *Dimitrie din Tracia*);
  - fiind acum și în calendarul BOR, și în cel rusesc, cele două pomeniri au intrat și în calendarele Patriarhiei Ecumenice și Serbiei (`confidence: low`, în ordinea rândurilor rusești), după regula Mineiului comun.

## Urmează

1. **Cititorul fiecărei surse**, în `tools/lib/import/sources/`, prin `PoliteFetcher` și cache-ul paginilor (`build/cache/`): pentru calendar-ortodox.ro, 366 de pagini statice; pentru Arhiepiscopia Argeșului, postările *Sinaxar <ziua> <luna>* găsite prin API-ul WordPress. Se păstrează doar rândurile sinaxarului (*În această lună, ziua a …, pomenirea …* și *Tot în această zi, pomenirea …*), cu ziua și linkul.
2. **Citirea formelor din Minei.** `parseRo` citește titlurile din calendar (*Sf. Mc. Dimitrie*), nu și pe cele din sinaxar: genitivul (*pomenirea Sfântului Mucenic Dimitrie*, *Sfinților Mucenici …*), *Preacuviosul Părintele nostru …*, *cuviosului părintelui nostru …*, *și cei împreună cu dânșii*. Azi sare de tot peste *Preacuviosul Părintele nostru Chintian, episcopul Seleuciei*. Se trec la nominativ și la formele din calendar, cu teste în `tests/import.test.ts`.
3. **Potrivirea cu datele.** Cele mai multe rânduri sunt deja în date ca pomeniri OCA, cu nume românești traduse automat: rândul ajunge la ele și le dă numele din sursă, ca pe 15 noiembrie. Pentru restul se fac persoane noi. Pomenirile care ajung astfel și în calendarul BOR, și în cel rusesc trec, după regula Mineiului comun, și la Patriarhia Ecumenică și la Serbia; `Builder.shared()` vede azi doar rândurile doxologia și ale calendarului oficial.
4. **Când sursele nu se potrivesc.** Pe 15 noiembrie, postarea de la Argeș începe cu Sf. Paisie și nu are rândul Sf. Gurie, Samona și Aviv, pe care îl are calendar-ortodox.ro; se citesc deci amândouă, și un rând dintr-una singură intră. De hotărât cum se îmbină cu listele *Mineiul mai menționează* ale calendarului oficial (citirea lor e o schimbare a importului încă nefuzionată) și ce se face cu rândurile pe care sursele le scriu altfel decât calendarul oficial.
5. **Verificarea pe tot anul deodată**, cu `npm run suspects` și cu un script care pune alături, pentru fiecare zi, rândurile celor două surse, titlul oficial, doxologia și OCA (vezi [docs/PLAN.md](PLAN.md)); apoi importul, iar un import offline peste datele rezultate nu mai scrie nimic. Numerele din [SCHEMA.md](SCHEMA.md#exemplele-din-v01) se actualizează.
6. De văzut: secțiunea *Sinaxar Argeșean* a aceluiași site, cu sfinții locului.

## De unde se continuă

De la pasul 1, cu calendar-ortodox.ro: are o pagină pe zi la o adresă știută, deci e sursa cea mai simplă. Pentru 15 noiembrie, datele de acum sunt rezultatul așteptat al importului.
