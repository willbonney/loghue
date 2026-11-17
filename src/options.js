const form = document.querySelector('#colors');
const status = document.querySelector('#status');
const { DEFAULT_COLORS, LABELS } = globalThis.Loghue;

function field(key, value) {
  const id = `color-${key}`;
  const label = document.createElement('label');
  label.htmlFor = id;
  label.textContent = LABELS[key] || key;
  const input = document.createElement('input');
  input.type = 'color';
  input.id = id;
  input.name = key;
  input.value = value;
  form.append(label, input);
}

async function readColors() {
  const stored = await chrome.storage.sync.get({ colors: DEFAULT_COLORS });
  return { ...DEFAULT_COLORS, ...(stored.colors || {}) };
}

function currentColors() {
  const colors = { ...DEFAULT_COLORS };
  for (const input of form.querySelectorAll('input[type="color"]')) {
    colors[input.name] = input.value;
  }
  return colors;
}

async function save(colors) {
  await chrome.storage.sync.set({ colors });
  status.textContent = 'Saved.';
}

async function init() {
  try {
    const colors = await readColors();
    for (const key of Object.keys(DEFAULT_COLORS)) field(key, colors[key]);
  } catch (err) {
    status.textContent = 'Could not read saved colors.';
    console.error(err);
  }
}

form.addEventListener('input', async () => {
  try {
    await save(currentColors());
  } catch (err) {
    status.textContent = 'Could not save colors.';
    console.error(err);
  }
});

document.querySelector('#reset').addEventListener('click', async () => {
  for (const input of form.querySelectorAll('input[type="color"]')) {
    input.value = DEFAULT_COLORS[input.name];
  }
  try {
    await save({ ...DEFAULT_COLORS });
    status.textContent = 'Colors reset.';
  } catch (err) {
    status.textContent = 'Could not reset colors.';
    console.error(err);
  }
});

init();
