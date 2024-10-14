import { IResponseAdapter, Response } from "./response";

const MessagePayloadProps: Set<keyof IRequest> = new Set([
  "id",
  "path",
  "method",
  "body",
]);

type IRouteMethod = "get" | "post" | "put" | "delete";

export interface IRequest<T = unknown> {
  id: string;
  path: string;
  method: IRouteMethod;
  body: T | null;
}

export type IRouteHandler<T = unknown, U = unknown> = (
  req: IRequest<T>,
  res: Response<U>,
) => Promise<void> | void;

export interface IRouter {
  get<Response = unknown>(
    path: string,
    routeHandler: IRouteHandler<null, Response>,
  ): this;

  post<Request = unknown, Response = unknown>(
    path: string,
    routeHandler: IRouteHandler<Request, Response>,
  ): this;

  put<Request = unknown, Response = unknown>(
    path: string,
    routeHandler: IRouteHandler<Request, Response>,
  ): this;

  del<Response = unknown>(
    path: string,
    routeHandler: IRouteHandler<null, Response>,
  ): this;

  listen(): () => void;
}

export class MessageRouter implements IRouter {
  private readonly _routeHandlers: Record<
    IRouteMethod,
    Record<string, IRouteHandler<any, any>>
  > = {
    get: {},
    post: {},
    put: {},
    delete: {},
  };

  constructor(private readonly _adapter: IResponseAdapter | null = null) {}

  private _isMessagePayload(data: unknown): data is IRequest {
    return (
      data != null && MessagePayloadProps.isSubsetOf(new Set(Object.keys(data)))
    );
  }
  get<Response = unknown>(
    path: string,
    routeHandler: IRouteHandler<null, Response>,
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

  put<Request = unknown, Response = unknown>(
    path: string,
    routeHandler: IRouteHandler<Request, Response>,
  ): this {
    this._routeHandlers.put[path] = routeHandler;
    return this;
  }

  del<Response = unknown>(
    path: string,
    routeHandler: IRouteHandler<null, Response>,
  ): this {
    this._routeHandlers.delete[path] = routeHandler;
    return this;
  }

  listen(): () => void {
    window.addEventListener("message", this._listener.bind(this), {
      passive: true,
    });
    console.log("Listening incoming messages");
    return () => window.removeEventListener("message", this._listener);
  }

  private async _route(data: IRequest): Promise<Response> {
    const { id, path, method } = data;
    const res = new Response(id, this._adapter);
    const handler =
      this._routeHandlers[method.toLowerCase() as IRouteMethod][path];
    if (handler) {
      try {
        await handler(data, res);
        if (res.getStatus() == null) {
          res.status(200);
        }
      } catch (e) {
        const error_message = e instanceof Error ? e.message : "unknown error";
        res.status(500).error(error_message);
      }
    } else {
      res.status(404).error("not found");
    }
    return res;
  }

  private async _listener(event: MessageEvent<unknown>) {
    if (!this._isMessagePayload(event.data)) {
      // not a message for us, ex: React dev tools send messages
      return;
    }
    const res = await this._route(event.data);
    // reply back to the sender
    event.source?.postMessage(res.toJson(), { targetOrigin: event.origin });
  }
}
