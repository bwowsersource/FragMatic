// https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements
import consts from "./constants";
import { makeKey, memoRenderer } from "./utils";
import {
  dupeCheck,
  bindKey,
  promaxLookup,
  promaxLookupByRoot,
} from "./treeTracker";

const { INCLUDE_TAG } =consts;
class PromaxComponent extends HTMLElement {
  loaded = false;
  parentCtxHandler = null;
  constructor(mode = "open") {
    // Always call super first in constructor
    super();
    this.attachShadow({ mode }); // sets and returns 'this.shadowRoot'
  }
  connectedCallback() {
    this.includeHTML();
  }

  insertCtx(bindKey) {
    if (window.component) {
      this.parentCtxHandler = window.component;
    }
    window.component = window.GetComponentInitializer(bindKey);
    // const script = document.createElement("script");
    // script.textContent = `window.component = window.GetComponentInitializer('${bindKey}')`;
  }

  induceExec() {
    const scripts = this.shadowRoot.querySelectorAll("script");
    scripts.forEach((script) => {
      const newScript = document.createElement("script");
      newScript.textContent = script.textContent;
      script.parentNode.replaceChild(newScript, script);
    });
  }
  removeCtx() {
    delete window.component;
    if (this.parentCtxHandler) {
      window.component = this.parentCtxHandler;
    }
  }

  // copied from here >> https://www.w3schools.com/howto/howto_html_include.asp
  includeHTML() {
    const hostEl = this;
    let src;
    /* Loop through a collection of all HTML elements: */
    const elmnt = this.shadowRoot;
    if (this.loaded) return;
    /*search for elements with a certain atrribute:*/
    src = this.getAttribute("src");
    if (src) {
      /* Make an HTTP request using the attribute value as the file name: */
      const xhttp = new XMLHttpRequest();
      xhttp.onreadystatechange = function () {
        if (this.readyState == 4) {
          if (this.status == 200) {
            const renderKey = makeKey(dupeCheck);
            bindKey(hostEl, renderKey, elmnt);
            // insert component handler
            hostEl.insertCtx(renderKey);
            elmnt.innerHTML = this.responseText;
            hostEl.induceExec();
            hostEl.removeCtx();
          }
          if (this.status == 404) {
            throw new Error("Page not found.");
          }
        }
      };
      xhttp.open("GET", src, true);
      xhttp.send();
      /* Exit the function: */
      return;
    }
  }
}

export function promaxify() {
  // proxy object that can be used in html event attributes using a magic global called $controller.
  // It can only be used in place of event handler attributes.
  // the higherOrder function can find the mapping from clicked element to a registered controller and call the handler from there
  window.$controller = new Proxy(
    {},
    {
      get: (t, scopeKey) => {
        return (e) => {
          const targetEl = e.target;
          if (!targetEl) {
            throw new Error(
              "scope methods can only be used for event handlers"
            );
          }
          const root = targetEl.getRootNode();
          const { ctx } = promaxLookupByRoot(root);
          const handler = ctx.scope[scopeKey];
          handler(e);
          // ctx.patchDom && ctx.patchDom();
        };
      },
    }
  );


  // returns the starting point of a new controller chain. 
  // each controller generated controller-chain is registered to a lookup hashtable
  // key parameter is used to identify existing controller and create if not existing.
  // Key must be unique. Promax generates unique ids for each attached component
  window.GetComponentInitializer = (key) => {
    const { elmnt, ctx } = promaxLookup(key);

    function initState(initialState) {
      let _state = { ...initialState };
      let patchDom = () => {
        if ("logging") console.log("Skipping pre-register render call.");
      };
      const setRenderer = (renderer) => {
        const memo = memoRenderer();
        patchDom = (initState) => {

          _state = { ..._state, ...initState };
          renderer({
            memo,
            state: _state,
            root: elmnt.shadowRoot,
          });
        };
        patchDom(_state); // just to invoke renderer()
        ctx.patchDom = patchDom;
        return { attachScope };
      };
      const attachScope = (createContext) => {
        const scope = createContext({
          getState: ()=>_state,
          patchDom,
        });
        Object.freeze(scope);
        ctx.scope = scope;
      };
      return { setRenderer };
    }
    return { initState };
  };
  customElements.define(INCLUDE_TAG, PromaxComponent);
}
