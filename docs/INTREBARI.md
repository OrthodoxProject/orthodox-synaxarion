# Întrebări deschise

Contextul e în [PLAN.md](PLAN.md). Răspunde cum îți e comod:

- direct în fișier, sub fiecare întrebare, după `Răspuns:`;
- sau în chat, pe scurt: `Q1: A`, `Q9: BOR, Rusia`, `Q15: crucea albastră = …`.

**Legendă:** ⭐ recomandarea mea (dacă nu răspunzi, merg pe ea și notez decizia în PLAN.md) · 🔴 blochează schema (faza 1) · 🟡 necesară până la import și site · 🟢 poate aștepta.

**Răspunse pe 7 noiembrie 2026:** Q1, Q9, Q40, Q41, Q55, Q56 (deciziile sunt și în PLAN.md). Pentru schema v0.1 am aplicat provizoriu recomandările ⭐ la toate celelalte întrebări; un răspuns diferit înseamnă doar o modificare de schemă.

**Dacă ai timp doar pentru câteva**, răspunde la cele 🔴 rămase: Q5, Q12, Q18, Q31, Q34, Q37, Q38, Q42, Q59, Q60 și Q68 (nouă).

## A. Scop și identitate

### Q1 🔴 Ce Biserici intră în sinaxar?
- **A.** Doar Biserica Ortodoxă (răsăriteană): Bisericile autocefale și autonome aflate în comuniune.
- **B.** A, plus Bisericile Ortodoxe Orientale (copți, etiopieni, eritreeni, armeni, sirieni, malankara), ca tradiții separate, marcate clar.
- **C.** B, plus Biserica Asiriană a Răsăritului (cum face orthodox-calendar).
- ⭐ **A în prima versiune**, cu o schemă care suportă și B (calendarele copt și etiopian), ca să putem lega mai târziu sfinții comuni de dinainte de 451.

Răspuns: **C**. Bisericile Ortodoxe răsăritene, Bisericile Ortodoxe Orientale și Biserica Asiriană a Răsăritului, ca familii distincte. Întrebări noi care decurg de aici: Q68–Q71.

### Q2 🟡 Includem sfinții occidentali de dinainte de 1054 (ex. Sf. Benedict, Sf. Patrick, Sf. Genoveva)?
- **A.** Da, pe cei cinstiți în cel puțin o Biserică ortodoxă (ex. OCA, ROCOR, Antiohia). crestinortodox.ro îi preia deja din „Sinaxarul Sfinților de pretutindeni”.
- **B.** Doar dacă apar în calendarul oficial al unei Biserici autocefale.
- **C.** Nu.
- ⭐ **A**, cu tradiția care îi cinstește înregistrată explicit.

Răspuns:

### Q3 🟡 Includem persoane cinstite de popor, dar necanonizate (ex. stareți contemporani)?
- **A.** Nu.
- **B.** Da, separat, cu statutul „cinstire populară” sau „propus pentru canonizare”, fără să apară în calendar.
- **C.** Da, în calendar, cu marcaj.
- ⭐ **A** la început; eventual **B** mai târziu, doar cu surse solide.

Răspuns:

### Q4 🟡 Cum tratăm canonizările și jurisdicțiile disputate (Ucraina, vechi-calendariștii, ROCOR înainte de 2007, Macedonia înainte de 2022)?
- **A.** Înregistrăm faptele: cine a canonizat, când și cine recunoaște, fără să judecăm.
- **B.** Doar Bisericile recunoscute de Patriarhia Ecumenică sau de majoritatea Bisericilor.
- **C.** Doar ce recunoaște BOR.
- ⭐ **A**, cu un filtru în site (implicit: Bisericile aflate în comuniune).

Răspuns:

### Q5 🔴 Pentru cine e proiectul, în ordinea priorității?
- **A.** Credincioși (viață, rugăciuni, post, onomastică).
- **B.** Clerici și cântăreți (tipic, rânduiala slujbelor).
- **C.** Cercetători (surse, BHG, ediții critice).
- **D.** Dezvoltatori (API, date).
- ⭐ **A > D > C > B**: tipicul complet e efortul cel mai mare, așa că îl amânăm.

