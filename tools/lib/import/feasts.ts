/**
 * Feasts with a fixed date that every Byzantine calendar shares, with the way
 * the Romanian and English sources name them. Their forefeasts, afterfeasts
 * and leave-takings are recognised through the same patterns.
 */

export type FeastKind = "feast_of_the_lord" | "feast_of_theotokos" | "feast_of_cross" | "event" | "synaxis";

export interface Feast {
  id: string;
  kind: FeastKind;
  month: number;
  day: number;
  /** Matches the feast's name, also inside "Înainte-prăznuirea …" (genitive forms included). */
  ro: RegExp;
  en: RegExp;
  /** Subjects of the feast (person ids), when it is about saints. */
  subjects?: string[];
  rank?: "great_feast";
}

export const FEASTS: Feast[] = [
  { id: "circumcision-of-the-lord", kind: "feast_of_the_lord", month: 1, day: 1, ro: /t[ăa]ierea[- ]împrejur/i, en: /circumcision/i },
  { id: "theophany", kind: "feast_of_the_lord", month: 1, day: 6, ro: /botez(ul|ului) domnului|bobotez/i, en: /theophany|baptism of (our )?lord/i, rank: "great_feast" },
  { id: "meeting-of-the-lord", kind: "feast_of_the_lord", month: 2, day: 2, ro: /întâmpin[ăa]r(ea|ii) domnului/i, en: /meeting of (our )?lord|presentation of (our )?lord|meeting of the lord/i, rank: "great_feast" },
  { id: "annunciation", kind: "feast_of_theotokos", month: 3, day: 25, ro: /bun(a|ei) vestir/i, en: /annunciation/i, rank: "great_feast" },
  { id: "transfiguration", kind: "feast_of_the_lord", month: 8, day: 6, ro: /schimb[ăa]r(ea|ii) la fa[țţ][ăa]/i, en: /transfiguration/i, rank: "great_feast" },
  { id: "dormition-of-the-theotokos", kind: "feast_of_theotokos", month: 8, day: 15, ro: /adormir(ea|ii) maicii domnului/i, en: /dormition of (our )?(most holy|the most holy|the)? ?(lady )?(theotokos|mother of god)/i, rank: "great_feast" },
  { id: "nativity-of-the-theotokos", kind: "feast_of_theotokos", month: 9, day: 8, ro: /na[șş]ter(ea|ii) maicii domnului/i, en: /nativity of (our )?(most holy|the most holy|the)? ?(lady )?(theotokos|mother of god)/i, rank: "great_feast" },
  { id: "exaltation-of-the-cross", kind: "feast_of_cross", month: 9, day: 14, ro: /înăl[țţ]ar(ea|ii) sfintei cruci/i, en: /(exaltation|elevation|universal exaltation) of the (precious and life-creating |venerable and life-giving |precious |holy )?cross/i, rank: "great_feast" },
  { id: "entry-of-the-theotokos", kind: "feast_of_theotokos", month: 11, day: 21, ro: /intr[ăa]r(ea|ii) [îi]n biseric[ăa] a maicii domnului|intr[ăa]r(ea|ii) maicii domnului [îi]n biseric/i, en: /entry (of the|into the temple of the) (most holy )?theotokos|entry of (our )?(most holy )?lady|entrance of the theotokos|entry into the temple/i, rank: "great_feast" },
  { id: "nativity-of-christ", kind: "feast_of_the_lord", month: 12, day: 25, ro: /na[șş]ter(ea|ii) domnului/i, en: /nativity of (our lord|christ)|nativity of the lord/i, rank: "great_feast" },
  { id: "protection-of-the-theotokos", kind: "feast_of_theotokos", month: 10, day: 1, ro: /acoper[ăa]m[âa]ntul(ui)? maicii domnului/i, en: /protection of (our )?(most holy )?(lady|theotokos)|protecting veil/i },
  { id: "conception-of-the-theotokos", kind: "feast_of_theotokos", month: 12, day: 9, ro: /z[ăa]mislir(ea|ii) (sfintei ana|sfintei fecioare maria|maicii domnului)|sfintei ana$/i, en: /conception (by (righteous|saint|st\.?) anna )?of the (most holy )?theotokos|conception by (righteous|saint|st\.?) anna/i },
  { id: "procession-of-the-cross", kind: "feast_of_cross", month: 8, day: 1, ro: /scoater(ea|ii) sfintei cruci/i, en: /procession of the (venerable |honorable |precious )?wood|precious wood of the (life-creating )?cross/i },
  { id: "finding-of-the-cross", kind: "feast_of_cross", month: 3, day: 6, ro: /aflarea sfintei cruci/i, en: /finding of the (precious )?cross/i },
  { id: "sign-of-the-cross-over-jerusalem", kind: "feast_of_cross", month: 5, day: 7, ro: /ar[ăa]tarea (pe cer a )?semnului sfintei cruci/i, en: /(appearance|apparition) of the sign of the (precious )?cross|sign of the (precious )?cross over jerusalem/i },
  { id: "robe-of-the-theotokos", kind: "feast_of_theotokos", month: 7, day: 2, ro: /a[șş]ezarea ve[șş]m[âa]ntului/i, en: /placing of the (honorable )?robe/i },
  { id: "belt-of-the-theotokos", kind: "feast_of_theotokos", month: 8, day: 31, ro: /a[șş]ezarea [îi]n racl[ăa] a br[âa]ului|a[șş]ezarea cinstitului br[âa]u/i, en: /placing of the (honorable )?(belt|sash|cincture)/i },
  { id: "image-of-edessa", kind: "feast_of_the_lord", month: 8, day: 16, ro: /aducerea (sfintei |sf. )?mahram|mahramei|sfintei mahrame/i, en: /image\W*not\W*made\W*by\W*hands|icon not-made-by-hands|holy mandylion|image of our lord jesus christ not made/i },
  { id: "synaxis-of-the-theotokos", kind: "feast_of_theotokos", month: 12, day: 26, ro: /soborul (preasfintei n[ăa]sc[ăa]toare de dumnezeu|maicii domnului)$/i, en: /synaxis of the (most holy )?theotokos/i },
  { id: "church-new-year", kind: "event", month: 9, day: 1, ro: /începutul anului bisericesc|începutul indictului/i, en: /beginning of the (church|indiction)|church new year|indiction/i },
  { id: "dedication-of-the-church-of-the-resurrection", kind: "event", month: 9, day: 13, ro: /t[âa]rnosirea bisericii [îi]nvierii/i, en: /(founding|dedication|consecration) of the church of the (holy )?resurrection/i },
  { id: "chains-of-apostle-peter", kind: "event", month: 1, day: 16, ro: /(cinstirea )?lan[țţ]ului sf(\.|[âa]ntului)? ap/i, en: /chains of the (holy and )?(glorious )?(and all-praised )?apostle peter|veneration of the precious chains/i, subjects: ["peter-the-apostle"] },
  { id: "synaxis-of-john-the-baptist", kind: "synaxis", month: 1, day: 7, ro: /soborul sf(\.|[âa]ntului)? (proroc |prooroc )?ioan botez/i, en: /synaxis of the (holy,? glorious )?(prophet,? )?forerunner|synaxis of (saint|st\.?) john the baptist/i, subjects: ["john-the-baptist"] },
  { id: "nativity-of-john-the-baptist", kind: "event", month: 6, day: 24, ro: /na[șş]terea sf(\.|[âa]ntului)? (proroc |prooroc )?ioan botez/i, en: /nativity of the (holy,? glorious )?(prophet,? )?(forerunner|baptist)/i, subjects: ["john-the-baptist"] },
  { id: "beheading-of-john-the-baptist", kind: "event", month: 8, day: 29, ro: /t[ăa]ierea capului sf/i, en: /beheading of the (holy,? glorious )?(prophet,? )?(forerunner|baptist)/i, subjects: ["john-the-baptist"] },
  { id: "conception-of-john-the-baptist", kind: "event", month: 9, day: 23, ro: /z[ăa]mislirea sf(\.|[âa]ntului)? (proroc |prooroc )?ioan/i, en: /conception of the (honorable,? glorious )?(prophet,? )?(forerunner|baptist)/i, subjects: ["john-the-baptist"] },
];

