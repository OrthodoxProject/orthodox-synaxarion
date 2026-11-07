import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import type { ErrorObject, ValidateFunction } from "ajv";
import { isValidBibleRef } from "./bible.ts";
import { isValidEdtf, isValidIsoDate, parseMonthDay } from "./dates.ts";

export interface SchemaSet {
  /** Validator for a schema file, by path relative to schema/ (e.g. "person.schema.json"). */
  get(schemaPath: string): ValidateFunction;
  /** USFM codes accepted in Bible references. */
  bibleBooks: ReadonlySet<string>;
}

function listSchemaFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listSchemaFiles(full));
    else if (name.endsWith(".schema.json")) out.push(full);
  }
  return out;
}

/**
 * Loads every schema under schemaDir into one Ajv instance. Schemas have no $id:
 * each is registered under its file URL, so relative $refs resolve exactly as
 * they do in editors.
 */
export function loadSchemas(schemaDir: string): SchemaSet {
  const files = listSchemaFiles(schemaDir);
  const defsFile = join(schemaDir, "common", "defs.schema.json");
  const defs = JSON.parse(readFileSync(defsFile, "utf8")) as {
    $defs: { bibleBook: { enum: string[] } };
  };
  const bibleBooks = new Set(defs.$defs.bibleBook.enum);

  // strictRequired is off because conditional schemas (if/then, anyOf) list required
  // properties that are defined in the parent schema.
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false, discriminator: true });
  ajv.addFormat("edtf", { type: "string", validate: isValidEdtf });
  ajv.addFormat("bible-ref", { type: "string", validate: (s: string) => isValidBibleRef(s, bibleBooks) });
  ajv.addFormat("month-day", { type: "string", validate: (s: string) => parseMonthDay(s) !== null });
  ajv.addFormat("date", { type: "string", validate: isValidIsoDate });
  ajv.addFormat("uri", {
    type: "string",
    validate: (s: string) => {
      try {
        const url = new URL(s);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    },
  });

  const keys = new Map<string, string>();
  for (const file of files) {
    const key = pathToFileURL(file).href;
    ajv.addSchema(JSON.parse(readFileSync(file, "utf8")), key);
    keys.set(relative(schemaDir, file).split(sep).join("/"), key);
  }

  // Compile everything up front so that a broken schema fails loudly, even with no data.
  const compiled = new Map<string, ValidateFunction>();
  for (const [schemaPath, key] of keys) {
    const fn = ajv.getSchema(key);
    if (!fn) throw new Error(`Schema did not compile: ${schemaPath}`);
    compiled.set(schemaPath, fn);
  }
  return {
    bibleBooks,
    get(schemaPath: string): ValidateFunction {
      const fn = compiled.get(schemaPath);
      if (!fn) throw new Error(`Unknown schema: ${schemaPath}`);
      return fn;
    },
  };
}

/** Readable, de-duplicated messages for Ajv errors. */
export function describeErrors(errors: ErrorObject[] | null | undefined, limit = 8): string[] {
  if (!errors) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of errors) {
    // Branch failures of oneOf/anyOf are reported by their own errors; skip the summary.
    if (e.keyword === "oneOf" || e.keyword === "anyOf" || e.keyword === "if") continue;
    const where = e.instancePath || "(root)";
    let detail = e.message ?? e.keyword;
    if (e.keyword === "additionalProperties" || e.keyword === "unevaluatedProperties") {
      const p = e.params as { additionalProperty?: string; unevaluatedProperty?: string };
      detail = `unknown property "${p.additionalProperty ?? p.unevaluatedProperty}"`;
    } else if (e.keyword === "enum") {
      const p = e.params as { allowedValues?: unknown[] };
      detail = `must be one of: ${(p.allowedValues ?? []).join(", ")}`;
    } else if (e.keyword === "format") {
      const p = e.params as { format?: string };
      detail = `is not a valid ${p.format}`;
    }
    const line = `${where} ${detail}`;
    if (!seen.has(line)) {
      seen.add(line);
      out.push(line);
    }
    if (out.length >= limit) break;
  }
  return out;
}