Răspuns:

### Q6 🟢 Ce statut are proiectul?
Proiect personal, comunitar sau cu binecuvântare și parteneri (parohie, eparhie, Basilica, Doxologia)? Asta schimbă ce surse oficiale putem folosi și cine revizuiește textele.

Răspuns:

### Q7 🟢 Nume și domeniu
Păstrăm `orthodox-synaxarion` ca nume de repo? Ce nume afișăm pe fiecare limbă (*Sinaxar Ortodox*, *Orthodox Synaxarion*, *Ορθόδοξος Συναξαριστής*, *Православный синаксарь* …)? Acum că intră și Biserica Asiriană a Răsăritului, care nu se numește „ortodoxă”, numele mai e potrivit? Vrei un domeniu propriu pentru site?

Răspuns:

### Q8 🟡 Ce relație avem cu `nikolareljin/orthodox-calendar`?
- **A.** Proiect separat, cu export în formatul lor (le putem propune un PR care să-l folosească).
- **B.** Fork și extindere în repo-ul lor.
- **C.** Le propunem direct schema noastră.
- ⭐ **A**. Ai contact cu autorul?

Răspuns:

## B. Tradiții și calendar

### Q9 🔴 Ce tradiții intră în prima versiune publică? (poți alege mai multe)
- [x] BOR (România) ⭐
- [x] Patriarhia Ecumenică și Biserica Greciei ⭐
- [x] Rusia ⭐
- [x] Serbia ⭐
- [ ] Moldova (Mitropolia Chișinăului, ROC; Mitropolia Basarabiei, BOR)
- [ ] Bulgaria · Georgia · Antiohia · Ierusalim · Athos · Cipru · Albania · Polonia · Cehia și Slovacia
- [ ] OCA · ROCOR · Ucraina · Finlanda · Estonia · Japonia

⭐ BOR, Grecia, Rusia și Serbia: acoperă majoritatea sfinților și ambele stiluri (vechi și nou).

Răspuns: BOR, Patriarhia Ecumenică și Biserica Greciei, Rusia, Serbia. Celelalte tradiții (inclusiv cele orientale și cea asiriană) vin după prima versiune.

### Q10 🟡 Cât de detaliat mergem pe teritoriu?
- **A.** Pe Biserică autocefală, plus câmpul „cinstire locală” cu eparhia.
- **B.** Și calendare complete pe eparhii și mănăstiri.
- **C.** Și hramurile bisericilor (set de date separat).
- ⭐ **A** acum; **C** ca proiect separat, mai târziu.

Răspuns:

### Q11 🟢 Afișăm la fiecare zi ambele date, pe stil nou și pe stil vechi?
- ⭐ Da (ex. „7 noiembrie / 25 octombrie stil vechi”).

Răspuns:

### Q12 🔴 Cum obținem sărbătorile mobile, lecturile și postul pentru fiecare an?
- **A.** Le calculăm integral cu un motor propriu (pascalie, reguli, tipic).
- **B.** Importăm datele oficiale pe fiecare an (ex. calendarul BOR) și calculăm doar ce lipsește.
- **C.** Hibrid: calculăm, dar acceptăm corecții anuale (`overrides/<an>.json`) din calendarul oficial, cu teste care compară cele două.
- ⭐ **C**. În calendarul BOR pe 2026, numerotarea duminicilor sare (1 noiembrie e a 22-a după Rusalii, 8 noiembrie a 24-a, 29 noiembrie a 30-a), deci motorul trebuie validat pe date reale. Importul integral din calendarul Patriarhiei cere acordul lor (vezi §8 din plan).

Răspuns:

