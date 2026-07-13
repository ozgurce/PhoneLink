const state = {
  token: localStorage.getItem("phoneControlToken") || "",
  devices: [],
  fanGroups: [],
  themes: [],
  effects: [],
  selectedDeviceId: "",
  selectedFanGroupId: "",
  selectedEffectId: "meteor",
  fanMerge: false,
  selectedDirection: 0,
  selectedSpeed: 50,
  brightnessTimer: 0,
  ledBrightnessTimer: 0
};

const els = {
  statusText: document.getElementById("statusText"),
  authPanel: document.getElementById("authPanel"),
  tokenInput: document.getElementById("tokenInput"),
  saveTokenButton: document.getElementById("saveTokenButton"),
  settingsButton: document.getElementById("settingsButton"),
  closeSettingsButton: document.getElementById("closeSettingsButton"),
  settingsModal: document.getElementById("settingsModal"),
  forgetTokenButton: document.getElementById("forgetTokenButton"),
  usePinCheck: document.getElementById("usePinCheck"),
  settingsPinInput: document.getElementById("settingsPinInput"),
  savePinButton: document.getElementById("savePinButton"),
  refreshButton: document.getElementById("refreshButton"),
  deviceSelect: document.getElementById("deviceSelect"),
  fanGroupPanel: document.getElementById("fanGroupPanel"),
  fanGroupSelect: document.getElementById("fanGroupSelect"),
  screenCard: document.getElementById("screenCard"),
  brightnessShell: document.getElementById("brightnessShell"),
  brightnessSlider: document.getElementById("brightnessSlider"),
  brightnessValue: document.getElementById("brightnessValue"),
  brightnessSegments: document.getElementById("brightnessSegments"),
  ledBrightnessShell: document.getElementById("ledBrightnessShell"),
  ledBrightnessSlider: document.getElementById("ledBrightnessSlider"),
  ledBrightnessValue: document.getElementById("ledBrightnessValue"),
  effectSelect: document.getElementById("effectSelect"),
  fanMergeRow: document.getElementById("fanMergeRow"),
  fanMergeCheck: document.getElementById("fanMergeCheck"),
  colorInputs: document.getElementById("colorInputs"),
  colorPalette: document.getElementById("colorPalette"),
  colorSlotHint: document.getElementById("colorSlotHint"),
  applyEffectButton: document.getElementById("applyEffectButton"),
  applyAllFansButton: document.getElementById("applyAllFansButton"),
  ledBrightnessSegments: document.getElementById("ledBrightnessSegments"),
  speedSegments: document.getElementById("speedSegments"),
  speedValue: document.getElementById("speedValue"),
  directionSegments: document.getElementById("directionSegments"),
  directionValue: document.getElementById("directionValue"),
  themesSection: document.getElementById("themesSection"),
  themeGrid: document.getElementById("themeGrid"),
  themeCount: document.getElementById("themeCount"),
  portValue: document.getElementById("portValue"),
  pinModeValue: document.getElementById("pinModeValue"),
  lConnectValue: document.getElementById("lConnectValue"),
  urlList: document.getElementById("urlList"),
  toast: document.getElementById("toast")
};

init();

