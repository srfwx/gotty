import { ConnectionFactory } from "./websocket";
import { protocols, WebTTY } from "./webtty";
import { OurXterm } from "./xterm";
import { MessageRouter } from "./message_router";

// @TODO remove these
declare var gotty_auth_token: string;
declare var gotty_term: string;
declare var gotty_ws_query_args: string;
declare var PRODUCTION: boolean;
declare var GOTTY_VERSION: string;

console.debug("gotty:version:", GOTTY_VERSION);

function render(elem: HTMLElement): [WebTTY, () => void] {
  const term = new OurXterm(elem);
  const httpsEnabled = window.location.protocol == "https:";
  let queryArgs = "";
  try {
    queryArgs = gotty_ws_query_args === "" ? "" : "?" + gotty_ws_query_args;
  } catch (e) {
    console.error("gotty:render:error getting gotty_ws_query_args", e);
  }
  let authToken = "";
  try {
    authToken = gotty_auth_token;
  } catch (e) {
    console.error("gotty:render:error getting gotty_auth_token", e);
  }
  const url = (httpsEnabled ? "wss://" : "ws://") +
    window.location.host +
    window.location.pathname +
    "ws" +
    queryArgs;
  const args = window.location.search;
  const factory = new ConnectionFactory(url, protocols);
  const wt = new WebTTY(term, factory, args, authToken);
  const closer = wt.open();

  // According to https://developer.mozilla.org/en-US/docs/Web/API/Window/unload_event
  // this event is unreliable and in some cases (Firefox is mentioned), having an
  // "unload" event handler can have unwanted side effects. Consider commenting it out.
  window.addEventListener("unload", () => {
    closer();
    term.close();
  });
  history.replaceState({}, "", location.origin);
  return [wt, closer];
}

function main() {
  let elem = document.getElementById("terminal");
  if (elem == null) {
    alert('Missing <div id="terminal" /> in body');
    throw Error('Missing <div id="terminal" /> in body');
  }
  const [webTTY, closer] = render(elem);
  if (!PRODUCTION) {
    globalThis.webTTY = webTTY;
  }
  const router = new MessageRouter();
  if (window !== window.parent) {
    router.listen();
  }
  router
    .get<{ app: string }>("/status", (req, res) => {
      res.data({ app: "toolbox" });
    })
    .post<string[]>("/command", (req, res) => {
      if (req.body) {
        webTTY.term.scrollToBottom();
        for (const command of req.body) {
          webTTY.sendInput(`${command}\n`);
        }
      }
    })
    .post("/focus", (req, res) => {
      webTTY.term.focus();
    })
    .del("/connection", (req, res) => {
      closer();
    })
    .get<{ open: boolean }>("/connection", (req, res) => {
      res.data({ open: webTTY.isOpen });
    });
}


document.fonts.ready.then((fonts) => {
  fonts.forEach((font) =>
    console.debug("gotty:loaded font:", font.family, font.style, font.weight)
  );
  main();
  console.debug("gotty:READY");
});