### Q13 🟡 Pe ce interval de ani generăm calendarul?
- **A.** 1900–2100.
- **B.** Anul curent ± 5.
- **C.** Orice an, la cerere (calcul în browser sau în API).
- ⭐ **A** pentru fișierele statice, plus **C** în biblioteca de calcul.

Răspuns:

### Q14 🟢 Pentru anii dinainte de reformă (ex. România înainte de 1924), folosim stilul vechi?
- ⭐ Da, după `reform_date` (cum face și orthodox-calendar).

Răspuns:

### Q15 🟡 Ce înseamnă semnele din calendarul BOR?
În datele calendar.patriarhia.ro pe 2026 apar semnele „(†)”, „†)” și „†”, în roșu, negru și albastru. Știi sigur:
- ce marchează **crucea albastră** (pare că marchează sfinții români)?
- diferența dintre **„†)”** și **„†”** și cum se potrivesc cu rangurile din tipic (priveghere, polieleu, doxologie)?
- unde găsim legenda oficială (calendarul tipărit, Tipicul BOR)?

Răspuns:

### Q16 🟡 Pe lângă semnul local, păstrăm și rangul tipiconal universal (praznic împărătesc, priveghere, polieleu, doxologie, șase stihiri, simplu)?
- ⭐ Da, dedus din semnele fiecărei tradiții. Permite comparații între Biserici.

Răspuns:

### Q17 🟢 Includem zilele civile, naționale și aniversările bisericești („Ziua Bibliei”, „Ziua națională a României”, „Zi liberă”)?
- ⭐ Da, ca „observances” separate de pomeniri, pe tradiție și țară.

Răspuns:

## C. Ce aflăm despre un sfânt

### Q18 🔴 Care sunt câmpurile minime pentru a publica un sfânt?
Propun: `id`, `kind`, `sex`, chipul sfințeniei, cel puțin o pomenire cu dată, numele în cel puțin o limbă și cel puțin o sursă. Restul e opțional.
- ⭐ De acord? Ce ai adăuga sau ai scoate?

Răspuns:

### Q19 🟡 Ce lungimi de text vrem? (poți alege mai multe)
- [ ] rezumat de 1–2 fraze ⭐
- [ ] sinaxar scurt (cam 150–300 de cuvinte) ⭐
- [ ] viața completă (lungă), opțională ⭐
- [ ] variantă pentru copii

Răspuns:

### Q20 🟡 Ce imne includem? (poți alege mai multe)
- [ ] tropar ⭐ · [ ] condac ⭐ · [ ] glasul și podobia ⭐
- [ ] icos · [ ] mărimuri (megalinarii) · [ ] sedelne · [ ] luminânde
- [ ] canonul complet · [ ] acatistul · [ ] paraclisul · [ ] rugăciuni

Textul integral doar unde avem drepturi; altfel începutul imnului și link.

Răspuns:

### Q21 🟡 Ce facem cu lecturile biblice?
- **A.** Doar referințe (carte, capitol, versete, pericopă) și link spre un text online.
- **B.** A, plus textul integral (ce traducere pe fiecare limbă? cu ce drepturi?).
- **C.** B, plus tâlcuire sau predică (ex. Sf. Teofan Zăvorâtul, Sf. Nicolae Velimirovici).
- ⭐ **A**, plus link spre o tâlcuire liberă, unde există.

Răspuns:

### Q22 🟡 Cât de detaliat e postul?
- **A.** Nivel simplu: post, dezlegare la pește, dezlegare la ulei și vin, harți, post negru.
- **B.** Reguli detaliate pe tipicul fiecărei tradiții, cu excepțiile.
- **C.** B, plus explicații „ce pot mânca azi”.
- ⭐ **A** în prima versiune, cu schema pregătită pentru **B**.

Răspuns:

### Q23 🟢 Ce informații de slujbă includem?
- **A.** Doar ce apare în calendarul oficial: tipul Liturghiei (Sf. Ioan, Sf. Vasile, a Darurilor), zi aliturgică, „nu se fac nunți”, slujbe speciale, glas, voscresnă.
- **B.** Rânduiala completă pentru cântăreți (efort foarte mare).
- ⭐ **A**.