function init() {
  preventDoubleTapZoom();
  els.tokenInput.value = state.token;
  els.saveTokenButton.addEventListener("click", saveToken);
  els.settingsButton.addEventListener("click", openSettings);
  els.closeSettingsButton.addEventListener("click", closeSettings);
  els.settingsModal.addEventListener("click", event => {
    if (event.target === els.settingsModal) {
      closeSettings();
    }
  });
  els.forgetTokenButton.addEventListener("click", forgetToken);
  els.usePinCheck.addEventListener("change", setUsePin);
  els.savePinButton.addEventListener("click", savePinSetting);
  els.refreshButton.addEventListener("click", refreshAll);
  els.deviceSelect.addEventListener("change", () => {
    state.selectedDeviceId = els.deviceSelect.value;
    handleTargetChanged();
  });
  els.fanGroupSelect.addEventListener("change", () => {
    state.selectedFanGroupId = els.fanGroupSelect.value;
    loadEffects();
  });
  els.fanMergeCheck.addEventListener("change", () => {
    state.fanMerge = els.fanMergeCheck.checked;
    loadEffects();
  });
  els.effectSelect.addEventListener("change", () => {
    state.selectedEffectId = els.effectSelect.value;
    syncEffectColor();
  });
  els.colorInputs.addEventListener("input", event => {
    if (event.target.matches("input[type='color']")) {
      updateAccentFromColors();
    }
  });
  els.colorInputs.addEventListener("click", event => {
    const chip = event.target.closest(".colorChip");
    if (chip) {
      setActiveColorSlot(Number(chip.dataset.index || 0));
    }
  });
  els.colorPalette.addEventListener("click", event => {
    const button = event.target.closest("button[data-color]");
    if (button) {
      setActiveSlotColor(button.dataset.color);
    }
  });
  els.brightnessSlider.addEventListener("input", onBrightnessInput);
  els.brightnessShell.addEventListener("pointerdown", onBrightnessPointer);
  els.ledBrightnessSlider.addEventListener("input", onLedBrightnessInput);
  els.applyEffectButton.addEventListener("click", applyLightingEffect);
  els.applyAllFansButton.addEventListener("click", applyLightingEffectToAllFans);
  renderBrightnessSegments(els.brightnessSegments, Number(els.brightnessSlider.value), setBrightnessFromSegment, true);
  renderBrightnessSegments(els.ledBrightnessSegments, Number(els.ledBrightnessSlider.value), setLedBrightnessFromSegment);
  renderSpeedSegments();
  renderDirectionSegments();
  renderHexPalette();
  updateBrightnessUi(Number(els.brightnessSlider.value));
  updateLedBrightnessUi(Number(els.ledBrightnessSlider.value));
  refreshAll();
}

async function refreshAll() {
  setStatus("Checking L-Connect...");
  els.refreshButton.classList.add("spinning");
  els.refreshButton.disabled = true;
  try {
    const config = await api("/api/config", { auth: false });
    renderConfig(config);
    els.authPanel.classList.toggle("hidden", !config.tokenRequired || Boolean(state.token));
    const status = await api("/api/status");
    els.lConnectValue.textContent = status.online ? `Online (${status.port || "-"})` : "Offline";
    setStatus(status.online ? `L-Connect online on port ${status.port || "-"}` : status.message);
    await loadFanGroups();
    await loadDevices();
  } catch (error) {
    handleError(error);
  } finally {
    els.refreshButton.classList.remove("spinning");
    els.refreshButton.disabled = false;
  }
}

function openSettings() {
  els.settingsModal.classList.remove("hidden");
}

function closeSettings() {
  els.settingsModal.classList.add("hidden");
}

function renderConfig(config) {
  els.portValue.textContent = String(config.port || "-");
  els.pinModeValue.textContent = config.tokenRequired ? "Required" : "Off";
  els.usePinCheck.checked = Boolean(config.usePin ?? config.tokenRequired);
  els.urlList.innerHTML = "";

  for (const url of config.urls || []) {
    const row = document.createElement("a");
    row.href = url;
    row.textContent = url;
    els.urlList.appendChild(row);
  }
}

async function setUsePin() {
  const usePin = els.usePinCheck.checked;
  const token = els.settingsPinInput.value.trim() || state.token;
  if (usePin && !token) {
    els.usePinCheck.checked = false;
    showToast("Enter a PIN first.", true);
    return;
  }

  try {
    const result = await api("/api/config/access", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ usePin, token })
    });
    els.pinModeValue.textContent = result.usePin ? "Required" : "Off";
    els.authPanel.classList.toggle("hidden", !result.usePin || Boolean(state.token));
    showToast(result.usePin ? "PIN enabled." : "PIN disabled.");
    await refreshAll();
  } catch (error) {
    els.usePinCheck.checked = !usePin;
    handleError(error);
  }
}

async function savePinSetting() {
  const token = els.settingsPinInput.value.trim();
  if (!token) {
    showToast("Enter a PIN first.", true);
    return;
  }

  try {
    state.token = token;
    localStorage.setItem("phoneControlToken", state.token);
    els.tokenInput.value = token;
    const result = await api("/api/config/access", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ usePin: els.usePinCheck.checked, token })
    });
    els.pinModeValue.textContent = result.usePin ? "Required" : "Off";
    showToast("PIN saved.");
  } catch (error) {
    handleError(error);
  }
}

