import { strings } from './strings.js';
export class ApiFailure extends Error {
  constructor(readonly code: string, readonly status: number) { super(strings.routines.requestError); this.name = 'ApiFailure'; }
}
