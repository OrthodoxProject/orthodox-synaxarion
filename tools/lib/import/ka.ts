/**
 * Georgian calendar titles (the church calendar of the Patriarchate of Georgia): "მოწამისა დიმიტრისა (დაახლ. 307);",
 * "ღირსისა სერაფიმე საროველისა, სასწაულთმოქმედისა (1833)*", "მოწამეთა: გურისა, სამონისა (299-306) და აბიბოსი".
 * A title is the genitive of what is kept that day ("of the martyr Demetrius"): rank words, then names, each followed by
 * its epithets, places and offices, then, after commas, what describes it ("bishop of Parium", "mother of St Basil").
 *
 * The importer's matcher reads English titles, so each part of a Georgian title is written as one: the ranks, offices
 * and epithets through tables, the places it knows by their English names, the names in Latin letters (the usual ones
 * by their English names: იოანე is John). Unknown places and epithets are left out of the English title, where they
 * would only make two spellings of one place look like two places. The Georgian title gives, besides, the names in the
 * nominative, for the records the import makes of saints it does not find.
 */
import type { NativeName, NativePart } from "./church.ts";
import { FEASTS } from "./feasts.ts";
import { parseEn } from "./en.ts";
import type { Gender, HolinessType, ParsedTitle } from "./model.ts";
import { romanize } from "./translit.ts";

/** A word of a rank, an office or an epithet, with its English form and its nominative. */
interface Word {
  en: string;
  holiness?: HolinessType[];
  gender?: Gender;
  /** Nominative singular, for the names of new records. */
  nom: string;
  /** The word is a plural (genitive in -თა). */
  plural?: boolean;
}

/** Ranks that open a title (or a name): "ღირსისა", "მოწამეთა", "წმ.". */
const RANKS: Array<[string[], Omit<Word, "plural">]> = [
  [["წმიდა", "წმინდა", "წმიდისა", "წმინდისა", "წმ."], { en: "Saint", nom: "წმიდა" }],
  [["წმიდათა", "წმინდათა"], { en: "Saints", nom: "წმიდა" }],
  [["ღირსი", "ღირსისა", "ღირ."], { en: "Venerable", holiness: ["venerable"], nom: "ღირსი" }],
  [["ღირსთა"], { en: "Venerable", holiness: ["venerable"], nom: "ღირსი" }],
  [["ღირსმოწამე", "ღირსმოწამისა", "ღირსმოწ.", "ღირსმოწამეთა"], { en: "Venerable Martyr", holiness: ["venerable_martyr"], nom: "ღირსმოწამე" }],
  [["მოწამე", "მოწამისა", "მოწ.", "მოწამეთა"], { en: "Martyr", holiness: ["martyr"], nom: "მოწამე" }],
  [["დიდმოწამე", "დიდმოწამისა", "დიდმოწ.", "დიდმოწამეთა"], { en: "Great Martyr", holiness: ["great_martyr"], nom: "დიდმოწამე" }],
  [["მღვდელმოწამე", "მღვდელმოწამისა", "მღვდელმოწ.", "მღვდელმოწამეთა", "მღდელმოწამე", "მღდელმოწამისა", "მღვლდემოწამისა", "მღვდელმოწამისას"], { en: "Hieromartyr", holiness: ["hieromartyr"], nom: "მღვდელმოწამე" }],
  [["ქალწულმოწამე", "ქალწულმოწამისა", "ქალწულმოწამეთა"], { en: "Virgin Martyr", holiness: ["martyr", "virgin"], gender: "female", nom: "ქალწულმოწამე" }],
  [["ახალმოწამე", "ახალმოწამისა", "ახალმოწამეთა"], { en: "New Martyr", holiness: ["new_martyr", "martyr"], nom: "ახალმოწამე" }],
  [["პირველმოწამე", "პირველმოწამისა"], { en: "Protomartyr", holiness: ["martyr"], nom: "პირველმოწამე" }],
  [["მართალი", "მართლისა", "მართალთა"], { en: "Righteous", holiness: ["righteous"], nom: "მართალი" }],
  [["წინასწარმეტყველი", "წინასწარმეტყველისა", "წინასწ.", "წინასწარმეტყველთა"], { en: "Prophet", holiness: ["prophet"], nom: "წინასწარმეტყველი" }],
  [["მოციქული", "მოციქულისა", "მოც.", "მოციქულთა"], { en: "Apostle", holiness: ["apostle"], nom: "მოციქული" }],
  [["მოციქულთასწორი", "მოციქულთასწორისა", "მოციქულთასწორთა"], { en: "Equal of the Apostles", holiness: ["equal_to_apostles"], nom: "მოციქულთასწორი" }],
  [["მახარებელი", "მახარებლისა", "მახარებელისა", "მახარებელთა"], { en: "Evangelist", holiness: ["evangelist"], nom: "მახარებელი" }],
  [["აღმსარებელი", "აღმსარებლისა", "აღმსარებელისა", "აღმსარებელთა"], { en: "Confessor", holiness: ["confessor"], nom: "აღმსარებელი" }],
  [["მღვდელმთავარი", "მღვდელმთავრისა", "მღვდელმთავართა", "მღვდელთმთავარი", "მღვდელთმთავრისა", "მღვდელთმთავართა"], { en: "Hierarch", holiness: ["hierarch"], nom: "მღვდელმთავარი" }],
  [["ნეტარი", "ნეტარისა", "ნეტართა"], { en: "Blessed", nom: "ნეტარი" }],
  [["კეთილმორწმუნე", "კეთილმმორწმუნე", "კეთილმორწმუნისა", "კეთილმორწმუნეთა", "კეთილმსახური", "კეთილმსახურისა", "კეთილმსახურთა"], { en: "Right-believing", holiness: ["right_believing"], nom: "კეთილმორწმუნე" }],
  [["ქალწული", "ქალწულისა", "ქალწულთა"], { en: "Virgin", holiness: ["virgin"], gender: "female", nom: "ქალწული" }],
  [["სალოსი", "სალოსისა"], { en: "Fool-for-Christ", holiness: ["fool_for_christ"], nom: "სალოსი" }],
  [["უსასყიდლო", "უსასყიდლოთა", "უვერცხლო", "უვერცხლოთა"], { en: "Unmercenary", holiness: ["unmercenary"], nom: "უსასყიდლო" }],
];

/** Words of praise that only open a title: "წმიდისა დიდებულისა, დიდისა მოწამისა …". */
const PRAISE = new Set(["აბბა", "ავვა", "აბბას", "დიდებული", "დიდებულისა", "დიდებულთა", "ყოვლადქებული", "ყოვლადქებულისა", "ყოვლადქებულთა", "პატიოსანი", "პატიოსნისა", "პატიოსანთა", "დედისა", "ჩვენისა", "მამისა", "მამათა", "ყოველთა"]);