async function loadDevices() {
  const devices = await api("/api/devices");
  state.devices = devices;
  els.deviceSelect.innerHTML = "";

  for (const device of devices) {
    const option = document.createElement("option");
    option.value = device.id;
    option.textContent = device.name;
    els.deviceSelect.appendChild(option);
  }

  if (devices.length === 0) {
    els.themeGrid.innerHTML = "";
    els.themeCount.textContent = "0";
    setStatus("No LCD device found.");
    return;
  }

  state.selectedDeviceId = state.selectedDeviceId || devices[0].id;
  els.deviceSelect.value = state.selectedDeviceId;
  await handleTargetChanged();
}

async function loadFanGroups() {
  state.fanGroups = await api("/api/fan-groups");
  renderFanGroups();
}

async function loadEffects() {
  const target = selectedLightingTarget();
  if (target) {
    state.effects = await api(`${target}/lighting/effects${lightingQuery()}`);
  } else {
    state.effects = await api("/api/lighting/effects");
  }

  const current = await loadCurrentLightingState(target);
  if (current?.effect && state.effects.some(effect => effect.id === current.effect)) {
    state.selectedEffectId = current.effect;
  }

  if (!state.effects.some(effect => effect.id === state.selectedEffectId)) {
    state.selectedEffectId = state.effects[0]?.id || "";
  }

  renderEffects();
  if (current) {
    applyCurrentLightingState(current);
  }
}

async function loadCurrentLightingState(target) {
  if (!target || !isFanDeviceSelected()) {
    return null;
  }

  try {
    return await api(`${target}/lighting/current${lightingQuery()}`);
  } catch {
    return null;
  }
}

function lightingQuery() {
  return isFanDeviceSelected() ? `?merge=${state.fanMerge ? "true" : "false"}` : "";
}

function applyCurrentLightingState(current) {
  if (current.effect && state.effects.some(effect => effect.id === current.effect)) {
    state.selectedEffectId = current.effect;
    els.effectSelect.value = current.effect;
  }

  if (Number.isFinite(Number(current.brightness))) {
    const value = snapBrightness(current.brightness);
    els.ledBrightnessSlider.value = String(value);
    updateLedBrightnessUi(value);
  }

  if (Number.isFinite(Number(current.speed))) {
    state.selectedSpeed = snapBrightness(current.speed);
    renderSpeedSegments();
  }

  if (Number.isFinite(Number(current.direction))) {
    state.selectedDirection = Number(current.direction) ? 1 : 0;
    renderDirectionSegments();
  }

  syncEffectColor();
  if (Array.isArray(current.colors) && current.colors.length) {
    setColorInputValues(current.colors);
  }
}

async function handleTargetChanged() {
  const isFanTarget = isFanDeviceSelected();
  els.fanGroupPanel.classList.toggle("hidden", !isFanTarget);
  els.fanMergeRow.classList.toggle("hidden", !isFanTarget);
  els.applyAllFansButton.classList.toggle("hidden", !isFanTarget);
  els.applyEffectButton.textContent = isFanTarget ? "Apply selected group" : "Apply lighting";
  els.fanMergeCheck.checked = state.fanMerge;
  els.screenCard.classList.toggle("hidden", isFanTarget);
  els.themesSection.classList.toggle("hidden", isFanTarget);
  if (!isFanTarget) {
    applyDeviceBrightness(selectedDevice());
  }

  if (isFanTarget) {
    if (!state.fanGroups.length) {
      await loadFanGroups();
    }

    renderFanGroups();
    await loadEffects();
    els.themeGrid.innerHTML = "";
    els.themeCount.textContent = "";
    setStatus(state.fanGroups.length ? "Fan group control ready." : "No wireless fan group found.");
    return;
  }

  await loadEffects();
  await loadThemes();
}

function applyDeviceBrightness(device) {
  const value = Number(device?.screenBrightness ?? 50);
  const brightness = Number.isFinite(value) ? snapBrightness(value) : 50;
  els.brightnessSlider.value = String(brightness);
  updateBrightnessUi(brightness);
}

