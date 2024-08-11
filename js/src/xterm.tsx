import {Terminal, IDisposable, ITerminalOptions, ITheme} from "xterm";
import {FitAddon} from '@xterm/addon-fit';
import {WebLinksAddon} from '@xterm/addon-web-links';
import {WebglAddon} from '@xterm/addon-webgl';
import {Unicode11Addon} from '@xterm/addon-unicode11';
import {ImageAddon} from "@xterm/addon-image"
import {ZModemAddon} from "./zmodem";

export interface ICmdSetTitle {
  command: "set_title";
  arg: string;
}

export interface ICmdRefresh {
  command: "refresh";
}

export interface ICmdRedirect {
  command: "redirect";
  arg: string;
}

export type ICommand = ICmdSetTitle | ICmdRefresh | ICmdRedirect;


const termOptions = {
  fontSize: 17,
  fontFamily: "'Source Code Variable', 'Noto Color Emoji', 'DejaVu Sans Mono', 'Everson Mono', FreeMono, 'Menlo', 'Terminal', monospace",
  macOptionClickForcesSelection: true,
  macOptionIsMeta: true,
  allowProposedApi: true,
  scrollback: 10000,
  smoothScrollDuration: 0,
  // fastScrollSensitivity: 1,
  scrollSensitivity: 0.5,
  mouseWheelScrollSensitivity: 0.25,
  theme: {
    foreground: '#d4d4d4',
    background: '#2e3131',
    cursor: '#ececec',
    black: '#2e3030',
    red: '#d81e00',
    green: '#5ea702',
    yellow: '#cfae00',
    blue: '#427ab3',
    magenta: '#89658e',
    cyan: '#00a7aa',
    white: '#dbded8',
    brightBlack: '#686a66',
    brightRed: '#f54235',
    brightGreen: '#99e343',
    brightYellow: '#fdeb61',
    brightBlue: '#84b0d8',
    brightMagenta: '#bc94b7',
    brightCyan: '#37e6e8',
    brightWhite: '#f1f1f0',
  } as ITheme,
} as ITerminalOptions;

export class OurXterm {
  // The HTMLElement that contains our terminal
  elem: HTMLElement;

  // The xtermjs.XTerm
  term: Terminal;

  resizeListener: () => void;

  message: HTMLElement;
  messageTimeout: number;
  messageTimer: NodeJS.Timeout;

  onResizeHandler: IDisposable;
  onDataHandler: IDisposable;

  fitAddOn: FitAddon;
  zmodemAddon: ZModemAddon;
  toServer: (data: string | Uint8Array) => void;
  encoder: TextEncoder

  constructor(elem: HTMLElement) {
    this.elem = elem;
    this.term = new Terminal(termOptions);
    this.fitAddOn = new FitAddon();
    this.zmodemAddon = new ZModemAddon({
      toTerminal: (x: Uint8Array) => this.term.write(x),
      toServer: (x: Uint8Array) => this.sendInput(x)
    });
    this.term.loadAddon(new WebLinksAddon());
    this.term.loadAddon(this.fitAddOn);
    this.term.loadAddon(new ImageAddon())
    this.term.loadAddon(this.zmodemAddon);
    this.term.loadAddon(new Unicode11Addon())
    this.term.unicode.activeVersion = "11";

    this.term.onTitleChange((value) => {
      try {
        const cmd = JSON.parse(value);
        if (typeof cmd !== "object") {
          throw new Error("Expected object, got " + typeof cmd);
        }
        const {command, arg} = cmd;
        switch (command) {
          case "set_title":
            document.title = arg;
            break
          case "refresh":
            location.reload();
            break;
          case "redirect":
            location.replace(arg);
            break;
        }
      } catch (e) {
        console.debug("Invalid command", value);
      }

    })

    this.message = elem.ownerDocument.createElement("div");
    this.message.className = "xterm-overlay";
    this.messageTimeout = 2000;

    this.resizeListener = () => {
      this.fitAddOn.fit();
      this.term.scrollToBottom();
      this.showMessage(String(this.term.cols) + "x" + String(this.term.rows), this.messageTimeout);
    };

    this.term.open(elem);
    this.term.focus();
    this.resizeListener();

    window.addEventListener("resize", () => {
      this.resizeListener();
    });
  };

  info(): { columns: number, rows: number } {
    return {columns: this.term.cols, rows: this.term.rows};
  };

  // This gets called from the Websocket's onReceive handler
  output(data: Uint8Array) {
    this.zmodemAddon.consume(data);
  };

  getMessage(): HTMLElement {
    return this.message;
  }

  showMessage(message: string, timeout: number) {
    this.message.innerHTML = message;
    this.showMessageElem(timeout);
  }

  showMessageElem(timeout: number) {
    this.elem.appendChild(this.message);

    if (this.messageTimer) {
      clearTimeout(this.messageTimer);
    }
    if (timeout > 0) {
      this.messageTimer = setTimeout(() => {
        try {
          this.elem.removeChild(this.message);
        } catch (error) {
          console.error(error);
        }
      }, timeout);
    }
  };

  removeMessage(): void {
    if (this.message.parentNode == this.elem) {
      this.elem.removeChild(this.message);
    }
  }

  setWindowTitle(title: string) {
    document.title = title;
  };

  setPreferences(value: object) {
    Object.keys(value).forEach((key) => {
      if (key == "EnableWebGL" && key) {
        this.term.loadAddon(new WebglAddon());
      } else if (key == "font-size") {
        this.term.options.fontSize = value[key]
      } else if (key == "font-family") {
        this.term.options.fontFamily = value[key]
      }
    });
  };

  sendInput(data: Uint8Array) {
    return this.toServer(data)
  }

  onInput(callback: (input: string) => void) {
    this.encoder = new TextEncoder()
    this.toServer = callback;

    // I *think* we're ok like this, but if not, we can dispose
    // of the previous handler and put the new one in place.
    if (this.onDataHandler !== undefined) {
      return
    }

    this.onDataHandler = this.term.onData((input) => {
      this.toServer(this.encoder.encode(input));
    });
  };

  onResize(callback: (colmuns: number, rows: number) => void) {
    this.onResizeHandler = this.term.onResize(() => {
      callback(this.term.cols, this.term.rows);
    });
  };

  deactivate(): void {
    this.onDataHandler.dispose();
    this.onResizeHandler.dispose();
    this.term.blur();
  }

  reset(): void {
    this.removeMessage();
    this.term.clear();
  }

  close(): void {
    window.removeEventListener("resize", this.resizeListener);
    this.term.dispose();
  }

  disableStdin(): void {
    this.term.options.disableStdin = true;
  }

  enableStdin(): void {
    this.term.options.disableStdin = false;
  }

  focus(): void {
    this.term.focus();
  }
}
