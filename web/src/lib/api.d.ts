export declare function apiGet<T>(path: string, options?: {
    signal?: AbortSignal;
}): Promise<T>;
export declare function apiPost<T>(path: string, body: any): Promise<T>;
export declare function apiPut<T>(path: string, body: any): Promise<T>;
export declare function apiPatch<T>(path: string, body: any): Promise<T>;
export declare function apiDelete<T>(path: string): Promise<T>;
/**
 * Like apiPost but routes through the Next.js API proxy (relative URL, no BACKEND_URL base).
 * Use this for any endpoint that has a matching /app/api/... proxy route.
 */
export declare function proxyPost<T>(path: string, body: any): Promise<T>;
export declare function apiUpload<T>(path: string, form: FormData): Promise<T>;
//# sourceMappingURL=api.d.ts.map