async function loadThemes() {
  if (!state.selectedDeviceId) {
    return;
  }

  els.themeGrid.innerHTML = "";
  els.themeCount.textContent = "";
  els.themesSection.classList.toggle("screen88Themes", selectedDevice()?.model === "universal-screen-8.8-inch");
  setStatus("Loading themes...");
  const themes = await api(`/api/devices/${encodeURIComponent(state.selectedDeviceId)}/themes`);
  state.themes = themes;
  els.themeCount.textContent = String(themes.length);
  renderThemes();
  setStatus(themes.length ? "Ready" : "No themes found.");
}

function renderFanGroups() {
  els.fanGroupSelect.innerHTML = "";

  for (const group of state.fanGroups) {
    const option = document.createElement("option");
    option.value = group.id;
    option.textContent = `${group.name} - ${group.ledCount} LEDs`;
    els.fanGroupSelect.appendChild(option);
  }

  state.selectedFanGroupId = state.selectedFanGroupId || state.fanGroups[0]?.id || "";
  els.fanGroupSelect.value = state.selectedFanGroupId;
}

function renderThemes() {
  els.themeGrid.innerHTML = "";

  for (const theme of state.themes) {
    const card = document.createElement("article");
    card.className = `themeCard${theme.isSelected ? " selected" : ""}`;

    const imageWrap = document.createElement("div");
    imageWrap.className = "themePreviewWrap";

    const img = document.createElement("img");
    img.className = "themePreview";
    img.alt = "";
    img.loading = "lazy";
    img.src = withToken(theme.previewUrl);
    imageWrap.appendChild(img);

    const button = document.createElement("button");
    button.className = "themeApply";
    button.textContent = theme.isSelected ? "Selected" : "Apply";
    button.disabled = theme.isSelected;
    button.addEventListener("click", () => applyTheme(theme.id, button));

    card.append(imageWrap, button);
    els.themeGrid.appendChild(card);
  }
}

function renderEffects() {
  els.effectSelect.innerHTML = "";

  for (const effect of state.effects) {
    const option = document.createElement("option");
    option.value = effect.id;
    option.textContent = effect.name;
    els.effectSelect.appendChild(option);
  }

  els.effectSelect.value = state.selectedEffectId;
  syncEffectColor();
}

async function applyTheme(themeId, button) {
  button.disabled = true;
  button.textContent = "Applying";
  try {
    const result = await api(`/api/devices/${encodeURIComponent(state.selectedDeviceId)}/apply`, {
      method: "POST",
      body: JSON.stringify({ themeId })
    });
    showToast(result.message || "Theme applied.");
    await loadDevices();
  } catch (error) {
    button.disabled = false;
    button.textContent = "Apply";
    handleError(error);
  }
}

function onBrightnessInput() {
  const value = snapBrightness(els.brightnessSlider.value);
  els.brightnessSlider.value = String(value);
  updateBrightnessUi(value);
  window.clearTimeout(state.brightnessTimer);
  state.brightnessTimer = window.setTimeout(() => setBrightness(value), 180);
}

function onBrightnessPointer(event) {
  event.preventDefault();
  els.brightnessShell.setPointerCapture?.(event.pointerId);
  updateBrightnessFromPointer(event);

  const move = moveEvent => updateBrightnessFromPointer(moveEvent);
  const up = upEvent => {
    els.brightnessShell.releasePointerCapture?.(upEvent.pointerId);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  };

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up, { once: true });
}

function updateBrightnessFromPointer(event) {
  const rect = els.brightnessShell.getBoundingClientRect();
  const raw = 100 - ((event.clientY - rect.top) / rect.height) * 100;
  const value = snapBrightness(raw);
  if (Number(els.brightnessSlider.value) === value) {
    return;
  }

  els.brightnessSlider.value = String(value);
  updateBrightnessUi(value);
  window.clearTimeout(state.brightnessTimer);
  state.brightnessTimer = window.setTimeout(() => setBrightness(value), 120);
}

function updateBrightnessUi(value) {
  els.brightnessValue.textContent = `${value}%`;
  els.brightnessShell.style.setProperty("--brightness", `${value}%`);
  renderBrightnessSegments(els.brightnessSegments, value, setBrightnessFromSegment, true);
}