/** Offices and epithets after a name: "ეპისკოპოსისა", "სასწაულთმოქმედისა", "დიდისა". */
const AFTER: Array<[string[], Omit<Word, "plural">]> = [
  [["ეპისკოპოსი", "ეპისკოპოსისა", "ეპისკოპოსთა", "ეპ."], { en: "Bishop", holiness: ["hierarch"], nom: "ეპისკოპოსი" }],
  [["მთავარეპისკოპოსი", "მთავარეპისკოპოსისა", "მთავარეპ."], { en: "Archbishop", holiness: ["hierarch"], nom: "მთავარეპისკოპოსი" }],
  [["მიტროპოლიტი", "მიტროპოლიტისა"], { en: "Metropolitan", holiness: ["hierarch"], nom: "მიტროპოლიტი" }],
  [["პატრიარქი", "პატრიარქისა"], { en: "Patriarch", holiness: ["hierarch"], nom: "პატრიარქი" }],
  [["კათალიკოსი", "კათალიკოსისა", "კათალიკოს-პატრიარქი", "კათალიკოს-პატრიარქისა", "კათოლიკოსი", "კათოლიკოსისა", "კათოლიკოს-პატრიარქი", "კათოლიკოს-პატრიარქისა"], { en: "Catholicos", holiness: ["hierarch"], nom: "კათალიკოსი" }],
  [["პაპი", "პაპისა"], { en: "Pope", holiness: ["hierarch"], nom: "პაპი" }],
  [["ხუცესი", "ხუცისა", "ხუცესისა", "ხუცესთა", "მღვდელი", "მღვდლისა"], { en: "Presbyter", nom: "ხუცესი" }],
  [["დიაკონი", "დიაკვნისა", "დიაკონისა", "დიაკონთა"], { en: "Deacon", nom: "დიაკონი" }],
  [["მთავარდიაკონი", "მთავარდიაკონისა", "მთავარდიაკვნისა"], { en: "Archdeacon", nom: "მთავარდიაკონი" }],
  [["წიგნისმკითხველი", "წიგნისმკითხველისა"], { en: "Reader", nom: "წიგნისმკითხველი" }],
  [["მონაზონი", "მონაზონისა", "მონოზონი", "მონოზონისა", "ბერი", "ბერისა"], { en: "Monk", nom: "მონაზონი" }],
  [["მღვდელმონაზონი", "მღვდელმონაზონისა", "ხუცესმონაზონი", "ხუცესმონაზონისა", "ხუცესმონოზონისა"], { en: "Hieromonk", nom: "მღვდელმონაზონი" }],
  [["წინამძღვარი", "წინამძღვრისა"], { en: "Abbot", nom: "წინამძღვარი" }],
  [["არქიეპისკოპოსი", "არქიეპისკოპოსისა"], { en: "Archbishop", holiness: ["hierarch"], nom: "არქიეპისკოპოსი" }],
  [["ერისთავი", "ერისთავისა"], { en: "Duke", nom: "ერისთავი" }],
  [["მეფეყოფილი", "მეფეყოფილისა"], { en: "former King", nom: "მეფეყოფილი" }],
  [["განდეგილი", "განდეგილისა"], { en: "Hermit", holiness: ["hermit"], nom: "განდეგილი" }],
  [["მთაწმიდელი", "მთაწმიდელისა"], { en: "of Mount Athos", nom: "მთაწმიდელი" }],
  [["იღუმენი", "იღუმენისა"], { en: "Abbot", nom: "იღუმენი" }],
  [["არქიმანდრიტი", "არქიმანდრიტისა"], { en: "Archimandrite", nom: "არქიმანდრიტი" }],
  [["მეფე", "მეფისა", "მეფი"], { en: "King", holiness: ["right_believing"], nom: "მეფე" }],
  [["დედოფალი", "დედოფლისა"], { en: "Queen", holiness: ["right_believing"], gender: "female", nom: "დედოფალი" }],
  [["მთავარი", "მთავრისა", "მთავართა"], { en: "Prince", nom: "მთავარი" }],
  [["მხედარი", "მხედრისა", "მხედართა"], { en: "Soldier", nom: "მხედარი" }],
  [["ასისთავი", "ასისთავისა"], { en: "Centurion", nom: "ასისთავი" }],
  [["მკურნალი", "მკურნალისა"], { en: "Healer", holiness: ["unmercenary"], nom: "მკურნალი" }],
  [["ხატმწერი", "ხატმწერისა"], { en: "Iconographer", nom: "ხატმწერი" }],
  [["ჰიმნოგრაფი", "ჰიმნოგრაფისა"], { en: "Hymnographer", nom: "ჰიმნოგრაფი" }],
  [["ჰაგიოგრაფი", "ჰაგიოგრაფისა"], { en: "Hagiographer", nom: "ჰაგიოგრაფი" }],
  [["მესვეტე", "მესვეტისა"], { en: "Stylite", holiness: ["stylite"], nom: "მესვეტე" }],
  [["მეუდაბნოე", "მეუდაბნოისა", "მეუდაბნოეთა"], { en: "Hermit", holiness: ["hermit"], nom: "მეუდაბნოე" }],
  [["დაყუდებული", "დაყუდებულისა"], { en: "Recluse", holiness: ["recluse"], nom: "დაყუდებული" }],
  [["მდუმარე", "მდუმარისა"], { en: "the Silent", nom: "მდუმარე" }],
  [["სასწაულთმოქმედი", "სასწაულთმოქმედისა", "საკვირველთმოქმედი", "საკვირველთმოქმედისა", "სასწაულთმოქმედთა"], { en: "Wonderworker", holiness: ["wonderworker"], nom: "სასწაულთმოქმედი" }],
  [["მირონმდინარი", "მირონმდინარისა"], { en: "Myrrh-streaming", nom: "მირონმდინარი" }],
  [["ძლევაშემოსილი", "ძლევაშემოსილისა"], { en: "Trophy-bearer", nom: "ძლევაშემოსილი" }],
  [["ღმრთისმეტყველი", "ღმრთისმეტყველისა"], { en: "the Theologian", nom: "ღმრთისმეტყველი" }],
  [["ოქროპირი", "ოქროპირისა", "ოქროპირის"], { en: "Chrysostom", nom: "ოქროპირი" }],
  [["ღმერთშემოსილი", "ღმერთშემოსილისა"], { en: "the God-bearer", nom: "ღმერთშემოსილი" }],
  [["ღმრთისკაცი", "ღმრთისკაცისა"], { en: "Man of God", nom: "ღმრთისკაცი" }],
  [["დიდი", "დიდისა", "დიდის"], { en: "the Great", nom: "დიდი" }],
  [["ახალი", "ახლისა", "ახლის"], { en: "the New", nom: "ახალი" }],
  [["განმანათლებელი", "განმანათლებელისა", "განმანათლებლისა"], { en: "Enlightener", nom: "განმანათლებელი" }],
  [["გამაერთიანებელი", "გამაერთიანებელისა", "გამაერთიანებლისა"], { en: "the Unifier", nom: "გამაერთიანებელი" }],
  [["მნათობი", "მნათობისა"], { en: "the Luminary", nom: "მნათობი" }],
  [["მწიგნობართუხუცესი", "მწიგნობართუხუცესისა"], { en: "Chancellor", nom: "მწიგნობართუხუცესი" }],
  [["მოძღვარი", "მოძღვრისა"], { en: "Teacher", nom: "მოძღვარი" }],
  [["უცხოთშემწყნარებელი", "უცხოთშემწყნარებელისა"], { en: "the Hospitable", nom: "უცხოთშემწყნარებელი" }],
  [["წინამორბედი", "წინამორბედისა"], { en: "Forerunner", holiness: ["prophet"], nom: "წინამორბედი" }],
  [["ნათლისმცემელი", "ნათლისმცემელისა", "ნათლისმცემლისა", "ნათლისმცემელის", "ნათლისმცემლის"], { en: "Baptist", holiness: ["prophet"], nom: "ნათლისმცემელი" }],
  ...RANKS.filter(([forms]) => ["აღმსარებელი", "მახარებელი", "მოწამე", "ქალწული", "სალოსი", "მღვდელმოწამე", "მოციქული"].includes(forms[0] ?? "")),
];

