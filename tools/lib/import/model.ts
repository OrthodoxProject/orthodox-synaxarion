/** Shared types of the importers: what a parsed title says, before records are built. */

export type Gender = "male" | "female";

export type HolinessType =
  | "apostle"
  | "equal_to_apostles"
  | "evangelist"
  | "prophet"
  | "forefather"
  | "righteous"
  | "martyr"
  | "great_martyr"
  | "hieromartyr"
  | "venerable"
  | "venerable_martyr"
  | "confessor"
  | "hierarch"
  | "unmercenary"
  | "fool_for_christ"
  | "passion_bearer"
  | "new_martyr"
  | "stylite"
  | "hermit"
  | "recluse"
  | "wonderworker"
  | "myrrhbearer"
  | "right_believing"
  | "virgin"
  | "archangel";

/**
 * What a source line is about:
 * - saint: one person; saints: several persons named together; group: a group
 *   known as such ("the 40 Martyrs of Sebaste");
 * - feast: a feast of the Lord, of the Theotokos or of the Cross, or another
 *   fixed event of the FEASTS table; forefeast, afterfeast, leavetaking;
 * - relics_translation, relics_finding, synaxis, event, glorification: about a
 *   saint (subject);
 * - icon: a feast of an icon (of the Theotokos, mostly);
 * - council: the Fathers of a council;
 * - movable: part of the movable cycle (skipped); skip: not a commemoration.
 */
export type TitleKind =
  | "saint"
  | "saints"
  | "group"
  | "feast"
  | "forefeast"
  | "afterfeast"
  | "leavetaking"
  | "relics_translation"
  | "relics_finding"
  | "synaxis"
  | "event"
  | "glorification"
  | "icon"
  | "council"
  | "angels"
  | "movable"
  | "skip";

export interface NamePart {
  /** The name as written, without honorifics: "Lazăr din Muntele Galision". */
  text: string;
  /** First name: "Lazăr". */
  given: string;
  /** Skeleton of the first name (see names.ts). */
  key: string;
  /** Canonical spelling of an irregular first name (Ioan / John → "ioan"). */
  eq?: string;
  /** Skeletons of the other significant words (epithets, places). */
  extra: string[];
  gender?: Gender;
  /** The gender was only guessed from the ending of the name. */
  genderGuess?: boolean;
}

export interface ParsedTitle {
  kind: TitleKind;
  holiness: HolinessType[];
  gender?: Gender;
  plural: boolean;
  /** Honorifics as written ("Sfântul Cuvios", "Venerable"). */
  honorific: string;
  /** Everything after the honorifics. */
  rest: string;
  names: NamePart[];
  /** Size of a group, when the title gives it. */
  count?: number;
  /** Id of a feast of the FEASTS table (for feast, forefeast, afterfeast, leavetaking). */
  feast?: string;
  /** The saint a relics, synaxis, event or glorification line is about. */
  subject?: ParsedTitle;
  /**
   * The saints an event is about, each on his own (the first is `subject`): "The Consecration of the Churches of
   * Prince Theodore, the Son of John El-Shotbe, and Prince Theodore El-Mishreke" is about two saints, not a group.
   */
  subjects?: ParsedTitle[];
  /** Name of the icon (for kind icon), as written. */
  icon?: string;
  /** Ordinal of an ecumenical council (for kind council). */
  council?: number;
  /**
   * Other commemorations named by the same line: "The Martyrdom of St. Timothy
   * and the Relocation of the Body of St. Theodore" is also a translation of relics.
   */
  also?: ParsedTitle[];
  /** For a part of `also`: its subject is the saint of the line ("and the Relocation of His Holy Relics"). */
  ofLine?: boolean;
  title: string;
}