function onLedBrightnessInput() {
  const value = snapBrightness(els.ledBrightnessSlider.value);
  els.ledBrightnessSlider.value = String(value);
  updateLedBrightnessUi(value);
  window.clearTimeout(state.ledBrightnessTimer);
  state.ledBrightnessTimer = window.setTimeout(() => setLedBrightness(value), 180);
}

function updateLedBrightnessUi(value) {
  els.ledBrightnessValue.textContent = `${value}%`;
  els.ledBrightnessShell.style.setProperty("--level", `${value}%`);
  renderBrightnessSegments(els.ledBrightnessSegments, value, setLedBrightnessFromSegment);
}

function setBrightnessFromSegment(value) {
  els.brightnessSlider.value = String(value);
  updateBrightnessUi(value);
  setBrightness(value);
}

function setLedBrightnessFromSegment(value) {
  els.ledBrightnessSlider.value = String(value);
  updateLedBrightnessUi(value);
  setLedBrightness(value);
}

function snapBrightness(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) / 25) * 25));
}

function renderBrightnessSegments(container, selectedValue, onSelect, reverse = false) {
  container.innerHTML = "";
  const values = reverse ? [100, 75, 50, 25, 0] : [0, 25, 50, 75, 100];
  for (const value of values) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = String(value);
    button.className = value === selectedValue ? "active" : "";
    button.addEventListener("click", () => onSelect(value));
    container.appendChild(button);
  }
}

function renderSpeedSegments() {
  els.speedSegments.innerHTML = "";
  els.speedValue.textContent = `${state.selectedSpeed}%`;
  for (const value of [0, 25, 50, 75, 100]) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = String(value);
    button.className = value === state.selectedSpeed ? "active" : "";
    button.addEventListener("click", () => {
      state.selectedSpeed = value;
      renderSpeedSegments();
    });
    els.speedSegments.appendChild(button);
  }
}

function renderDirectionSegments() {
  els.directionSegments.innerHTML = "";
  const options = [
    { value: 0, label: "Forward" },
    { value: 1, label: "Reverse" }
  ];
  els.directionValue.textContent = options.find(option => option.value === state.selectedDirection)?.label || "Forward";
  for (const option of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option.label;
    button.className = option.value === state.selectedDirection ? "active" : "";
    button.addEventListener("click", () => {
      state.selectedDirection = option.value;
      renderDirectionSegments();
    });
    els.directionSegments.appendChild(button);
  }
}

async function setBrightness(value) {
  if (!state.selectedDeviceId || isFanDeviceSelected()) {
    return;
  }

  try {
    const result = await api(`/api/devices/${encodeURIComponent(state.selectedDeviceId)}/brightness`, {
      method: "POST",
      body: JSON.stringify({ value })
    });
    showToast(result.message || "Brightness updated.");
  } catch (error) {
    handleError(error);
  }
}

async function setLedBrightness(value) {
  const target = selectedLightingTarget();
  if (!target) {
    return;
  }

  try {
    state.selectedEffectId = els.effectSelect.value || state.selectedEffectId;
    const result = await api(`${target}/lighting-effect`, {
      method: "POST",
      body: JSON.stringify({
        effect: state.selectedEffectId,
        brightness: value,
        color: selectedColors()[0],
        colors: selectedColors(),
        speed: state.selectedSpeed,
        direction: state.selectedDirection,
        merge: isFanDeviceSelected() && state.fanMerge
      })
    });
    showToast(`LED brightness set to ${value}.`);
  } catch (error) {
    handleError(error);
  }
}

async function applyLightingEffect() {
  const target = selectedLightingTarget();
  if (!target) {
    return;
  }

  state.selectedEffectId = els.effectSelect.value || state.selectedEffectId;
  els.applyEffectButton.disabled = true;
  try {
    const result = await api(`${target}/lighting-effect`, {
      method: "POST",
      body: JSON.stringify({
        effect: state.selectedEffectId,
        brightness: Number(els.ledBrightnessSlider.value),
        color: selectedColors()[0],
        colors: selectedColors(),
        speed: state.selectedSpeed,
        direction: state.selectedDirection,
        merge: isFanDeviceSelected() && state.fanMerge
      })
    });
    showToast(result.message || "Lighting updated.");
  } catch (error) {
    handleError(error);
  } finally {
    els.applyEffectButton.disabled = false;
  }
}

