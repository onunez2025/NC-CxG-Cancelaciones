import type { Request as SqlRequest } from 'mssql';
import sql from 'mssql';

type SqlTypeArg = Parameters<SqlRequest['input']>[1];

export function addInput<T>(
    request: SqlRequest,
    name: string,
    type: SqlTypeArg,
    value: T
): SqlRequest {
    return request.input(name, type, value);
}

export { sql };
