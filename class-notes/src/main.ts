import App from './App.svelte';
import loader from '@monaco-editor/loader';
import 'handsontable/dist/handsontable.full.min.css';

import hljs from 'highlight.js/lib/core';
import 'highlight.js/styles/github.css';
import javascript from 'highlight.js/lib/languages/javascript';
import java from 'highlight.js/lib/languages/java';
import json from 'highlight.js/lib/languages/json';
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('java', java);
hljs.registerLanguage('json', json);
window['hljs'] = hljs;

loader.init().then(monaco => {
	window["monaco"] = monaco;
})

const app = new App({
	target: document.body
});

export default app;