async function applyLightingEffectToAllFans() {
  if (!isFanDeviceSelected() || !state.selectedFanGroupId) {
    return;
  }

  state.selectedEffectId = els.effectSelect.value || state.selectedEffectId;
  els.applyAllFansButton.disabled = true;
  try {
    const result = await api(`/api/fan-groups/${encodeURIComponent(state.selectedFanGroupId)}/lighting-effect`, {
      method: "POST",
      body: JSON.stringify({
        effect: state.selectedEffectId,
        brightness: Number(els.ledBrightnessSlider.value),
        color: selectedColors()[0],
        colors: selectedColors(),
        speed: state.selectedSpeed,
        direction: state.selectedDirection,
        merge: true,
        applyAll: true
      })
    });
    showToast(result.message || "All TL W groups updated.");
  } catch (error) {
    handleError(error);
  } finally {
    els.applyAllFansButton.disabled = false;
  }
}

function isFanDeviceSelected() {
  return selectedDevice()?.model === "l-wireless-fans";
}

function selectedDevice() {
  return state.devices.find(device => device.id === state.selectedDeviceId);
}

function selectedFanGroup() {
  return state.fanGroups.find(group => group.id === state.selectedFanGroupId);
}

function selectedLightingTarget() {
  if (isFanDeviceSelected()) {
    return state.selectedFanGroupId ? `/api/fan-groups/${encodeURIComponent(state.selectedFanGroupId)}` : "";
  }

  return state.selectedDeviceId ? `/api/devices/${encodeURIComponent(state.selectedDeviceId)}` : "";
}

function syncEffectColor() {
  const effect = state.effects.find(item => item.id === state.selectedEffectId);
  if (effect?.accent) {
    renderColorInputs(effect.accent);
    updateAccentFromColors();
  }
}

function colorSlotCount() {
  const deviceMax = selectedDevice()?.model === "universal-screen-8.8-inch" ? 6 : 4;
  const effect = state.effects.find(item => item.id === state.selectedEffectId);
  if (isFanDeviceSelected() && state.selectedEffectId === "static" && !state.fanMerge) {
    return 4;
  }

  return Math.min(deviceMax, effect?.colorCount ?? effectColorCount(state.selectedEffectId, deviceMax));
}

function effectColorCount(effectId, maxSlots) {
  const count = {
    "static": 1,
    "breathing": 2,
    "runway": 2,
    "meteor": 2,
    "stack": 2,
    "meteor-shower": 2,
    "tide": 2,
    "electric-current": 2,
    "warning": 2,
    "hourglass": 2,
    "echo": 2,
    "heartbeat": 2,
    "rainbow": maxSlots,
    "rainbow-morph": maxSlots,
    "color-cycle": maxSlots,
    "cover-cycle": maxSlots,
    "wave": maxSlots,
    "mop-up": maxSlots,
    "disco": maxSlots,
    "mixing": maxSlots,
    "paint": maxSlots,
    "snooker": maxSlots,
    "volume": maxSlots,
    "blow-up": maxSlots,
    "caterpillar": maxSlots,
    "lollipop": maxSlots,
    "sea-flow": maxSlots,
    "ripple": maxSlots,
    "twinkle": maxSlots
  }[effectId];
  return count || Math.min(2, maxSlots);
}

function renderColorInputs(seedColor) {
  const current = selectedColors();
  const effect = state.effects.find(item => item.id === state.selectedEffectId);
  const fallback = seedColor || effect?.accent || "#ff6b6b";
  const count = colorSlotCount();
  const palette = els.colorInputs.closest(".colorPalette");
  if (palette) {
    palette.classList.toggle("hidden", count === 0);
  }
  els.colorSlotHint.textContent = count > 2 ? `${count} main colors` : `${count} main color${count === 1 ? "" : "s"}`;
  els.colorInputs.innerHTML = "";

  if (count === 0) {
    updateAccentFromColors();
    return;
  }

  for (let index = 0; index < count; index += 1) {
    const label = document.createElement("label");
    label.className = `colorChip${index === 0 ? " active" : ""}`;
    label.dataset.index = String(index);
    label.title = `Color ${index + 1}`;

    const input = document.createElement("input");
    input.type = "color";
    input.value = current[index] || fallback;

    const span = document.createElement("span");
    span.textContent = `C${index + 1}`;

    label.append(input, span);
    els.colorInputs.appendChild(label);
  }
}

