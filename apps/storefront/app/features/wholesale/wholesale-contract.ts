import type { ApiSuccessData } from "../../platform/api/contract.js";

export type WholesaleSessionResponse = NonNullable<ApiSuccessData<"get", "/auth/session">>;
export type WholesaleProfile = NonNullable<ApiSuccessData<"get", "/customer/profile">>;
export type WholesaleApplication = NonNullable<ApiSuccessData<"post", "/customer/wholesale/applications">>;
export type WholesaleLatestApplication = ApiSuccessData<"get", "/customer/wholesale/application">;
export type WholesaleCustomerType = WholesaleProfile["customer_type"];
export type WholesaleApplicationStatus = WholesaleApplication["status"];
