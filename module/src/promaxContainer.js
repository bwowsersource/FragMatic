// https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements
import { INCLUDE_TAG } from "./constants";
import { makeKey } from "./utils";
import { dupeCheck, bindKey, promaxLookup } from "./treeTracker";
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

export function promaxify() {
  window.promaxFindCtx = (key) => {
    const { elmnt, ctx } = promaxLookup(key);
    return (componentHandler) => componentHandler(ctx);
  };
  customElements.define(INCLUDE_TAG, PromaxComponent);
}
