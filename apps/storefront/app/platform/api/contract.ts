import type { components, paths } from "../../../../../src/generated/openapi.js";

export type ApiPaths = paths;
export type ApiComponents = components;
export type ApiErrorResponse = components["schemas"]["ErrorResponse"];
export type ApiFieldError = components["schemas"]["FieldError"];

export type ApiMethod = "get" | "post" | "put" | "patch" | "delete" | "head";

type OperationAt<
  P extends keyof paths,
  M extends ApiMethod,
> = M extends keyof paths[P] ? Exclude<paths[P][M], undefined> : never;

export type ApiPath<M extends ApiMethod> = Extract<{
  [P in keyof paths]: [OperationAt<P, M>] extends [never] ? never : P;
}[keyof paths], string>;

type ParameterRaw<Operation, Key extends "query" | "header" | "path"> =
  Operation extends { parameters: infer Parameters }
    ? Key extends keyof Parameters
      ? Parameters[Key]
      : never
    : never;

type ParameterField<Raw, Name extends string> =
  [Exclude<Raw, undefined>] extends [never]
    ? { [K in Name]?: never }
    : undefined extends Raw
      ? { [K in Name]?: Exclude<Raw, undefined> }
      : { [K in Name]: Raw };

type JsonRequestBody<Operation> =
  Operation extends {
    requestBody: {
      content: {
        "application/json": infer Body;
      };
    };
  }
    ? Body
    : never;

type BodyField<Operation> =
  [JsonRequestBody<Operation>] extends [never]
    ? { body?: never }
    : { body: JsonRequestBody<Operation> };

type ResponseMap<Operation> =
  Operation extends { responses: infer Responses } ? Responses : never;

type SuccessfulResponse<Responses> = {
  [Status in keyof Responses]:
    Status extends number
      ? `${Status}` extends `2${string}`
        ? Responses[Status]
        : never
      : never;
}[keyof Responses];

type JsonResponseBody<Response> =
  Response extends {
    content: {
      "application/json": infer Body;
    };
  }
    ? Body
    : undefined;

export type ApiSuccessData<
  M extends ApiMethod,
  P extends ApiPath<M>,
> = JsonResponseBody<SuccessfulResponse<ResponseMap<OperationAt<P, M>>>>;

export type ApiRequestInput<
  M extends ApiMethod,
  P extends ApiPath<M>,
> =
  ParameterField<ParameterRaw<OperationAt<P, M>, "path">, "pathParams">
  & ParameterField<ParameterRaw<OperationAt<P, M>, "query">, "query">
  & ParameterField<ParameterRaw<OperationAt<P, M>, "header">, "headers">
  & BodyField<OperationAt<P, M>>
  & {
    signal?: AbortSignal;
    timeoutMs?: number;
  };

export type ApiSuccessResult<
  M extends ApiMethod,
  P extends ApiPath<M>,
> = {
  data: ApiSuccessData<M, P>;
  status: number;
  requestId: string | null;
  headers: Readonly<Record<string, string>>;
};
