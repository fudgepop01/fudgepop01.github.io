<script lang="ts">
import { onMount, tick } from 'svelte';
import { each } from 'svelte/internal';
import { hostRootAddr } from '../helpers/hostRoot';
export let code;

let editorBase;

let monaco = window["monaco"];
let outFrame: HTMLIFrameElement;
let editor: monaco.editor.IStandaloneCodeEditor;
let editorHeight = 0;
let showConsole = false;
let messages = [];

onMount(async () => {
  editor = monaco.editor.create(editorBase, {
    language: "javascript",
    value: `${code}`,
    minimap: {
      enabled: false
    },
    automaticLayout: true,
    scrollBeyondLastLine: false
  });
  editorHeight = editor.getOption(monaco.editor.EditorOption.lineHeight) * (editor.getModel()?.getLineCount() || 1);
  editor.onDidContentSizeChange((e) => {
    editorHeight = editor.getOption(monaco.editor.EditorOption.lineHeight) * (editor.getModel()?.getLineCount() || 1);
  })
})

let cWin;

onMount(() => {
  cWin = outFrame.contentWindow as Window & typeof globalThis;
  cWin["winLog"] = (toPrint: any, ...args) => {
    if (typeof toPrint === "string" && toPrint.startsWith("%c")) toPrint = toPrint.substring(2); 
    else if (Array.isArray(toPrint)) toPrint = JSON.stringify(toPrint);
    else if (typeof toPrint === "object") toPrint = JSON.stringify(toPrint, null, 2);
    messages.push(toPrint);
  }
})

const runCode = () => {
  messages.length = 0;
  const editorCode = editor.getValue();
  let toRun = editorCode
    .replace(/\/\/\/(.+)\n/g, `console.log(\`%c///$1\`, "color: #008000");\n`)
    .replace(/(console\.log\((.+)\))/g, "$1\nwinLog($2)");
  
  cWin.document.head.innerHTML = `<style> body { margin: 0; padding: 0; } </style>`;
  cWin.document.body.innerHTML = "";
  cWin.eval(toRun);
}

</script>

<div on:click={runCode} class="runner">run code</div>
<div 
  bind:this={editorBase} 
  class="monaco"
  style="height: {editorHeight}px"
></div>
<div class="logger">
  <div class="log-header" on:click={() => showConsole = !showConsole}>{showConsole ? '-' : '+'} Console:</div>
  <div 
    class="log-data"
    style="max-height: {showConsole ? 150 : 2}px">
    {#each messages as msg}
      <span>{msg}</span>
    {/each}
  </div>
</div>
<iframe bind:this={outFrame} title="sandboxed playground" class="display-frame"></iframe>

<style>
  .monaco {
    max-height: 500px;
    border: 1px solid black;
  }
  .runner {
    background-color: black;
    color: white;
    text-align: center;
    line-height: 20px;
    width: 100%;
    height: 20px;
    border-radius: 2px;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border: 1px solid black;
    cursor: pointer;
  }
  .runner:hover {
    color: #888;
  }

  .display-frame {
    max-height: 500px;
    width: 100%;
    border: 1px solid black;
    border-radius: 2px;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }

  .logger {
    border: 1px solid black;
    width: 100%;
    background-color: #EEEEEE;
    font-family: monospace;
  }

  .log-header {
    background-color: black;
    color: white;
    padding-left: 5px;
    cursor: pointer;
  }

  .log-header:hover {
    color: #888;
  }

  .log-data {
    overflow-y: scroll;
    transition: max-height .2s ease-out;
  }

  .log-data span {
    display: block;
    white-space: pre;
    margin: 2px 5px;
  }

  .log-data span:not(:last-child)::after {
    content: '';
    display: block;
    width: 100%;
    height: 1px;
    margin: 0px -5px; 
    background-color: #AAA;
  }
</style>