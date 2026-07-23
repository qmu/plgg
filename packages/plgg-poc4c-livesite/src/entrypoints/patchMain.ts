/**
 * The INJECTED bundle's entry (dist/patch.js). The proxy
 * splices a <script> tag pointing here into every proxied
 * plggpress page, in place of the dev server's own
 * live-reload script — so this is the one line that runs
 * inside the real rendered site.
 */
import { install } from "../patchClient.ts";

install();
