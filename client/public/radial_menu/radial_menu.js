function createElement(tag, attributes = {}) {
  let el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (let a in attributes)
    el.setAttribute(a, attributes[a]);
  return el;
}

function spin(r, a, d = 0) {
  a += d / r
  return [R - r * Math.cos(a), R - r * Math.sin(a)]
}
function spinO(r, a, d = 0) {
  a += d / r
  return {x: R - r * Math.cos(a), y: R - r * Math.sin(a)}
}

const R = 350;
const COLORS_NAMES = ['Black', 'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple']
const COLORS_HEX = ['#000000', '#ff0000', '#f8972c', '#ffff00', '#149618', '#353eff', '#dd09bf'];

const SHAPES = ['Circle', 'Arrow', 'Triangle', 'Rectangle']

const N_SHAPES = SHAPES.length;

const N = COLORS_NAMES.length;
const SLICE_ANGLE = (Math.PI * 1.2) / N
const COLORS_START_ANGLE = -(SLICE_ANGLE * N - Math.PI) / 2

const r1 = R / 3;
const r2 = R / 3 * 2;
const r3 = R / 3 * 2.55;
const r4 = R / 3 * 2.9;

let menu = createElement('svg', {width: 2 * R, height: 2 * R});

{ // Close button

  let close_button = createElement('g', {class: 'close_button'})

  // Center Circle
  close_button.appendChild(createElement('circle', {cx: R, cy: R, r: R / 3}));

  // Center X icon
  const path_x = `
    M ${R * 0.93} ${R * 0.93}
    L ${R * 1.07} ${R * 1.07}
    M ${R * 1.07} ${R * 0.93}
    L ${R * 0.93} ${R * 1.07}
  `;
  close_button.appendChild(createElement('path', {class: "", stroke: "red", 'stroke-width': R * 0.04, 'stroke-linecap': "round", d: path_x}));

  menu.appendChild(close_button);
}

// Colors
for (let i = 0; i < N; i++) {
  let part = createElement('g', {class: "color_slice"});

  // Main color slice
  const a1 = SLICE_ANGLE * i + COLORS_START_ANGLE;
  const a2 = SLICE_ANGLE * (i + 1) + COLORS_START_ANGLE;
  const a = (a1 + a2) / 2;

  let pen = createElement('g', {class: 'pen'});
  
  // Color slice
  let path1 = `
    M ${spin(r1, a2)}
    A ${r1} ${r1} 0 0 0 ${spin(r1, a1)}
    L ${spin(r2, a1)}
    A ${r2} ${r2} 0 0 1 ${spin(r2, a2)}
  `;
  pen.appendChild(createElement('path', {class: "", d: path1, fill: COLORS_HEX[i]}));

  // Pen icon
  const iconSize = R / 6
  const ai = a + 0.03
  pen.appendChild(createElement('image', {
    href: `icons/Tool_Pen_${COLORS_NAMES[i]}.png`,
    transform: `rotate(${30 + ai / Math.PI * 180} ${spin((r1 + r2) / 2, ai)}) translate(${-iconSize / 2}, ${-iconSize / 2})`,
    height: iconSize, width: iconSize,
    ...spinO((r1 + r2) / 2, ai)
  }))

  let highlighter = createElement('g', {class: 'button_group'});

  // Highlighter shape
  let path2 = `
    M ${spin(r2, a2)}
    A ${r2} ${r2} 0 0 0 ${spin(r2, a1)}
    L ${spin(r3, a1)}
    A ${r3} ${r3} 0 0 1 ${spin(r3, a2)}
  `;
  highlighter.appendChild(createElement('path', {class: "button", d: path2}));

  // Highlighter icon
  highlighter.appendChild(createElement('image', {
    href: `icons/Tool_Highlighter_${COLORS_NAMES[i]}.png`,
    transform: `rotate(${320 + ai / Math.PI * 180} ${spin((r2 + r3) / 2, ai)}) translate(${-iconSize / 2}, ${-iconSize / 2})`,
    height: iconSize, width: iconSize,
    ...spinO((r2 + r3) / 2, ai)
  }))

  for (let j = 0; j < N_SHAPES; j++) {
    const ang1 = a1 + SLICE_ANGLE / N_SHAPES * j
    const ang2 = a1 + SLICE_ANGLE / N_SHAPES * (j + 1)
    const ang = a1 + SLICE_ANGLE / N_SHAPES * (j + 0.5)

    let g = createElement('g', {class: 'button_group'});

    let path3 = `
      M ${spin(r3, ang2)}
      A ${r3} ${r3} 0 0 0 ${spin(r3, ang1)}
      L ${spin(r4, ang1)}
      A ${r4} ${r4} 0 0 1 ${spin(r4, ang2)}
    `;
    g.appendChild(createElement('path', {class: "", d: path3}));

    const iconSize = R / 18
    g.appendChild(createElement('image', {
      href: `icons/${SHAPES[j]}_${COLORS_NAMES[i]}.png`,
      transform: `rotate(${270 + ang / Math.PI * 180} ${spin((r3 + r4) / 2, ang)}) translate(${-iconSize / 2}, ${-iconSize / 2})`,
      height: iconSize, width: iconSize,
      ...spinO((r3 + r4) / 2, ang)
    }))

    part.appendChild(g);
  }

  part.appendChild(pen);
  part.appendChild(highlighter);
  menu.appendChild(part);
}

