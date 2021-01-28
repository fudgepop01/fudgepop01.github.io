<script lang="ts">
import { onMount, tick } from 'svelte';
import { hostRootAddr } from '../helpers/hostRoot';
export let code;

let editorBase;

let monaco = window["monaco"];
let editor: monaco.editor.IStandaloneCodeEditor;
let editorHeight = 0;
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

const runCode = () => {
  const editorCode = editor.getValue();
  let toRun = editorCode.replace(/\/\/\/(.+)\n/g, `console.log(\`%c///$1\`, "color: #008000");\n`);
  eval(toRun);
}

</script>

<div on:click={runCode} class="runner">run code</div>
<div 
  bind:this={editorBase} 
  class="monaco"
  style="height: {editorHeight}px"
></div>

<style>
  .monaco {
    max-height: 500px;
    border: 1px solid black;
    border-radius: 2px;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
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
</style>