function selectedColors() {
  return [...els.colorInputs.querySelectorAll("input[type='color']")].map(input => input.value);
}

function setColorInputValues(colors) {
  const inputs = [...els.colorInputs.querySelectorAll("input[type='color']")];
  if (!inputs.length) {
    return;
  }

  for (let index = 0; index < inputs.length; index += 1) {
    const color = normalizeHexColor(colors[index] || colors[colors.length - 1]);
    if (color) {
      inputs[index].value = color;
    }
  }

  updateAccentFromColors();
}

function normalizeHexColor(color) {
  return /^#[0-9a-fA-F]{6}$/.test(color || "") ? color : "";
}

function updateAccentFromColors() {
  els.ledBrightnessShell.style.setProperty("--accent", selectedColors()[0] || "#28c0b2");
}

function preventDoubleTapZoom() {
  let lastTouchEnd = 0;
  document.addEventListener("touchend", event => {
    const now = Date.now();
    if (now - lastTouchEnd <= 350) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });
}

function setActiveColorSlot(index) {
  for (const chip of els.colorInputs.querySelectorAll(".colorChip")) {
    chip.classList.toggle("active", Number(chip.dataset.index) === index);
  }
}

function setActiveSlotColor(color) {
  const active = els.colorInputs.querySelector(".colorChip.active input") || els.colorInputs.querySelector("input[type='color']");
  if (!active) {
    return;
  }

  active.value = color;
  updateAccentFromColors();
}

function renderHexPalette() {
  const groups = [
    {
      label: "Main",
      colors: ["#ffffff", "#ff0000", "#ff8000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#8000ff", "#ff00ff", "#ff0080"]
    },
    {
      label: "Accent",
      colors: ["#f2f2f7", "#808080", "#000000", "#ffd60a", "#64d2ff", "#5e5ce6", "#bf5af2", "#ff9f0a", "#30d158", "#ff6482"]
    }
  ];

  els.colorPalette.innerHTML = "";
  for (const group of groups) {
    const row = document.createElement("div");
    row.className = "hexPaletteRow";
    const label = document.createElement("span");
    label.textContent = group.label;
    row.appendChild(label);
    for (const color of group.colors) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.color = color;
      button.title = color;
      button.style.setProperty("--swatch", color);
      row.appendChild(button);
    }
    els.colorPalette.appendChild(row);
  }
}

function saveToken() {
  state.token = els.tokenInput.value.trim();
  els.settingsPinInput.value = state.token;
  localStorage.setItem("phoneControlToken", state.token);
  els.authPanel.classList.add("hidden");
  refreshAll();
}

function forgetToken() {
  state.token = "";
  els.tokenInput.value = "";
  localStorage.removeItem("phoneControlToken");
  els.authPanel.classList.remove("hidden");
  showToast("PIN cleared.");
}

async function api(url, options = {}) {
  const auth = options.auth !== false;
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(auth && state.token ? { "X-PhoneControl-Token": state.token } : {})
    },
    body: options.body
  });

  if (response.status === 401) {
    els.authPanel.classList.remove("hidden");
    throw new Error("PIN required.");
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(data.message || data.Message || response.statusText);
  }

  return data;
}

function withToken(url) {
  return state.token ? `${url}${url.includes("?") ? "&" : "?"}t=${encodeURIComponent(state.token)}` : url;
}

function setStatus(message) {
  els.statusText.textContent = message;
}

function showToast(message, isError = false) {
  els.toast.textContent = message;
  els.toast.classList.toggle("error", isError);
  els.toast.classList.remove("hidden");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.add("hidden"), 2600);
}

function handleError(error) {
  setStatus(error.message || "Request failed.");
  showToast(error.message || "Request failed.", true);
}
