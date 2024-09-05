import {ConnectionFactory} from "./websocket";
import {WebTTY, protocols} from "./webtty";
import {OurXterm} from "./xterm";

// @TODO remove these
declare var gotty_auth_token: string;
declare var gotty_term: string;
declare var gotty_ws_query_args: string;

function render(elem: HTMLElement) {
  const term = new OurXterm(elem);
  const httpsEnabled = window.location.protocol == "https:";
  let queryArgs = "";
  try {
    queryArgs = (gotty_ws_query_args === "") ? "" : "?" + gotty_ws_query_args;
  } catch (e) {
    console.log(e);
  }
  let authToken = "";
  try {
    authToken = gotty_auth_token;
  } catch (e) {
    console.log(e);
  }
  const url = (httpsEnabled ? 'wss://' : 'ws://') + window.location.host + window.location.pathname + 'ws' + queryArgs;
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
}

document.fonts.ready.then(() => {
  let elem = document.getElementById("terminal");
  if (elem == null) {
    alert("Missing <div id=\"terminal\" /> in body")
    throw Error("Missing <div id=\"terminal\" /> in body")
  }
  render(elem);
});
