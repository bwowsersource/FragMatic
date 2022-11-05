import { depthBreak } from "./utils";

var htmlPromax = {};
(() => {
  const includeTree = {};
  const dupeCheck = (key) => !includeTree[key];

  function makeKey(dupeCheck, depth = 0) {
    depthBreak(depth);
    const key = btoa(Math.random().toString()).substring(2, 10);
    if (dupeCheck(key)) return key;
    return makeKey(dupeCheck, depth + 1);
  }
  function bindKey(elmnt, key, filePath) {
    // const [,...path]=filePath.replace(/^(.*)\/$/, '$1').split('/');
    elmnt.setAttribute("included", key);
    includeTree[key] = { src: filePath, key }; // not useful now
  }

  // copied from here >> https://www.w3schools.com/howto/howto_html_include.asp
  function includeHTML(count = 0) {
    depthBreak(count);
    var z, i, elmnt, file, xhttp;
    /* Loop through a collection of all HTML elements: */
    elements = document.getElementsByTagName("include");
    Array.from(elements).forEach((elmnt) => {
      if (elmnt.getAttribute("included")) return;
      /*search for elements with a certain atrribute:*/
      file = elmnt.getAttribute("src");
      if (file) {
        /* Make an HTTP request using the attribute value as the file name: */
        xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
          if (this.readyState == 4) {
            if (this.status == 200) {
              elmnt.innerHTML = this.responseText;
            }
            if (this.status == 404) {
              throw new Error("Page not found.");
            }
            /* Remove the attribute, and call this function once more: */
            //   elmnt.removeAttribute("w3-include-html");
            bindKey(elmnt, makeKey(dupeCheck), file, ctx);
            includeHTML(count + 1);
          }
        };
        xhttp.open("GET", file, true);
        xhttp.send();
        /* Exit the function: */
        return;
      }
    });
  }

  htmlPromax.start = includeHTML;
})();
