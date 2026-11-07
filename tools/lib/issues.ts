export type Severity = "error" | "warning";

export interface Issue {
  severity: Severity;
  /** Stable machine-readable code, e.g. "ref.missing". */
  code: string;
  /** Path relative to the data folder, POSIX separators ("" for dataset-wide issues). */
  file: string;
  message: string;
}

export class Reporter {
  readonly issues: Issue[] = [];

  error(code: string, file: string, message: string): void {
    this.issues.push({ severity: "error", code, file, message });
  }

  warn(code: string, file: string, message: string): void {
    this.issues.push({ severity: "warning", code, file, message });
  }

  get errors(): Issue[] {
    return this.issues.filter((i) => i.severity === "error");
  }

  get warnings(): Issue[] {
    return this.issues.filter((i) => i.severity === "warning");
  }
}
