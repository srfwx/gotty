export interface IResponseAdapter<T = unknown> {
  send(data: T): void;
}

export interface IResponsePayload<T = unknown> {
  reqId: string;
  status: number | null;
  data: T | null;
  error: string | null;
}

export interface IResponse<T = unknown, U = unknown> {
  send(data: U): this;

  status(code: number): this;

  getStatus(): number | null;

  data(value: T): this;

  error(value: string | null): this;

  toJson(): IResponsePayload<T>;
}

export class Response<T = unknown, U = unknown> implements IResponse {
  private _status: number | null = null;
  private _data: T | null = null;
  private _error: string | null = null;

  constructor(
    private readonly _reqId: string,
    private readonly _adapter: IResponseAdapter<U> | null = null,
  ) {}

  send(data: U): this {
    this._adapter?.send(data);
    return this;
  }

  status(code: number): this {
    this._status = code;
    return this;
  }

  getStatus(): number | null {
    return this._status;
  }

  data(value: T): this {
    this._data = value;
    return this;
  }
  error(value: string | null): this {
    this._error = value;
    return this;
  }

  toJson() {
    return {
      reqId: this._reqId,
      status: this._status,
      data: this._data,
      error: this._error,
    };
  }
}
