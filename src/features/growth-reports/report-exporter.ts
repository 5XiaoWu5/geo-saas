import type { GrowthReportSnapshot } from "./types";

export type ReportExportFormat = "HTML" | "PDF" | "PPT";
export interface ReportExporter {
  readonly format: ReportExportFormat;
  export(snapshot: GrowthReportSnapshot): Promise<string>;
}

export interface FuturePdfReportExporter extends ReportExporter { readonly format: "PDF"; }
export interface FuturePptReportExporter extends ReportExporter { readonly format: "PPT"; }