/** Movable days and other calendar notes: they are not fixed commemorations. */
export const RO_MOVABLE = [
  /^duminica\b/i,
  /^s[âa]mb[ăa]ta\b/i,
  /^(lunea|mar[țţ]ea|miercurea|joia|vinerea)\b/i,
  /^săptămâna\b/i,
  /^izvorul t[ăa]m[ăa]duirii/i,
  /^[îi]n[ăa]l[țţ]area domnului/i,
  /^pogor[âa]rea (sf[âa]ntului|sf\.) duh/i,
  /^intrarea domnului [îi]n ierusalim/i,
  /^[îi]nvierea domnului/i,
  /^sfintele pa[șş]ti/i,
  /^(odovania |[îi]nainte-pr[ăa]znuirea |odovania [îi]nju)?.*(cincizecimii|[îi]n[ăa]l[țţ][ăa]rii domnului|[îi]nvierii domnului|pogor[âa]rii)/i,
  /^[îi]nju[mn]{1,2}[ăa]t[ăa][țţ]irea/i,
  /^(ajunul|post|har[țţ]i|zi aliturgic|tedeum|anul nou|dezlegare|canonul mare|denia|deniile|pomenirea celor adormi|mo[șş]ii)\b/i,
  /^[îi]nceputul (triodului|penticostarului|postului)/i,
  /^sf[âa]nta [șş]i marea\b/i,
  /^l[ăa]satul sec/i,
  /^soborul sfin[țţ]?(ilor|telor) (rom[âa]ni|femei rom|athoni[țţ]i)/i,
  /^ap\. /i,
  /^ev\. /i,
  /^apostolul /i,
  /^glas \d/i,
  /^(al|a) (ierarhului|arhanghelilor|sf|cuviosului|mucenicului|apostol|praznicului|sfin)/i,
];

export const EN_MOVABLE = [
  /\bsunday\b/i,
  /\bsaturday\b/i,
  /\b(monday|tuesday|wednesday|thursday|friday) (of|after|before|in)\b/i,
  /\bweek\b/i,
  /\bpascha\b|\bresurrection of (our|the) lord\b/i,
  /\bpentecost\b|\bmid-pentecost\b|\bdescent of the holy spirit\b/i,
  /\bascension of (our )?lord\b/i,
  /\bentry of (our )?lord into jerusalem\b|\bpalm sunday\b/i,
  /\blazarus saturday\b/i,
  /\blife-giving spring\b|\bzoodochos\b/i,
  /\bholy (and great )?(monday|tuesday|wednesday|thursday|friday|saturday)\b/i,
  /\bmeatfare\b|\bcheesefare\b|\bpublican\b|\bprodigal\b|\blast judgment\b|\bforgiveness sunday\b/i,
  /\bradonitsa\b|\bmemorial saturday\b|\bsoul saturday\b|\bdeparted\b/i,
];
