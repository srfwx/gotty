import { WebTTY } from "./webtty";

type IRouteMethod = "get" | "post" | "delete";

interface IMessagePayload<T = unknown> {
  id: string;
  path: string;
  method: IRouteMethod;
  body: T | null;
}

type IRequest<T = unknown> = IMessagePayload<T>;

type IRouteHandler<T = unknown, U = unknown> = (
  req: IRequest<T>,
  res: Response<U>,
) => void;

export class Response<T = unknown> {
  private _status: number | null = null;
  private _data: T;

  constructor(
    private readonly _reqId: string,
    readonly webTTY: WebTTY,
  ) {}

  send(input: string | Uint8Array): this {
    this.webTTY.sendInput(input);
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

  toJson() {
    return {
      reqId: this._reqId,
      status: this._status,
      data: this._data,
    };
  }
}

const MessagePayloadProps: Set<keyof IMessagePayload> = new Set([
  "id",
  "path",
  "method",
  "body",
]);

export function isMessagePayload(data: unknown): data is IMessagePayload {
  return (
    data != null && MessagePayloadProps.isSubsetOf(new Set(Object.keys(data)))
  );
}

export class MessageRouter {
  _routeHandlers: Record<IRouteMethod, Record<string, IRouteHandler>> = {
    get: {},
    post: {},
    delete: {},
  };

  constructor(private readonly webTTY: WebTTY) {}

  get<Response = unknown, Args = unknown>(
    path: string,
    routeHandler: IRouteHandler<Args, Response>,
  ): this {
    this._routeHandlers.get[path] = routeHandler;
    return this;
  }

  post<Args = unknown, Response = unknown>(
    path: string,
    routeHandler: IRouteHandler<Args, Response>,
  ): this {
    this._routeHandlers.post[path] = routeHandler;
    return this;
  }

  del<Response = unknown>(
    path: string,
    routeHandler: IRouteHandler<unknown, Response>,
  ): this {
    this._routeHandlers.delete[path] = routeHandler;
    return this;
  }

  private async route(data: IMessagePayload): Promise<Response> {
    const { id, path, method } = data;
    const res = new Response(id, this.webTTY);
    const handler = this._routeHandlers[method.toLowerCase()][path];
    if (handler) {
      try {
        await handler(data, res);
        if (res.getStatus() == null) {
          res.status(200);
        }
      } catch (e) {
        res.status(500).data({ error: e });
      }
    } else {
      res.status(404).data({ error: "not found" });
    }
    return res;
  }

  listen(): () => void {
    const listener = async (event: MessageEvent<unknown>) => {
      if (!isMessagePayload(event.data)) {
        console.error("invalid message");
        return;
      }
      const res = await this.route(event.data);
      event.source?.postMessage(res.toJson(), { targetOrigin: event.origin });
    };
    window.addEventListener("message", listener);
    console.log("Listening incoming messages");
    return () => window.removeEventListener("message", listener);
  }
}
