(function () {
  'use strict';

  const INCLUDE_TAG = "p-frame";

  function depthBreak(depth) {
    if (depth > 99) {
      throw new Error("Maximum include depth reached!!");
    }
  }

  function makeKey(dupeCheck, depth = 0) {
    depthBreak(depth);
    const key = btoa(Math.random().toString()).substring(2, 10);
    if (dupeCheck(key)) return key;
    return makeKey(dupeCheck, depth + 1);
  }

  function memoRenderer() {
    let lastArgsMap = new Map();
    return function (name, args, renderer) {
      const lastArgs = lastArgsMap.get(name);
      if (
        lastArgs &&
        lastArgs.every((lastArg, i) => args[i] === lastArg)
        // skip render if value is undefined
      ) {
        return; //dont render
      }
      lastArgsMap.set(name, args);
      renderer();
    };
  }

  const includeTree = {};
  const rootMap = new WeakMap();
  function createCtx() {
    return {};
  }
  const dupeCheck = (key) => !includeTree[key];

  function bindKey(elmnt, key) {
    // const [,...path]=filePath.replace(/^(.*)\/$/, '$1').split('/');
    const src = elmnt.getAttribute("src");
    const shadowRoot = elmnt.shadowRoot;
    elmnt.setAttribute("included", key);
    includeTree[key] = { src, key, elmnt, ctx: createCtx(), shadowRoot }; // not useful now
    rootMap.set(shadowRoot, key);
  }

  function promaxLookup(key) {
    const promaxBinding = includeTree[key];
    if (!promaxBinding) throw new Error("Promax binding not found");
    return { ...promaxBinding };
  }

  function promaxLookupByRoot(shadowRoot) {
    const key = rootMap.get(shadowRoot);
    return promaxLookup(key);
  }

  // https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements
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
      if (window.promax) {
        this.parentCtxHandler = window.promax;
      }
      window.promax = window.promaxGetInitializer(bindKey);
      // const script = document.createElement("script");
      // script.textContent = `window.promax = window.promaxGetInitializer('${bindKey}')`;
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
      delete window.promax;
      if (this.parentCtxHandler) {
        window.promax = this.parentCtxHandler;
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
              bindKey(hostEl, renderKey);
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

  function promaxify() {
    window.pscope = new Proxy(
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

    window.promaxGetInitializer = (key) => {
      const { elmnt, ctx } = promaxLookup(key);

      function initState(initialState) {
        let _state = { ...initialState };
        let patchDom = () => {
          console.log("Skipping pre-register render call.");
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

  window.promaxify = promaxify;

})();
