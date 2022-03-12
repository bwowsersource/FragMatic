(function () {
  'use strict';

  const INCLUDE_TAG = "promax-include";

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

  const includeTree = {};

  function createCtx() {
    return {};
  }
  const dupeCheck = (key) => !includeTree[key];

  function bindKey(elmnt, key, src) {
    // const [,...path]=filePath.replace(/^(.*)\/$/, '$1').split('/');
    elmnt.setAttribute("included", key);
    includeTree[key] = { src, key, elmnt, ctx: createCtx() }; // not useful now
  }

  function promaxLookup(key) {
    const promaxBinding = includeTree[key];
    if (!promaxBinding) throw new Error("Promax binding not found");
    return { ...promaxBinding };
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
      window.promax = window.promaxFindCtx(bindKey);
      // const script = document.createElement("script");
      // script.textContent = `window.promax = window.promaxFindCtx('${bindKey}')`;
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
              bindKey(hostEl, renderKey, src);
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
    window.promaxFindCtx = (key) => {
      const { elmnt, ctx } = promaxLookup(key);
      return (componentHandler) => componentHandler(ctx);
    };
    customElements.define(INCLUDE_TAG, PromaxComponent);
  }

  window.promaxify = promaxify;

})();