// Eraser
{
  const a1 = COLORS_START_ANGLE - SLICE_ANGLE;
  const a2 = COLORS_START_ANGLE;
  const a = (a1 + a2) / 2;

  let eraser = createElement('g', {class: 'tool_button'});
    
  // Eraser slice
  let path_e = `
    M ${spin(r1, a2)}
    A ${r1} ${r1} 0 0 0 ${spin(r1, a1)}
    L ${spin(r2, a1)}
    A ${r2} ${r2} 0 0 1 ${spin(r2, a2)}
  `;
  eraser.appendChild(createElement('path', {class: "", d: path_e}));

  // Eraser icon
  const iconSize = R / 6
  const ai = a + 0.03
  eraser.appendChild(createElement('image', {
    href: `icons/Tool_Eraser.png`,
    transform: `translate(${-iconSize / 2}, ${-iconSize / 2})`,
    height: iconSize, width: iconSize,
    ...spinO((r1 + r2) / 2, ai)
  }));

  menu.appendChild(eraser);
}

// Selection
{
  const a1 = COLORS_START_ANGLE + SLICE_ANGLE * N;
  const a2 = COLORS_START_ANGLE + SLICE_ANGLE * (N + 1);
  const a = (a1 + a2) / 2;

  let eraser = createElement('g', {class: 'tool_button'});
    
  // Eraser slice
  let path_e = `
    M ${spin(r1, a2)}
    A ${r1} ${r1} 0 0 0 ${spin(r1, a1)}
    L ${spin(r2, a1)}
    A ${r2} ${r2} 0 0 1 ${spin(r2, a2)}
  `;
  eraser.appendChild(createElement('path', {class: "", d: path_e}));

  // Eraser icon
  const iconSize = R / 7
  const ai = a
  eraser.appendChild(createElement('image', {
    href: `icons/Tool_Selection.png`,
    transform: `translate(${-iconSize / 2}, ${-iconSize / 2})`,
    height: iconSize, width: iconSize,
    ...spinO((r1 + r2) / 2, ai)
  }));

  menu.appendChild(eraser);
}

function AddOptionButton(img, angle) {
  const iconSize = R / 12;
  const [x, y] = spin((r1 + r2) / 2, angle);
  
  let settings = createElement('g', {class: 'option_button'});

  settings.appendChild(createElement('circle', {
    cx: x, cy: y, r: iconSize * 0.8
  }));
  
  settings.appendChild(createElement('image', {
    href: img,
    transform: `translate(${-iconSize / 2}, ${-iconSize / 2})`,
    height: iconSize, width: iconSize,
    x: x, y: y
  }));

  menu.appendChild(settings);
}

AddOptionButton('icons/Redo.png', Math.PI * 1.63);
AddOptionButton('icons/Tool_Settings.png', Math.PI * 1.5);
AddOptionButton('icons/Undo.png', Math.PI * 1.37);

document.body.appendChild(menu);