Răspuns:

### Q24 🟡 Icoane și imagini
- **A.** Link spre Wikimedia Commons, plus descrierea iconografică (atribute, Erminie).
- **B.** Imagini stocate în repo (Git LFS).
- **C.** Galerie proprie, cu icoane primite cu permisiune.
- ⭐ **A**. Ai acces la icoane cu drepturi clare (fotografii proprii, ateliere de pictură)?

Răspuns:

### Q25 🟢 Ce păstrăm despre moaște și pelerinaj?
Locul (biserică sau mănăstire, oraș, coordonate) ⭐, ce parte din moaște ⭐, istoricul mutărilor ⭐, programul de vizitare (se schimbă des, deci ⭐ nu), hartă ⭐. Mai adaugi ceva?

Răspuns:

### Q26 🟢 Modelăm relațiile dintre sfinți (familie, ucenici, ierarhi hirotonitori, însoțitori) ca graf?
- ⭐ Da: permite pagini ca „familii de sfinți” sau „ucenicii lui X”.

Răspuns:

### Q27 🟡 Includem ocrotirile („ocrotitorul medicilor”, „pentru ce ne rugăm”)?
- **A.** Da, doar cu sursă bisericească.
- **B.** Da, inclusiv din tradiția populară, marcate ca atare.
- **C.** Nu.
- ⭐ **A**.

Răspuns:

### Q28 🟡 Includem tradițiile și obiceiurile populare (Sânzienele, Ignatul, Sf. Andrei …)?
- **A.** Da, într-o secțiune separată, marcată „tradiție populară”, cu o notă despre poziția Bisericii unde e cazul.
- **B.** Nu.
- ⭐ **A**.

Răspuns:

### Q29 🟡 Includem onomastica (zilele de nume)?
- **A.** Da, pe fiecare limbă: nume, variante, diminutive (ex. la 8 noiembrie: Mihail, Mihai, Mihaela, Gavril, Gabriel, Gabriela).
- **B.** Nu.
- ⭐ **A**. Întrebare suplimentară: pentru numele purtate de mai mulți sfinți (ex. Ioan, Lazăr) listăm toate zilele sau o zi „principală” pe fiecare limbă?

Răspuns:

### Q30 🟢 Includem minuni, cuvinte de folos și scrierile sfântului (cu numerele CPG sau BHG)?
- ⭐ Da, opțional, pe fiecare sfânt.

Răspuns:

### Q31 🔴 Persoanele biblice, îngerii și Maica Domnului sunt „persoane” în același model?
- ⭐ Da, cu `kind` diferit. Praznicele Domnului sunt „pomeniri” fără „persoană”.

Răspuns:

### Q32 🟡 Evenimentele (Sinoadele Ecumenice, cutremure, sfințiri de biserici, „pomenirea pulberii…”) sunt pomeniri de tip „eveniment”?
- ⭐ Da.

Răspuns:

### Q33 🟡 Icoanele făcătoare de minuni ale Maicii Domnului (Kazan, Iviron, Prodromița …) sunt entități separate?
- ⭐ Da.

Răspuns:

### Q34 🔴 Folosim EDTF pentru datele incerte (ex. „0966~”, „03XX”, „[1714,1716]”)?
- ⭐ Da, cu o explicație în text în fiecare limbă.

Răspuns:

### Q35 🟡 Păstrăm formele gramaticale ale numelui (genitiv, vocativ: „Sfinte Cuvioase Părinte Lazăr”)?
- ⭐ Da pentru română; pentru limbile slave și pentru greacă, când avem contribuitori.

Răspuns:

### Q36 🟢 Generăm pagini de dezambiguizare pentru sfinții cu același nume?
- ⭐ Da.

Răspuns:

## D. Limbi și traduceri

