(function () {
    'use strict';

    var consts = {
        INCLUDE_TAG: "c-frame",
        INCLUDE_DEPTH: 99,
        COMPONENTSCRIPT_TAG: "c-script",
        COMPONENTSCRIPT_SCOPE_ATTR: "component"
    };

    const { INCLUDE_DEPTH } = consts;

    function depthBreak(depth) {
      if (depth > INCLUDE_DEPTH) {
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
    if(window.INIT_PROMAX===true) promaxify();

})();
