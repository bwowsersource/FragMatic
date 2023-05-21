import { promaxify } from "./src/promaxContainer";
window.promaxify = promaxify;
if(window.INIT_PROMAX===true) promaxify();