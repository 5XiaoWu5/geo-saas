export type InventoryPageType = "Homepage" | "Product" | "Blog" | "Docs" | "Pricing" | "Legal" | "Landing";
export type InventoryAssetType = "Images" | "Videos" | "PDF" | "JS" | "CSS" | "Icons" | "Fonts";
export type StructuredDataType = "FAQ" | "Article" | "Organization" | "Breadcrumb" | "Product" | "LocalBusiness";
export type MetaSignal = "Title" | "Description" | "OpenGraph" | "Twitter Card" | "Robots" | "Canonical";

export type InventoryPage = {
  id: string;
  url: string;
  pageType: InventoryPageType;
  title: string;
  language: string;
  statusCode: 200 | 301 | 302 | 404 | 500;
  canonical: string;
  wordCount: number;
  lastCrawl: string;
  indexable: boolean;
  meta: Record<MetaSignal, "Present" | "Missing" | "Warning">;
};

export type InventoryAsset = {
  type: InventoryAssetType;
  count: number;
  sizeMb: number;
  issues: number;
};

export type StructuredDataInventory = {
  type: StructuredDataType;
  detected: number;
  valid: number;
  warnings: number;
};

export type InventorySortKey = "url" | "pageType" | "statusCode" | "wordCount" | "lastCrawl" | "indexable";