### Q37 🔴 Ce limbi intră în prima versiune publică? (poți alege mai multe)
- [ ] română ⭐ · [ ] engleză ⭐
- [ ] greacă · [ ] rusă · [ ] sârbă · [ ] bulgară · [ ] georgiană · [ ] ucraineană · [ ] arabă · altele: …

Răspuns:

### Q38 🔴 În ce limbă redactăm primele texte și ce afișăm când lipsește o traducere?
- **A.** Româna e limba principală de redactare, iar engleza e limba de rezervă.
- **B.** Engleza e limba principală (pivot internațional).
- **C.** Fiecare limbă independent, fără pivot.
- ⭐ **A**.

Răspuns:

### Q39 🟡 Acceptăm traduceri automate (AI)?
- **A.** Da, ca ciornă vizibilă, cu avertisment, până la revizuire.
- **B.** Da, dar nepublicate până la revizuire.
- **C.** Nu.
- ⭐ **B** pentru vieți și imne; **A** pentru etichete și nume (se verifică ușor).

Răspuns:

### Q40 🔴 Cum stocăm traducerile?
- **A.** Fișiere separate pe limbă (`data/i18n/ro/persons/<id>.json`).
- **B.** Toate limbile în același fișier (`{"ro": "…", "en": "…"}`).
- ⭐ **A**: traducătorii lucrează separat, diff-urile sunt curate, acoperirea se măsoară ușor.

Răspuns: **A**.

### Q41 🔴 Cum stocăm textele lungi (viața completă)?
- **A.** Fișiere Markdown separate (`<id>.md`, cu front-matter).
- **B.** Șiruri Markdown în JSON.
- **C.** HTML.
- ⭐ **A**.

Răspuns: **A**.

### Q42 🔴 Cheile JSON sunt în engleză (`names`, `commemorations`), iar valorile de afișat sunt traduse?
- ⭐ Da.

Răspuns:

### Q43 🟢 Alfabete și forme speciale
Sârbă: chirilică, cu latina generată automat ⭐. Greacă: monotonică pentru proză, politonică pentru imne ⭐. Slavona bisericească pentru imnele slave: acum sau mai târziu?

Răspuns:

### Q44 🟡 Care sunt sursele românești de încredere?
În care ai cea mai mare încredere (doxologia, crestinortodox, calendar.patriarhia.ro, basilica.ro, ziarullumina.ro, *Viețile Sfinților* de la Editura Episcopiei Romanului, Proloagele …)? Există surse pe care **nu** vrei să le folosim?

Răspuns:

### Q45 🟡 Ce vede un cititor român când nu avem text în română?
- **A.** Textul în engleză, cu o mențiune.
- **B.** Nimic.
- **C.** O traducere automată, marcată.
- ⭐ **A**.

Răspuns:

## E. Surse, licențe, drepturi

### Q46 🟡 Ce licență au datele structurate?
- **A.** CC0 (ca Wikidata; reutilizare maximă).
- **B.** CC BY 4.0.
- **C.** ODbL.
- ⭐ **A**.

Răspuns:

### Q47 🟡 Ce licență au textele?
- **A.** CC BY-SA 4.0 (compatibilă cu Wikipedia și OrthodoxWiki).
- **B.** CC BY 4.0.
- **C.** Toate drepturile rezervate.
- ⭐ **A**.

Răspuns:

### Q48 🟢 Ce licență are codul?
- ⭐ MIT (ca orthodox-calendar), sau Apache-2.0.

Răspuns:

### Q49 🟡 Pornim de la Wikidata (ID-uri, nume în zeci de limbi, date, locuri, imagini) și contribuim înapoi cu corecturi?
- ⭐ Da.

Răspuns:

### Q50 🟡 Ce facem cu site-urile cu drepturi rezervate (doxologia, crestinortodox, calendar.patriarhia.ro, OCA, GOARCH …)?
- **A.** Doar fapte, link și rezumat propriu.
- **B.** Cerem permisiunea de a prelua texte (cine îi contactează?).
- **C.** Preluăm texte cu atribuire (nu recomand: risc juridic, inclusiv dreptul asupra bazelor de date din UE).
- ⭐ **A**, plus **B** pentru 1–2 parteneri-cheie, dacă vrei.

