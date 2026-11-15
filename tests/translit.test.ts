import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { equivalent, skeleton } from "../tools/lib/import/names.ts";
import { isNonLatin, romanize } from "../tools/lib/import/translit.ts";

describe("romanize", () => {
  it("writes Bulgarian, Ukrainian and Serbian Cyrillic in Latin letters", () => {
    assert.equal(romanize("Св. вмчк Димитър Солунски"), "Sv. vmchk Dimitar Solunski");
    assert.equal(romanize("Георгій"), "Georgii");
    assert.equal(romanize("Свети Јован Владимир"), "Sveti Jovan Vladimir");
    assert.equal(romanize("Ђорђе"), "Djordje");
  });
  it("drops the accents of Greek", () => {
    assert.equal(romanize("Ὅσιος Ἰωάννης"), "Osios Ioannis");
    assert.equal(romanize("Άγιος Νικόλαος"), "Agios Nikolaos");
  });
  it("writes Georgian in Latin letters, with ფ as f", () => {
    assert.equal(romanize("წმიდა გიორგი"), "tsmida giorgi");
    assert.equal(romanize("ფილიპე"), "filipe");
  });
  it("leaves Latin text as it is", () => assert.equal(romanize("Sf. Ier. Nicolae"), "Sf. Ier. Nicolae"));
  it("gives names the keys of their Romanian and English forms", () => {
    assert.equal(equivalent(romanize("Νικόλαος")), equivalent("Nicholas"));
    assert.equal(equivalent(romanize("Николай")), equivalent("Nicolae"));
    assert.equal(equivalent(romanize("გიორგი")), equivalent("George"));
    assert.equal(equivalent(romanize("Петка")), equivalent("Parascheva"));
    assert.equal(skeleton(romanize("Димитър")), skeleton("Dimitrie"));
  });
  it("tells non-Latin texts", () => {
    assert.equal(isNonLatin("Св. Николай"), true);
    assert.equal(isNonLatin("Sf. Nicolae"), false);
  });
});
