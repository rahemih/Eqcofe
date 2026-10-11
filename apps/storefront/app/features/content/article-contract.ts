import type { ApiSuccessData } from "../../platform/api/contract.js";

export type ArticleListResponse = NonNullable<ApiSuccessData<"get", "/articles">>;
export type ArticleSummary = ArticleListResponse["items"][number];