/** Words that end what describes another person, the saint's relative or master: "წმიდა ბასილი დიდის დედისა". */
const RELATIONS: Record<string, { en: string; gender?: Gender }> = {
  დედისა: { en: "mother", gender: "female" },
  მამისა: { en: "father", gender: "male" },
  ძმისა: { en: "brother", gender: "male" },
  დისა: { en: "sister", gender: "female" },
  ძისა: { en: "son", gender: "male" },
  ასულისა: { en: "daughter", gender: "female" },
  მეუღლისა: { en: "wife" },
  მოწაფისა: { en: "disciple" },
  მსახურისა: { en: "servant" },
  ნათესავისა: { en: "relative" },
  დიდედისა: { en: "grandmother", gender: "female" },
  შვილისა: { en: "child" },
};

/** Places by the stem of their Georgian adjective or genitive ("ანკვირელისა", "რომის"), with their English names. */
const PLACES: Array<[RegExp, string]> = [
  [/^ალექსანდრი/, "Alexandria"],
  [/^ანტიოქი/, "Antioch"],
  [/^იერუსალიმ/, "Jerusalem"],
  [/^კონსტანტინ[ეო]პოლ/, "Constantinople"],
  [/^რომ(?:აელ|ის|ში|ი$)/, "Rome"],
  [/^მ?ეგვიპტ/, "Egypt"],
  [/^სპარს/, "Persia"],
  [/^ასურ/, "Syria"],
  [/^კაბადოკი/, "Cappadocia"],
  [/^კესარი/, "Caesarea"],
  [/^თესალონიკ/, "Thessalonica"],
  [/^ათონ/, "Mount Athos"],
  [/^სამთავრ/, "Samtavro"],
  [/^რუსეთ/, "Russia"],
  [/^კრწანის/, "Krtsanisi"],
  [/^მარაბდ/, "Marabda"],
  [/^დიდგორ/, "Didgori"],
  [/^ტაო-კლარჯეთ|^კლარჯეთ/, "Tao-Klarjeti"],
  [/^ეფეს/, "Ephesus"],
  [/^რაით/, "Raithu"],
  [/^სინ(?:ას|ის|ელ|აელ)/, "Sinai"],
  [/^კვიპრ/, "Cyprus"],
  [/^კრეტ/, "Crete"],
  [/^პალესტინ/, "Palestine"],
  [/^ნიკომ[იე]დი/, "Nicomedia"],
  [/^ანკვირ/, "Ancyra"],
  [/^სებასტი/, "Sebaste"],
  [/^კვიზიკ/, "Cyzicus"],
  [/^მელიტინ/, "Melitene"],
  [/^კიევ/, "Kiev"],
  [/^მოსკოვ/, "Moscow"],
  [/^საროვ/, "Sarov"],
  [/^ვალაამ/, "Valaam"],
  [/^სოლოვეცკ/, "Solovki"],
  [/^რადონეჟ/, "Radonezh"],
  [/^სერბ/, "Serbia"],
  [/^ბულგარ/, "Bulgaria"],
  [/^ქართველ|^ივერი/, "Georgia"],
  [/^მცხეთ/, "Mtskheta"],
  [/^ედეს/, "Edessa"],
  [/^ნიკე/, "Nicaea"],
  [/^ლიკი/, "Lycia"],
  [/^მირ(?:ის|ელ|ონ)/, "Myra"],
  [/^სირაკუზ/, "Syracuse"],
  [/^სიცილი/, "Sicily"],
  [/^ბიზანტი/, "Byzantium"],
  [/^ტრაპიზონ/, "Trebizond"],
  [/^თბილის|^ტფილის/, "Tbilisi"],
  [/^გარეჯ/, "Gareji"],
  [/^როსტოვ/, "Rostov"],
  [/^ჩერნიგოვ/, "Chernigov"],
  [/^ნოვგოროდ/, "Novgorod"],
  [/^პეჩერ|^მღვიმ/, "Caves"],
  [/^ზედაზნ/, "Zedazeni"],
  [/^შიომღვიმ|^მღვიმელ/, "Mgvime"],
];

/** Names that the importer's other sources write in English, by their Georgian nominative. */
const GIVEN: Record<string, string> = {
  იოანე: "John", ბასილი: "Basil", კოსტანტინე: "Constantine", ნიკოლაოზ: "Nicholas", სერაპიონ: "Serapion", ილარიონი: "Hilarion", გრიგოლ: "Gregory", გიორგი: "George", თეოდორე: "Theodore", პავლე: "Paul", მარკოზ: "Mark",
  კირილე: "Cyril", ალექსანდრე: "Alexander", მაქსიმე: "Maximus", სვიმეონ: "Simeon", სვიმონ: "Simon", პეტრე: "Peter",
  იერემია: "Jeremiah", ლეონტი: "Leontius", ივლიანე: "Julian", იულიანე: "Julian", ზენონ: "Zeno", ბიქტორ: "Victor",
  იაკობ: "James", დიონისე: "Dionysius", ექვთიმე: "Euthymius", ლუკა: "Luke", ფილიპე: "Philip", ტიმოთე: "Timothy",
  ტროფიმე: "Trophimus", ევსტათი: "Eustathius", ნიკოლოზ: "Nicholas", დიმიტრი: "Demetrius", ანდრია: "Andrew",
  მიქაელ: "Michael", გაბრიელ: "Gabriel", ილია: "Elijah", ელია: "Elias", დავით: "David", სოლომონ: "Solomon",
  ნინო: "Nina", თამარ: "Tamar", ქეთევან: "Ketevan", ეკატერინე: "Catherine", ბარბარე: "Barbara", მარიამ: "Mary",
  ელენე: "Helen", ანა: "Anna", ირინე: "Irene", ევდოკია: "Eudocia", ეფრემ: "Ephraim", ანტონი: "Anthony",
  მაკარი: "Macarius", ათანასე: "Athanasius", ილარიონ: "Hilarion", სერაფიმე: "Seraphim", სერგი: "Sergius",
  ზოსიმე: "Zosimas", საბა: "Sabbas", სავა: "Sava", თეოფილე: "Theophilus", სტეფანე: "Stephen", ქრისტეფორე: "Christopher",
  კონსტანტინე: "Constantine", ლაზარე: "Lazarus", ზაქარია: "Zachariah", ელისე: "Elisha", მოსე: "Moses", აარონ: "Aaron",
  დანიელ: "Daniel", ესაია: "Isaiah", ისაია: "Isaiah", ეზეკიელ: "Ezekiel", იონა: "Jonah", ამოს: "Amos", მიქეა: "Micah",
  ნაუმ: "Nahum", ავაკუმ: "Habakkuk", სოფონია: "Zephaniah", აგეა: "Haggai", მალაქია: "Malachi", ოსია: "Hosea",
  იოველ: "Joel", აბდია: "Obadiah", ვლასი: "Blaise", ტრიფონ: "Tryphon", ხარალამპი: "Charalampus",
  პანტელეიმონ: "Panteleimon", კოზმა: "Cosmas", კოზმან: "Cosmas", დამიანე: "Damian", ევსევი: "Eusebius",
  ეპიფანე: "Epiphanius", იგნატი: "Ignatius", ეგნატე: "Ignatius", პოლიკარპე: "Polycarp", ირინეოს: "Irenaeus",
  კვიპრიანე: "Cyprian", ნიკიფორე: "Nicephorus", ტარასი: "Tarasius", ნიკიტა: "Nicetas", ანასტასი: "Anastasius",
  ანასტასია: "Anastasia", ევფემია: "Euphemia", ეკლესია: "Ecclesia", თეკლა: "Thecla", ბარნაბა: "Barnabas",
  თომა: "Thomas", მათე: "Matthew", მატათა: "Matthias", ბართლომე: "Bartholomew", თადეოზ: "Thaddeus",
  იუდა: "Jude", სილა: "Silas", სტაქი: "Stachys", ტიტე: "Titus", ფილიმონ: "Philemon", ონისიმე: "Onesimus",
  არისტარქე: "Aristarchus", აკვილა: "Aquila", პრისკილა: "Priscilla", აპოლოს: "Apollos", ლონგინოზ: "Longinus",
  იოსებ: "Joseph", იოაკიმ: "Joachim", ზებედე: "Zebedee", ელისაბედ: "Elizabeth", ელისაბეთ: "Elizabeth",
  მარიამ_მაგდალინელი: "Mary Magdalene", სოფია: "Sophia", ვერა: "Faith", ნადეჟდა: "Hope", ლუბოვ: "Love",
  ევგენი: "Eugene", ევგენია: "Eugenia", პარასკევა: "Paraskeva", კვირიაკე: "Cyriacus", კვირიკე: "Cyricus",
  ივლიტა: "Julitta", იულიტა: "Julitta", მარინე: "Marina", ტატიანა: "Tatiana", ტაისია: "Thaisia", ტაისი: "Thais",
  შუშანიკ: "Shushanik", აბო: "Abo", რაჟდენ: "Razhden", ევსტათე: "Eustathius", ილარიონე: "Hilarion",
  არსენ: "Arsenius", არსენი: "Arsenius", ბესარიონ: "Bessarion", გერმანე: "Germanus", სილოვანე: "Silvanus",
  იეროთეოზ: "Hierotheus", იეროთეოს: "Hierotheus", ნეოფიტე: "Neophytus", ფოტი: "Photius", ფოტინე: "Photine",
  ბონიფატე: "Boniface", ვალერიანე: "Valerian", კალისტრატე: "Callistratus", ზინაიდა: "Zenaida", ზოე: "Zoe",
  აგათია: "Agatha", აღათია: "Agatha", აგათონ: "Agathon", აღათონ: "Agathon", ექვთვიმე: "Euthymius", ხარლამპი: "Charalampus", ხარალამბი: "Charalampus", ავგუსტინე: "Augustine", ამბაკუმ: "Habakkuk", ანგია: "Haggai", ბონიფანტე: "Boniface", პოპლია: "Publia", სინეზი: "Synesius", აპელი: "Apelles", ლუკი: "Lucius", კლიმენტი: "Clement", ანთვირე: "Anterus", ფაბიანე: "Fabian", ფაბი: "Fabian", აღაპიტე: "Agapitus", აღაპი: "Agapius",
  აღაპიოს: "Agapius", ანთიმოზ: "Anthimus", ანთიმოს: "Anthimus", პოლიევქტოს: "Polyeuctus", პროკოფი: "Procopius",
  სამსონ: "Sampson", ტერენტი: "Terence", ფოკა: "Phocas", ხრისანთე: "Chrysanthus", დარია: "Daria",
  ევფროსინე: "Euphrosyne", მარკიანე: "Marcian", მარტინიანე: "Martinian", ისიდორე: "Isidore", ევაგრე: "Evagrius",
  თეოდოსი: "Theodosius", თეოდოსია: "Theodosia", თეოდორა: "Theodora", თეოქტისტე: "Theoctistus", ალექსი: "Alexis",
  ალექსი_მოსკოველი: "Alexis", ტიხონ: "Tikhon", სერაფიმ: "Seraphim", პაისი: "Paisius", ნილოს: "Nilus", ნილი: "Nilus",
  არტემი: "Artemius", ერმოლაოს: "Hermolaus", ერმოლაოზ: "Hermolaus", ერმე: "Hermes", ერმი: "Hermas",
  ტრიფონი: "Tryphon", ქარისიმე: "Charisimus", ქრისანთე: "Chrysanthus", ვიქტორ: "Victor", სიქსტე: "Sixtus",
  ლავრენტი: "Laurence", ფელიქს: "Felix", ფელიკისიმე: "Felicissimus", რომანოზ: "Romanus", რომანე: "Romanus",
};

const PAREN_DATE = /\d|^დაახ|^[IVXL]+(?:[-–][IVXL]+)?(?:\s|$)|ს\.|წ\.|შობამდე|შემდეგ/;
const ORIGIN = /^(?:სერბ|ბულგ|რუმინ|რუს|ბერძ|ქართ|ინგლ|ფრანგ|იტალ)\.?$/;

export type KaName = NativeName;
export type KaPart = NativePart;

const word = (forms: Array<[string[], Omit<Word, "plural">]>, w: string): Word | undefined => {
  for (const [list, def] of forms) if (list.includes(w)) return { ...def, plural: /თა$/.test(w) && !/^წმ/.test(def.en) ? true : undefined };
  return undefined;
};

/** The Georgian nominative of a name written in the genitive ("დიმიტრისა" → "დიმიტრი", "იოანესი" → "იოანე"). */
export function nominative(w: string): string {
  const known = (x: string): boolean => x in GIVEN;
  if (known(w)) return w;
  if (/ისა$/.test(w)) {
    const stem = w.slice(0, -3);
    if (known(`${stem}ი`)) return `${stem}ი`;
    if (known(stem)) return stem;
    return /[აეიოუ]$/.test(stem) ? stem : `${stem}ი`;
  }
  if (/[აეუ]სი$/.test(w)) return w.slice(0, -2);
  if (/ოსი$/.test(w)) return known(w.slice(0, -2)) ? w.slice(0, -2) : w.slice(0, -1);
  if (/ის$/.test(w) && w.length > 4) return known(w.slice(0, -2)) ? w.slice(0, -2) : `${w.slice(0, -2)}ი`;
  if (/სა$/.test(w) && known(w.slice(0, -2))) return w.slice(0, -2);
  return w;
}

/** The English form of a Georgian first name: the usual English name, or the name in Latin letters. */
function englishGiven(nom: string): string {
  const known = GIVEN[nom] ?? GIVEN[nom.replace(/ი$/, "")];
  if (known) return known;
  const latin = romanize(nom.replace(/ი$/, (m) => (nom.length > 4 ? "" : m))).replace(/([aeAE])[vf](?=[bcdfgkpqstxz])/g, (_m, v: string) => `${v}u`).replace(/([Kk])v(?=[aeiou])/g, "$1").replace(/fs/g, "ps").replace(/^Fs/, "Ps");
  return latin.charAt(0).toUpperCase() + latin.slice(1);
}

function placeOf(w: string): string | undefined {
  for (const [re, en] of PLACES) if (re.test(w)) return en;
  return undefined;
}

/** A place adjective or a place in the genitive: "ანკვირელისა", "სტუდიელი", "რომის", "კაპადოკიის". */
function isPlaceWord(w: string): boolean {
  return /ელ(?:ი|ისა|თა|ის)?$/.test(w) || /იის$|ის$/.test(w) || placeOf(w) !== undefined;
}

const LINKS = new Set(["და", "ანუ"]);
const COMPANIONS = /^(?:მისთანა|მის|მათთანა|მათ|მისთა|მათთა|სხვათა|მისისა|მათისა|თანა)$/;

interface Segment {
  words: string[];
}

/** Splits a title into its parts: several commemorations separated by ";" or by a rank after a comma. */
function clean(title: string): { text: string; surnames: string[] } {
  const surnames: string[] = [];
  let text = title
    .replace(/[*]+/g, "")
    .replace(/[„“"«»]/g, '"')
    // The rank of the equals of the apostles in two words: "მოციქულთა სწორისა".
    .replace(/მოციქულთა სწორ(ისა|ი|თა|ნი)(?=[\s,;.:]|$)/g, "მოციქულთასწორ$1")
    // "ხსენება" (the commemoration of) says nothing more.
    .replace(/^(?:მო)?ხსენება\s+|\s+(?:მო)?ხსენება(?=[\s,;.]|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  text = text.replace(/\(([^()]*)\)/g, (_m, inner: string) => {
    const parts = inner.split(/,\s*/).map((p) => p.trim()).filter(Boolean);
    const words = parts.filter((p) => !PAREN_DATE.test(p) && !ORIGIN.test(p));
    for (const p of words) surnames.push(p);
    return " ";
  });
  text = text.replace(/[;.,:\s-]+$/u, "").replace(/\s+([,;:])/g, "$1").replace(/\s+/g, " ").trim();
  return { text, surnames };
}

/** The feast a title names, by its Georgian words, as the English title the importer reads. */
const FEAST_WORDS: Array<[RegExp, string]> = [
  [/წინადაცვეთა/, "Circumcision of our Lord"],
  [/ნათლისღება|განცხადება/, "Theophany of our Lord"],
  [/მირქმა/, "Meeting of our Lord"],
  [/ხარება/, "Annunciation of the Most Holy Theotokos"],
  [/ფერისცვალება/, "Transfiguration of our Lord"],
  [/მიძინება.*ღმრთისმშობ|ღმრთისმშობ.*მიძინება/, "Dormition of the Most Holy Theotokos"],
  [/შობა.*ღმრთისმშობ|ღმრთისმშობ.*შობა/, "Nativity of the Most Holy Theotokos"],
  [/შობა.*(?:წინამორბედ|ნათლისმცემ)/, "Nativity of the Holy Prophet, Forerunner and Baptist John"],
  [/შობა.*(?:ქრისტე|უფლისა|მაცხოვრ)/, "Nativity of our Lord"],
  [/ჯვართამაღლება|ამაღლება.*ჯვ/, "Universal Exaltation of the Precious and Life-Creating Cross"],
  [/ტაძრად (?:მიყვანება|შესვლა)/, "Entry of the Most Holy Theotokos into the Temple"],
  [/თავისკვეთა/, "Beheading of the Holy Glorious Prophet, Forerunner and Baptist John"],
  [/საფარველ/, "Protection of our Most Holy Lady Theotokos"],
  [/ჩასახვა.*ანა|ჩასახვა.*ღმრთისმშობ/, "Conception by Saint Anna of the Most Holy Theotokos"],
  [/ჩასახვა.*(?:წინამორბედ|ნათლისმცემ|იოანე)/, "Conception of the Honorable, Glorious Prophet, Forerunner and Baptist John"],
  [/ჯაჭვ/, "Veneration of the Precious Chains of the Holy and All-Glorious Apostle Peter"],
  [/დადება.*სამოსლ/, "Placing of the Honorable Robe of the Most Holy Theotokos at Blachernae"],
  [/დადება.*სარტყ/, "Placing of the Honorable Belt of the Most Holy Theotokos"],
  [/ძელ.*გამოღება|გამოღება.*ძელ/, "Procession of the Honorable Wood of the Life-giving Cross"],
  [/სასწაულ.*ჯვარ.*იერუსალიმ|ჯვარ.*იერუსალიმ.*გამოჩინება/, "Appearance of the Sign of the Precious Cross over Jerusalem"],
  [/კვართ.*საუფლო|სვეტ.*ცხოველ/, "Commemoration of the Robe of the Lord and the Life-giving Pillar"],
  [/ანდრია.*საქართველოში|საქართველოში.*ანდრია/, "Entrance of the Apostle Andrew into Georgia"],
  [/მუცლადღება.*(?:წინამორბედ|ნათლისმცემ|იოანე)/, "Conception of the Honorable, Glorious Prophet, Forerunner and Baptist John"],
  [/მუცლადღება.*(?:ანა|ღ(?:მრ|ვ)თისმშობ)/, "Conception by Saint Anna of the Most Holy Theotokos"],
  [/ენკენია|განახლება.*აღდგომის/, "Commemoration of the Founding of the Church of the Holy Resurrection at Jerusalem"],
  [/ინდიქტ|საეკლესიო ახალი წლის/, "Beginning of the Church New Year"],
  [/ხელთუქმნელ/, "Translation of the Icon Not-Made-by-Hands from Edessa to Constantinople"],
  [/კრება.*(?:წინამორბედ|ნათლისმცემ)/, "Synaxis of the Holy, Glorious Prophet, Forerunner and Baptist John"],
  [/კრება.*ღმრთისმშობ/, "Synaxis of the Most Holy Theotokos"],
];

/** Movable days that the calendar typed in as fixed (the Ascension), and notes that are no commemoration. */
const NOT_FIXED = /ამაღლება უფლისა|აღდგომა|სულთმოფენ|ბზობა|ზატიკ|მარხვის|ხსნილი|დღესასწაულის წარგზავნა|წინადღესასწაული|შემდგომი დღესასწაული|ღვაწლით გაბრწყინებულ|სამების დღესასწაული|ლომისობა|შიოობა|მამადავითობა|საიდუმლო სერობ|მკვდრეთით აღდგინება|ქებაჲ და დიდებაჲ|აღინიშნება/;

/** Words that name no one: places in the locative or the ablative ("მარტიროპოლში", "ოსმალთაგან"), plural participles ("წამებულთა"). */
const NOT_NAME = /(?:ში|შიც|დან|თაგან|ისგან|ითა|ზედა|სათვის|თვის|ულთა|ილთა|ელთა|ართა|ენთა|ებთა|ებულნი|ებული|ებულ|ად|ით|ეთი|ეთის|ეთისა|ეთში|ობა|ობის|ხევი|ხევის)$/;
const NOT_NAME_WORDS = new Set(["საქართველოს", "სრულიად", "ხსენება", "მოხსენება", "დღესასწაული", "შორის", "რომელნი", "რომელი", "რომელიც", "რომელსაც", "ეწოდება", "წოდებული", "წოდებულისა", "მიერ", "ქრისტეს", "ქრისტესი", "უფლისა", "ღმრთისა", "ჩვენისა", "იესო", "იესუ", "მაცხოვრისა", "მაცხოვრის", "ყოველთა", "ახლო", "შინა", "ზედა", "პირველი", "პირველისა", "პირველ", "სამოცდაათთაგანთა", "სამოცდაათთაგანი", "სამოცდაათთაგანისა", "სამოციქულო", "ეკლესიის", "ეკლესიისა", "ავტოკეფალია", "ავტოკეფალიის", "ავტოკეფალიისა"]);

/** Stems of words that are no names: deeds, offices, groups of people, regions, a word of the readings. */
const COMMON = /^(?:აღდგენ|მისთანა|მასთან|მომხდარ|მონასტ|მრავალვნებ|მწიგნობარ|მენელსაცხებ|პირველდიაკ|პოვნ|საერო|სამღვდელო|სიონობ|ტოტალიტარ|წამებ|წამოყვან|წინასწარმეტ|ცხოველსმყოფ|თხოთ|საგურამო|სამეგრელო|გურიი|გურიის|დუდიყვათ|ებრ.|ლკ.|მთ.|ინ.|მკ.|რწმენ|სამშობლო|თავგანწირულ|ომში|ერისკაც|ტაძარ|ეკლესი|ხალხ|მამათა|დედათა|ძმათა|ყრმათა|ქალწულთა|დღე|ღმრთისმშობ|ღვთისმშობ|ჯვრ|ჯვარ|კათალიკოსთა|ხელთუქმნელ|ლაზთა|რეჟიმ|სამსჭვალ|საშინელ|შეემთხვ|ზემოთ|მონაზონთა|ხატ|[IVXL]+$)/;

/** Whether a word can be a first name. */
function nameWord(w: string): boolean {
  if (NOT_NAME_WORDS.has(w) || /^\d/.test(w) || /\.$/.test(w) || COMMON.test(w)) return false;
  if (nominative(w) in GIVEN) return true;
  if (/(?:ება|ობა|ული|ულისა|ებელი|ებლი|ებელისა|ოთა|ეთა|ებით|ობის|ების)$/.test(w)) return false;
  if (placeOf(w)) return false;
  return !NOT_NAME.test(w) && !word(AFTER, w) && !word(RANKS, w) && !PRAISE.has(w) && !(w in RELATIONS);
}

/** Reads a Georgian calendar title. */
export function parseKa(title: string): KaPart[] {
  const { text, surnames } = clean(title);
  if (!text) return [];
  // Several commemorations: "ღირ. ფოსტირიოს მეუდაბნოისა; ღირ. მინასი", "… (270-275), ღირსისა ანთუსასი …".
  const pieces = text.split(/;\s*/).flatMap((p) => splitAtRanks(p));
  const out: KaPart[] = [];
  for (const piece of pieces) {
    const part = parsePiece(piece.replace(/^და\s+/, ""), surnames);
    if (part) out.push(part);
  }
  return out;
}

/** "მღვდელმოწამისა ათანასე ეპისკოპოსისა, ღირსისა ანთუსასი": a rank after a comma starts another commemoration. */
function splitAtRanks(text: string): string[] {
  const out: string[] = [];
  let current: string[] = [];
  for (const chunk of text.split(/,\s*/)) {
    const first = chunk.trim().split(/\s+/)[0] ?? "";
    const rank = word(RANKS, first);
    if (current.length > 0 && rank && !rank.plural && /^(?:ღირს|მღვდელმოწ|დიდმოწ|ღირსმოწ|წინასწ|მოციქულ|მართ)/.test(first)) {
      out.push(current.join(", "));
      current = [];
    }
    current.push(chunk.trim());
  }
  if (current.length > 0) out.push(current.join(", "));
  return out;
}

function parsePiece(text: string, surnames: string[]): KaPart | undefined {
  if (NOT_FIXED.test(text) || /sდას.s/.test(text)) return { en: text, parsed: skip(text), names: [], display: text };
  for (const [re, en] of FEAST_WORDS) {
    if (!re.test(text)) continue;
    const parsed = parseEn(en);
    if (parsed.kind !== "skip") return { en, parsed, names: [], display: text };
  }
  // Icons of the Theotokos: "ივერიის ღმრთისმშობლის ხატის დღესასწაული", "დღესასწაული ღმრთისმშობლის ხატისა „…“".
  if (/ხატ(?:ის|ისა|ი)(?:[\s,.;"]|$)/.test(text) && /ღ(?:მრ|ვ)თისმშობ/.test(text)) {
    const en = `${iconName(text)} Icon of the Mother of God`;
    return { en, parsed: parseEn(en), names: [], display: text };
  }
  if (/მსოფლიო კრებ/.test(text)) {
    const n = /\b([IVX]+)\b/.exec(text)?.[1];
    const ordinal = n ? ROMAN[n] : undefined;
    const en = ordinal ? `Holy Fathers of the ${ordinal} Ecumenical Council` : "Holy Fathers of the Ecumenical Council";
    return { en, parsed: parseEn(en), names: [], display: text };
  }
  if (/მსოფლიო მოძღვართა/.test(text) || /ბასილი დიდ.*გრიგოლ.*ღმრთისმეტყველ.*იოანე/.test(text)) {
    const en = "Synaxis of the Ecumenical Teachers and Hierarchs: Basil the Great, Gregory the Theologian, and John Chrysostom";
    return { en, parsed: parseEn(en), names: [], display: text };
  }
  // A synaxis: "კრება წმიდათა 70-თა მოციქულთა: …", "კრება გაბრიელ მთავარანგელოზისა".
  if (/^კრება|კრება:/.test(text) || /მთავარანგელოზ/.test(text)) {
    const en = synaxisOf(text);
    if (en) return { en, parsed: parseEn(en), names: [], display: text };
  }
  // Relics: "აღმოყვანება წმიდათა ნაწილთა ღირსისა თეოდორესი", "ნაწილთა აღმოყვანება …", "პოვნა ნაწილთა …".
  const relics = /(?:^|\s)(აღმოყვანება|პოვნა|გადასვენება|გადმოსვენება|გადაბრძანება|გადატანა)(?:\s|$)/.exec(text);
  if (relics && /ნაწილ|თავის|თავი/.test(text)) {
    const finding = relics[1] === "პოვნა";
    const rest = text
      .replace(/(?:^|\s)(?:აღმოყვანება|პოვნა|გადასვენება|გადმოსვენება|გადაბრძანება|გადატანა)(?:\s|$)/, " ")
      .replace(/წმიდათა ნაწილთა|ნაწილთა|თავის (?:პირველად|მეორედ|მესამედ)?|წმიდა ნაწილების/g, " ")
      .replace(/\s+\S+(?:დან|ში)(?=\s|$)/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const saint = parsePerson(rest, surnames);
    const en = `${finding ? "Finding" : "Translation"} of the relics of ${saint?.en ?? englishWords(rest)}`;
    return { en, parsed: parseEn(en), names: saint?.names ?? [], display: text };
  }
  const repose = /^მიცვალება\s+(.*)$/.exec(text);
  if (repose?.[1]) return parsePerson(repose[1], surnames) ?? undefined;
  return parsePerson(text, surnames) ?? undefined;
}

/** Georgian numbers of the groups of saints, with their genitive plural. */
const NUMBERS: Record<string, number> = Object.fromEntries(
  ([["ორ", 2], ["სამ", 3], ["ოთხ", 4], ["ხუთ", 5], ["ექვს", 6], ["შვიდ", 7], ["რვა", 8], ["ცხრა", 9], ["ათ", 10], ["თორმეტ", 12], ["ოც", 20], ["ორმოც", 40], ["ორმეოც", 40], ["ორმოცდახუთ", 45], ["ორმეოცდაათ", 50], ["თერთმეტ", 11], ["ცამეტ", 13], ["ათოთხმეტ", 14], ["თოთხმეტ", 14], ["თხუთმეტ", 15], ["თექვსმეტ", 16], ["ჩვიდმეტ", 17], ["თვრამეტ", 18], ["ცხრამეტ", 19]] as Array<[string, number]>).flatMap(([stem, n]) => [[`${stem}ი`, n], [`${stem}თა`, n], [`${stem}`, n]]),
);

const ROMAN: Record<string, string> = { I: "First", II: "Second", III: "Third", IV: "Fourth", V: "Fifth", VI: "Sixth", VII: "Seventh" };

function skip(title: string): ParsedTitle {
  return { kind: "skip", holiness: [], plural: false, honorific: "", rest: title, names: [], title };
}

/** The English name of an icon of the Theotokos, from the Georgian words that name it. */
function iconName(text: string): string {
  const quoted = /"([^"]+)"/.exec(text)?.[1];
  const words = (quoted ?? text)
    .split(/\s+/)
    .filter((w) => !/ღ(?:მრ|ვ)თისმშობ|ხატ|დღესასწაული|ყოვლადწმიდა|წოდებული|რომელსაც|ეწოდება/.test(w));
  const place = words.map(placeOf).find((p) => p !== undefined);
  if (place === "Georgia") return "Iveron";
  if (place) return place;
  return words.map((w) => romanize(w)).join(" ");
}

/** "კრება წმიდათა 70-თა მოციქულთა", "კრება გაბრიელ მთავარანგელოზისა", "კრება ღირსთა მამათა, კიევის ახლო მღვიმეში დავანებულთა". */
function synaxisOf(text: string): string | undefined {
  if (/მთავარანგელოზ/.test(text)) {
    if (/გაბრიელ/.test(text)) return "Synaxis of the Archangel Gabriel";
    return "Synaxis of the Archangel Michael and the Other Bodiless Powers";
  }
  const count = /(\d+)-?თა/.exec(text)?.[1];
  if (count && /მოციქულ/.test(text)) return `Synaxis of the ${count === "70" ? "Seventy" : count === "12" ? "Twelve" : count} Apostles`;
  if (/ათორმეტ/.test(text) && /მოციქულ/.test(text)) return "Synaxis of the Twelve Apostles";
  if (/კიევ|მღვიმ/.test(text)) return /ახლო/.test(text) ? "Synaxis of the Venerable Fathers of the Kiev Near Caves" : "Synaxis of the Venerable Fathers of the Kiev Far Caves";
  return undefined;
}

/** English words for Georgian words the tables know; the rest left out. */
function englishWords(text: string): string {
  return text
    .split(/\s+/)
    .map((w) => word(AFTER, w)?.en ?? placeOf(w) ?? "")
    .filter(Boolean)
    .join(" ");
}

interface PersonPiece {
  en: string;
  names: KaName[];
}

/**
 * The saints of a title: rank words, then a list of names ("მოწამეთა: A, B და C"), each with what follows it until
 * the next comma or "და"; a part after a comma that starts with an office, a place or a relation, or ends with a
 * relation, describes the name before it.
 */
function parsePerson(text: string, surnames: string[]): KaPart | undefined {
  const words = text.replace(/:/g, " : ").replace(/,/g, " , ").split(/\s+/).filter(Boolean);
  let i = 0;
  const lead: Word[] = [];
  while (i < words.length) {
    const w = words[i] ?? "";
    const rank = word(RANKS, w);
    if (rank) {
      lead.push(rank);
      i++;
      continue;
    }
    if (PRAISE.has(w) || w === ":" || w === ",") {
      i++;
      continue;
    }
    // "წმიდისა დედისა ჩვენისა და მოციქულთასწორისა, …": the ranks of one saint, joined by "and".
    if (LINKS.has(w) && word(RANKS, words[i + 1] ?? "")) {
      i++;
      continue;
    }
    break;
  }
  // A group by its number or its place: "440 იტალიელ მოწამეთა", "1003 ნიკომიდიელ მოწამეთა", "ცხრა კვიზიკელ მოწ. …".
  const numberWord = NUMBERS[words[i] ?? ""];
  const count = /^(\d+)$/.exec(words[i] ?? "")?.[1] ?? (numberWord !== undefined ? String(numberWord) : undefined);
  if (count) {
    const rest = words.slice(i + 1);
    const holinessWord = rest.map((w) => word(RANKS, w)).find((r) => r?.holiness);
    const place = rest.map(placeOf).find((p) => p !== undefined);
    const en = `${count} ${holinessWord?.en ?? "Martyr"}s${place ? ` of ${place}` : ""}`;
    return { en, parsed: parseEn(en), names: [], display: text };
  }
  const plural = lead.some((r) => r.plural) || lead.some((r) => r.en === "Saints");
  // Chunks between commas and "და".
  const chunks: string[][] = [[]];
  let companions = false;
  let companionCount: string | undefined;
  for (; i < words.length; i++) {
    const w = words[i] ?? "";
    if (w === ":" || w === "-" || w === "–") continue;
    if (w === "," || LINKS.has(w)) {
      if ((chunks[chunks.length - 1] ?? []).length > 0) chunks.push([]);
      continue;
    }
    if (COMPANIONS.test(w)) {
      companions = true;
      const n = /^(\d+)(?:-?თა)?$/.exec(words[i + 1] ?? "")?.[1];
      if (n) companionCount = n;
      // What follows names the companions; they are the group's, not more names of the title.
      if (/^(?:სხვათა|მისთანა|მათთანა|თანა)$/.test(w)) break;
      continue;
    }
    chunks[chunks.length - 1]?.push(w);
  }
  const names: Array<{ given: string; en: string[]; holiness: HolinessType[]; gender?: Gender; extra: string[] }> = [];
  for (const chunk of chunks) {
    if (chunk.length === 0) continue;
    const head = chunk[0] ?? "";
    const tail = chunk[chunk.length - 1] ?? "";
    const describes =
      word(AFTER, head) !== undefined ||
      (isPlaceWord(head) && !(nominative(head) in GIVEN)) ||
      tail in RELATIONS ||
      head in RELATIONS ||
      /^\d/.test(head) ||
      !chunk.some((w) => nameWord(w) && !word(RANKS, w));
    const own = word(RANKS, head);
    if ((describes && names.length > 0) || own?.plural) {
      const last = names[names.length - 1];
      if (last && tail in RELATIONS) {
        const rel = RELATIONS[tail];
        // "წმიდა ბასილი დიდის დედისა": the mother of St Basil the Great.
        const of = chunk.slice(0, -1).filter((w) => !word(RANKS, w));
        const ofName = of[0] ? englishGiven(nominative(of[0])) : "";
        last.en.push(`${rel?.en ?? ""} of ${[ofName, englishWords(of.slice(1).join(" "))].filter(Boolean).join(" ")}`.trim());
        if (rel?.gender && !last.gender && rel.en !== "disciple") last.gender = rel.gender;
        continue;
      }
      if (last) {
        for (const w of chunk) {
          const a = word(AFTER, w);
          if (a) {
            last.en.push(a.en);
            for (const h of a.holiness ?? []) if (!last.holiness.includes(h)) last.holiness.push(h);
            if (a.gender) last.gender ??= a.gender;
          } else {
            const p = placeOf(w);
            if (p) last.en.push(`of ${p}`);
          }
        }
        continue;
      }
    }
    // A name: its rank (if it has one of its own), the name, then its epithets, places and offices.
    let j = 0;
    const holiness: HolinessType[] = [];
    let gender: Gender | undefined;
    const en: string[] = [];
    const extra: string[] = [];
    // Before the name: its ranks, and the offices and places that come first in Georgian ("ქართველთა კეთილმორწმუნე
    // მეფისა თამარისა", the right-believing king of the Georgians, Tamar).
    for (; j < chunk.length; j++) {
      const w = chunk[j] ?? "";
      const r = word(RANKS, w);
      if (r || PRAISE.has(w)) {
        for (const h of r?.holiness ?? []) holiness.push(h);
        if (r?.gender) gender = r.gender;
        continue;
      }
      const a = word(AFTER, w);
      if (a && j + 1 < chunk.length) {
        en.push(a.en);
        for (const h of a.holiness ?? []) if (!holiness.includes(h)) holiness.push(h);
        if (a.gender) gender ??= a.gender;
        continue;
      }
      if (!nameWord(w)) {
        const p = placeOf(w);
        if (p && !en.includes(`of ${p}`)) en.push(`of ${p}`);
        continue;
      }
      break;
    }
    const given = chunk[j];
    if (!given) {
      // Only places and words of the title: they describe the name before, if there is one.
      const last = names[names.length - 1];
      if (last) for (const e of en) if (!last.en.includes(e)) last.en.push(e);
      continue;
    }
    const nom = nominative(given);
    for (const w of chunk.slice(j + 1)) {
      if (/^[IVX]+(?:-(?:ისა|ის|სა))?$/.test(w)) {
        en.push(w.replace(/-.*$/, ""));
        continue;
      }
      const a = word(AFTER, w);
      if (a) {
        en.push(a.en);
        for (const h of a.holiness ?? []) if (!holiness.includes(h)) holiness.push(h);
        if (a.gender) gender ??= a.gender;
        continue;
      }
      const p = placeOf(w);
      if (p) en.push(`of ${p}`);
      else extra.push(w);
    }
    names.push({ given: nom, en: [englishGiven(nom), ...en], holiness, gender, extra });
  }
  if (names.length === 0) {
    // A group named by its places and its deed ("მარტიროპოლში წამებულ სპარსელთა", the Persians martyred at
    // Martyropolis), or else something that is no saint's day: left for the matcher's events.
    const places = [...new Set(words.map(placeOf).filter((p): p is string => p !== undefined))];
    const martyrs = lead.some((r) => r.holiness?.some((h) => /martyr/.test(h))) || words.some((w) => /წამებულ|მოწამე/.test(w));
    const where = places.length > 0 ? ` of ${places.join(" and ")}` : "";
    // Without names or a number it is too uncertain to make a group of it: it is left for review.
    const en = `${martyrs ? "Holy Martyrs" : "Commemoration"}${where}`;
    return { en, parsed: { kind: "event", holiness: [], plural: false, honorific: "", rest: en, names: [], title: en }, names: [], display: text };
  }
  const lineHoliness: HolinessType[] = [];
  for (const r of lead) for (const h of r.holiness ?? []) if (!lineHoliness.includes(h)) lineHoliness.push(h);
  const lineGender = lead.find((r) => r.gender)?.gender;
  const honorific = englishRank(lead, names.length > 1 || plural);
  const nameTexts = names.map((n) => [n.en[0], ...orderEpithets(n.en.slice(1))].join(" "));
  // Surnames in brackets: "წმიდისა ექვთიმე ღმრთისკაცისა (თაყაიშვილისა, 1953)" is Euthymius (Takaishvili).
  if (surnames.length > 0 && nameTexts.length === 1) {
    const sur = surnames.map((s) => romanize(nominative(s.split(/\s+/)[0] ?? s))).map((s) => s.charAt(0).toUpperCase() + s.slice(1));
    nameTexts[0] = `${nameTexts[0]} (${sur.join(", ")})`;
  }
  let en = `${honorific} ${list(nameTexts)}`.trim();
  const counted = companionCount ? Number(companionCount) : undefined;
  if (companions) en += companionCount ? ` and ${companionCount} ${names.length > 1 ? "others" : "Martyrs"} with ${names.length > 1 ? "them" : "him"}` : ` and those with ${names.length > 1 ? "them" : "him"}`;
  const parsed = parseEn(en);
  if (counted) parsed.count = counted;
  // The ranks each name had of its own ("ღირსმოწამისა ზოსიმე … და მოწამისა ათანასე …") join those of the title.
  for (const n of names) for (const h of n.holiness) if (!parsed.holiness.includes(h)) parsed.holiness.push(h);
  for (const h of lineHoliness) if (!parsed.holiness.includes(h)) parsed.holiness.push(h);
  const rankNom = lead.find((r) => r.holiness)?.nom ?? lead[0]?.nom;
  const kaNames: KaName[] = names.map((n, i) => ({
    display: [rankNom && !n.holiness.length ? rankNom : (word(RANKS, chunks.flat()[0] ?? "")?.nom ?? rankNom), n.given].filter(Boolean).join(" "),
    given: n.given,
    en: [n.en[0], ...orderEpithets(n.en.slice(1))].join(" ").replace(/\s+,/g, ",") || (nameTexts[i] ?? n.given),
    holiness: [...new Set([...lineHoliness, ...n.holiness])],
    ...((n.gender ?? lineGender) ? { gender: n.gender ?? lineGender } : {}),
  }));
  return { en, parsed, names: kaNames, display: text };
}

/** "Saint", "Venerable Martyr", "Martyrs": the honorific of the English title, plural for several names. */
function englishRank(lead: Word[], plural: boolean): string {
  const main = lead.filter((r) => r.en !== "Saint" && r.en !== "Saints" && r.en !== "Blessed");
  const words = (main.length > 0 ? main : lead).map((r) => r.en);
  if (words.length === 0) return plural ? "Saints" : "Saint";
  const last = words[words.length - 1] ?? "";
  if (plural && !/s$/.test(last)) words[words.length - 1] = last === "Venerable" ? "Venerable" : last === "Right-believing" ? "Right-believing" : `${last}s`;
  return words.join(" ");
}

/** Epithets first, then the office and the place: "the Great, Archbishop of Caesarea". */
function orderEpithets(words: string[]): string[] {
  const epithets = words.filter((w) => /^the |^Chrysostom|^Wonderworker|^Myrrh|^Man of God|^Trophy/.test(w));
  const offices = words.filter((w) => !epithets.includes(w) && !/^of /.test(w));
  const places = words.filter((w) => /^of /.test(w));
  const out = [...epithets];
  if (offices.length > 0 || places.length > 0) out.push(`${out.length > 0 ? ", " : ""}${[...offices, ...places].join(" ")}`.trim());
  return out.map((w, i) => (i > 0 && !w.startsWith(",") ? w : w)).filter(Boolean);
}

function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** The fixed feasts the importer knows, for a quick test of a Georgian title. */
export function feastOfKa(title: string): string | undefined {
  for (const part of parseKa(title)) if (part.parsed.kind === "feast" && part.parsed.feast && FEASTS.some((f) => f.id === part.parsed.feast)) return part.parsed.feast;
  return undefined;
}