Răspuns:

### Q51 🟡 Ce preluăm din orthodox-calendar?
Textele din `notes` provin de pe OCA, GOARCH și Wikipedia.
- ⭐ Folosim datele doar ca index (zi, nume, URL); nu preluăm textele.

Răspuns:

### Q52 🟡 Acceptăm importuri automate (scraping)?
- ⭐ Doar din surse cu licență deschisă sau cu API public, respectând `robots.txt` și termenii de utilizare.

Răspuns:

### Q53 🟢 Cunoști surse în domeniul public?
Ediții vechi digitizate (Mineie, Viețile Sfinților din secolul XIX, Proloage) sau biblioteci digitale la care ai acces (BCU Cluj, Biblioteca Digitală a Academiei, archive.org)?

Răspuns:

### Q54 🟡 Cine face revizuirea teologică și redacțională (preoți, teologi, voluntari)?
Avem nevoie de rolul „revizor” în date și de un proces de aprobare.

Răspuns:

## F. Tehnic

### Q55 🔴 În ce limbaj scriem uneltele (validare, import, generare)?
- **A.** TypeScript / Node (același ecosistem cu un site Astro).
- **B.** Python (ca backend-ul orthodox-calendar).
- **C.** Amândouă.
- ⭐ **A**.

Răspuns: **A** (TypeScript / Node).

### Q56 🟡 Ce generator de site folosim?
- **A.** Astro, cu Pagefind pentru căutare.
- **B.** Hugo.
- **C.** Docusaurus.
- **D.** MkDocs Material.
- **E.** Eleventy.
- ⭐ **A**. Hugo e alternativa bună dacă alegi Python la Q55.

Răspuns: **A** (Astro, cu Pagefind).

### Q57 🟡 La ce folosim wiki-ul GitHub?
- **A.** Documentație: schema, ghidul de contribuție, glosarul, rapoartele de acoperire.
- **B.** Oglindă a conținutului (o pagină pe sfânt).
- **C.** Amândouă.
- ⭐ **A**: conținutul public stă mai bine pe site, fiindcă wiki-urile GitHub sunt slab indexate de motoarele de căutare.

Răspuns:

### Q58 🟢 Un singur repo (date, schemă, unelte, site) sau repo de date separat de site?
- ⭐ Un singur repo la început.

Răspuns:

### Q59 🔴 Ce format au ID-urile?
- **A.** Slug lizibil în engleză (`lazarus-of-galesion`).
- **B.** Numeric (`S000123`).
- **C.** UUID.
- **D.** Wikidata QID ca ID principal.
- ⭐ **A**, plus QID ca identificator extern.

Răspuns:

### Q60 🔴 Un fișier pe entitate (mii de fișiere, diff-uri curate) sau fișiere mari, pe lună ori pe zi?
- ⭐ Un fișier pe entitate.

Răspuns:

### Q61 🟡 Ce ieșiri generăm? (poți alege mai multe)
- [ ] API JSON static ⭐ · [ ] ICS ⭐ · [ ] RSS ⭐ · [ ] JSON-LD / schema.org ⭐ · [ ] widget pentru site-uri ⭐
- [ ] SQLite / Datasette · [ ] pachet npm sau PyPI · [ ] export orthodox-calendar ⭐ · [ ] calendar de perete în PDF

Răspuns:

### Q62 🟢 Vrei domeniu propriu pentru GitHub Pages? Și statistici de vizitare (cu respectarea GDPR, ex. fără cookie-uri)?

Răspuns:

### Q63 🟢 Vrem o interfață de editare pentru ne-programatori (CMS pe GitHub Pages sau un formular care deschide un PR)?
- ⭐ Da, în faza 5.

Răspuns:

### Q64 🟢 Cum versionăm?
- ⭐ Semver pentru schemă și release-uri periodice ale datelor (ex. lunar), cu changelog.

Răspuns:

## G. Ce ar fi frumos să aibă un credincios

### Q65 🟡 Bifează ce vrei (⭐ = propunerea mea pentru primele versiuni)
- [ ] „Azi”: sfinții zilei, post, lecturi, glas ⭐
- [ ] Onomastică: „cine își serbează numele azi” și căutare după nume ⭐
- [ ] Sfinții care îmi poartă numele; ajutor la alegerea numelui de botez ⭐
- [ ] Calendar de post și „ce pot mânca azi”
- [ ] Abonare ICS în Google, Apple sau Outlook (cu post și sărbători) ⭐
- [ ] Harta moaștelor și a locurilor de pelerinaj („lângă mine”) ⭐
- [ ] Cronologie pe secole și graful relațiilor (familii de sfinți, ucenici)
- [ ] Pascalie: data Paștilor (ortodox și catolic) pe orice an ⭐
- [ ] Troparul și condacul zilei, cu audio
- [ ] Calendar tipăribil (A4 sau de perete, ca cel bisericesc)
- [ ] Widget „Sfântul zilei” pentru site-urile parohiilor ⭐
- [ ] Newsletter sau notificări (email, Telegram)
- [ ] Statistici (câți sfinți pe țară, secol, tip)
- [ ] Versiune pentru copii
- [ ] Aplicație mobilă sau PWA care merge offline
- [ ] Rugăciunile și acatistul zilei (depinde de drepturi)
- [ ] Hramuri: ce biserici își serbează azi hramul (set de date mare)
- [ ] Aducere-aminte pentru Moși și pomenirea morților
- [ ] Slava (Serbia): sfântul ocrotitor al familiei, cu aducere-aminte

Răspuns:

### Q66 🟢 Ce îți lipsește azi pe site-urile românești pe care le folosești? Ce cauți și nu găsești?

Răspuns:

### Q67 🟢 Mai vrei ceva în proiect?

Răspuns:

## H. Întrebări noi, după decizia Q1

### Q68 🔴 Cum prezentăm persoanele cinstite ca sfinți într-o familie de Biserici, dar nu și în alta?
Exemple: Sf. Dioscor al Alexandriei e cinstit de Bisericile Orientale, nu și de cele răsăritene; Biserica Asiriană cinstește persoane pe care Sinoadele Ecumenice le-au condamnat.
- **A.** Entități comune, cu cinstirea înregistrată pe tradiție. Site-ul arată implicit doar tradiția aleasă de cititor, iar pagina persoanei spune „cinstit ca sfânt în: …”.
- **B.** Entități comune, dar fiecare familie de Biserici are o secțiune separată a site-ului.
- **C.** Seturi de date complet separate pe familii, fără legături între ele.
- ⭐ **A**. Condamnările istorice (ex. de către un Sinod) apar doar ca fapte, cu sursă, în textul localizat.

Răspuns:

### Q69 🟡 Ce tradiție vede implicit un cititor în limba română?
- **A.** BOR.
- **B.** Toate Bisericile Ortodoxe răsăritene.
- **C.** Toate familiile de Biserici.
- ⭐ **A**, cu un selector de tradiție bine vizibil.

Răspuns:

### Q70 🟢 Când intră în site limbile Bisericilor Orientale și ale celei Asiriene?
Arabă, coptă, ge'ez, amharică, tigrină, armeană, siriacă, malayalam, neo-aramaică; unele se scriu de la dreapta la stânga (arabă, siriacă).
- ⭐ Schema le suportă din v0.1; site-ul le adaugă după prima versiune, odată cu datele acestor tradiții.

Răspuns:

### Q71 🟢 Includem și Biserica Veche a Răsăritului (desprinsă din Biserica Asiriană în 1968, pe stil vechi)?
- ⭐ Da, ca tradiție separată, după prima versiune.

Răspuns:
