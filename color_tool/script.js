const colorDisplay = document.getElementById('colorBox');
const pasteButton = document.getElementById('paste');
const input = document.getElementById('in');
const inRed = { range: document.getElementById('in-red'), display: document.getElementById('in-red-display') };
const inGreen = { range: document.getElementById('in-green'), display: document.getElementById('in-green-display') };
const inBlue = { range: document.getElementById('in-blue'), display: document.getElementById('in-blue-display') };
const inSliders = [inRed, inGreen, inBlue];

const output = document.getElementById('out');
const rgbout = document.getElementById('rgb-out');
const separatorInput = document.getElementById('separator');
const parenthesisInput = document.getElementById('parenthesis');
const otherFormat = document.getElementById('other-select');
const otherResult = document.getElementById('other-out');
const copyExactButton = document.getElementById('copy-other-out-exact');

for (const [id, data] of Object.entries(Color.spaces)) {
  let colorSpaceOption = document.createElement('option');
  colorSpaceOption.value = id.replace(/-/g, '_');
  colorSpaceOption.innerText = data.name;
  otherFormat.appendChild(colorSpaceOption);
}

let otherFormatExact = '';
const updateOutput = () => {
  const rgb = 
    [ input.value.substring(0, 2),
      input.value.substring(2, 4),
      input.value.substring(4, 6) ];
  
  
  const rgbAsNums = rgb.map(v => parseInt(v, 16));
  const rgb01 = rgbAsNums.map(v => Math.round(v * 100 / 255) / 100).map(v => (v === 1) ? '1.000' : ((v === 0) ? '0.000' : v.toString().padEnd(5, '0'))).join(separatorInput.value);
  const rgbNum = rgbAsNums.join(separatorInput.value);

  for (const [idx, { range, display }] of Object.entries(inSliders)) {
    range.value = rgbAsNums[idx];
    display.innerText = rgbAsNums[idx];
  }

  output.value = parenthesisInput.checked ? `rgb01(${rgb01})` : rgb01;
  rgbout.value = parenthesisInput.checked ? `rgb(${rgbNum})` : rgbNum;
  colorDisplay.style.backgroundColor = '#' + rgb.join('');
  const otherResultDataExact = (new Color(`#${input.value}`))[otherFormat.value];
  otherFormatExact = parenthesisInput.checked ? `${otherFormat.value}(${otherResultDataExact.join(separatorInput.value)})` : otherResultDataExact.join(separatorInput.value);
  const otherResultDataRounded = otherResultDataExact.map(v => Math.round(v * 1000) / 1000);
  otherResult.value = parenthesisInput.checked ? `${otherFormat.value}(${otherResultDataRounded.join(separatorInput.value)})` : otherResultDataRounded.join(separatorInput.value);
};

const updateInputValue = () => {
  input.value = 
    parseInt(inRed.range.value).toString(16).padStart(2, '0')
    + parseInt(inGreen.range.value).toString(16).padStart(2, '0')
    + parseInt(inBlue.range.value).toString(16).padStart(2, '0');
  updateOutput();
}

copyExactButton.addEventListener('click', () => {
  navigator.clipboard.writeText(otherFormatExact);
})

let lastValidInput = '000000';
const testRegex = /#?[a-fA-F0-9]{3,6}/;
const inputInvalid = "invalid input";
separatorInput.addEventListener('change', updateOutput);
parenthesisInput.addEventListener('change', updateOutput);
otherFormat.addEventListener('change', updateOutput);

input.addEventListener('change', (evt) => {
  console.log(evt.target.value.length);
  if (![3, 6].includes(evt.target.value.length) || !testRegex.test(evt.target.value)) {
    evt.target.value = lastValidInput;
    return;
  }
  lastValidInput = evt.target.value;
  if (evt.target.value.length === 3) {
    evt.target.value = lastValidInput.charAt(0) + lastValidInput.charAt(0) + lastValidInput.charAt(1) + lastValidInput.charAt(1) + lastValidInput.charAt(2) + lastValidInput.charAt(2);
  }
  console.log(evt.target.value);
  updateOutput();
});

pasteButton.addEventListener('click', async (evt) => {
  let toInput = await navigator.clipboard.readText();
  if (!testRegex.test(toInput)) return console.error(inputInvalid);

  let output = '';
  switch(toInput.length) {
    case 3:
    case 4:
      if (toInput.length === 4) {
        toInput = toInput.substring(1);
      }
      output = toInput.charAt(0) + toInput.charAt(0) + toInput.charAt(1) + toInput.charAt(1) + toInput.charAt(2) + toInput.charAt(2); 
      break;
    
    case 6:
    case 7:
      if (toInput.length === 7) {
        toInput = toInput.substring(1);
      }
      output = toInput;
      break;
    default:
      console.error(inputInvalid);
      return;
  }

  input.value = output;
  updateOutput();
})

rgbout.addEventListener('focus', () => { rgbout.select(); })
output.addEventListener('focus', () => { output.select(); })
otherResult.addEventListener('focus', () => { otherResult.select(); })

for (const { range, display } of inSliders) {
  range.addEventListener('input', () => {
    display.innerText = range.value;
    updateInputValue();
  })
}

updateOutput();