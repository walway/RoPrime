function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function percentForValue(value, min, max) {
  if (max <= min) return 0;
  return ((value - min) / (max - min)) * 100;
}

function nearestMarkValue(raw, marks) {
  const value = Number(raw);
  if (Number.isNaN(value) || !marks.length) return marks[0]?.value ?? 0;
  let nearest = marks[0].value;
  let nearestDistance = Math.abs(value - nearest);
  for (const mark of marks) {
    const distance = Math.abs(value - mark.value);
    if (distance < nearestDistance) {
      nearest = mark.value;
      nearestDistance = distance;
    }
  }
  return nearest;
}

function findSliderInput(root) {
  const input = root?.querySelector("input[type='range']");
  return input instanceof HTMLInputElement ? input : null;
}

function syncSliderVisual(root, value) {
  const input = findSliderInput(root);
  if (!input) return;

  const min = Number(input.min);
  const max = Number(input.max);
  const percent = percentForValue(value, min, max);

  const track = root.querySelector(".MuiSlider-track");
  if (track instanceof HTMLElement) track.style.width = `${percent}%`;

  const thumb = root.querySelector(".MuiSlider-thumb");
  if (thumb instanceof HTMLElement) thumb.style.left = `${percent}%`;

  root.querySelectorAll(".MuiSlider-mark").forEach((mark) => {
    if (!(mark instanceof HTMLElement)) return;
    const markValue = Number(mark.dataset.value);
    mark.classList.toggle("MuiSlider-markActive", markValue <= value);
  });

  root.querySelectorAll(".MuiSlider-markLabel").forEach((label) => {
    if (!(label instanceof HTMLElement)) return;
    const markValue = Number(label.dataset.value);
    label.classList.toggle("MuiSlider-markLabelActive", markValue === value);
  });
}

export function createMarkedSlider(options = {}) {
  const {
    id = "",
    min = 0,
    max = 100,
    step = 1,
    value = min,
    marks = [],
    disabled = false,
    ariaLabel = "",
    onChange,
  } = options;

  const root = document.createElement("div");
  root.className = "MuiSlider-root roprime-mui-slider";
  root.setAttribute("data-roprime-marked-slider", "1");

  const rail = document.createElement("span");
  rail.className = "MuiSlider-rail";
  rail.setAttribute("aria-hidden", "true");

  const track = document.createElement("span");
  track.className = "MuiSlider-track";
  track.setAttribute("aria-hidden", "true");

  const input = document.createElement("input");
  input.type = "range";
  input.className = "MuiSlider-input";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  if (id) input.id = id;
  if (ariaLabel) input.setAttribute("aria-label", ariaLabel);
  if (disabled) {
    input.disabled = true;
    input.setAttribute("aria-disabled", "true");
    root.classList.add("Mui-disabled");
  }

  const thumb = document.createElement("span");
  thumb.className = "MuiSlider-thumb";
  thumb.setAttribute("aria-hidden", "true");

  const marksWrap = document.createElement("div");
  marksWrap.className = "MuiSlider-marks";

  for (const mark of marks) {
    const left = `${percentForValue(mark.value, min, max)}%`;

    const markDot = document.createElement("span");
    markDot.className = "MuiSlider-mark";
    markDot.dataset.value = String(mark.value);
    markDot.style.left = left;
    markDot.setAttribute("aria-hidden", "true");
    marksWrap.appendChild(markDot);

    if (mark.label) {
      const markLabel = document.createElement("span");
      markLabel.className = "MuiSlider-markLabel";
      markLabel.dataset.value = String(mark.value);
      markLabel.style.left = left;
      markLabel.textContent = mark.label;
      marksWrap.appendChild(markLabel);
    }
  }

  root.append(rail, track, input, thumb, marksWrap);
  syncSliderVisual(root, value);

  const commitValue = (rawValue) => {
    const snapped = nearestMarkValue(rawValue, marks);
    input.value = String(snapped);
    syncSliderVisual(root, snapped);
    onChange?.(snapped, input, root);
  };

  input.addEventListener("input", () => {
    syncSliderVisual(root, Number(input.value));
  });
  input.addEventListener("change", () => commitValue(input.value));
  input.addEventListener("pointerup", () => commitValue(input.value));
  input.addEventListener("pointercancel", () => commitValue(input.value));

  marksWrap.querySelectorAll(".MuiSlider-markLabel").forEach((label) => {
    if (!(label instanceof HTMLElement)) return;
    label.addEventListener("click", () => {
      if (input.disabled) return;
      commitValue(label.dataset.value);
    });
  });

  return root;
}

export function setSliderValue(slider, value) {
  if (!(slider instanceof HTMLElement)) return;
  const input = findSliderInput(slider);
  if (!input) return;
  const marks = [...slider.querySelectorAll(".MuiSlider-mark")].map((mark) => ({
    value: Number(mark.dataset.value),
  }));
  const snapped = nearestMarkValue(value, marks);
  input.value = String(snapped);
  syncSliderVisual(slider, snapped);
}

export function getSliderValue(slider) {
  const input = findSliderInput(slider);
  if (!input) return 0;
  return Number(input.value);
}

export function setSliderDisabled(slider, disabled) {
  if (!(slider instanceof HTMLElement)) return;
  const input = findSliderInput(slider);
  if (!input) return;
  input.disabled = disabled;
  input.setAttribute("aria-disabled", disabled ? "true" : "false");
  slider.classList.toggle("Mui-disabled", disabled);
}
