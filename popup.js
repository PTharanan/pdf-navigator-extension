/**
 * Sequential PDF Navigator - Popup Script
 * Logic to handle user-provided links, automatic URL capture, sequential navigation, and persistence.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const baseUrlInput = document.getElementById('baseUrl');
  const fileNumberInput = document.getElementById('fileNumber');
  const suffixInput = document.getElementById('suffix');
  const paddingInput = document.getElementById('padding');
  const autoNavInput = document.getElementById('autoNav');
  const urlDisplay = document.getElementById('urlText');
  const minToggle = document.getElementById('minToggle');

  const backBtn = document.getElementById('backBtn');
  const nextBtn = document.getElementById('nextBtn');
  const openBtn = document.getElementById('openBtn');

  // Default values
  const defaults = {
    baseUrl: 'https://www.justice.gov/epstein/files/DataSet%201/EFTA',
    lastFileNumber: 1,
    suffix: '.pdf',
    padding: 8,
    autoNav: true,
    compact: false
  };

  /**
   * Smart Parser: Attempts to split a URL into prefix, number, and suffix.
   */
  function parseUrl(url) {
    if (!url || !url.startsWith('http')) return null;

    try {
      // Find the last dot (for extension)
      const lastDotIndex = url.lastIndexOf('.');
      let suffix = '';
      let mainPart = url;

      if (lastDotIndex > url.lastIndexOf('/')) {
        suffix = url.substring(lastDotIndex);
        mainPart = url.substring(0, lastDotIndex);
      }

      // Find the trailing numbers in the main part
      const match = mainPart.match(/(\d+)$/);
      if (match) {
        const numberStr = match[1];
        const prefix = mainPart.substring(0, mainPart.length - numberStr.length);
        return {
          baseUrl: prefix,
          number: parseInt(numberStr, 10),
          padding: numberStr.length,
          suffix: suffix
        };
      }
    } catch (e) {
      console.error("Parsing failed", e);
    }
    return null;
  }

  // 1. Load saved state from storage first
  const storageData = await chrome.storage.local.get(Object.keys(defaults));

  // 2. Try to capture current tab URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const captured = parseUrl(tab?.url);

  if (captured) {
    // If we captured a valid sequential URL, use it as priority
    baseUrlInput.value = captured.baseUrl;
    fileNumberInput.value = captured.number;
    suffixInput.value = captured.suffix;
    paddingInput.value = captured.padding;
  } else {
    // Otherwise use saved storage or defaults
    baseUrlInput.value = storageData.baseUrl ?? defaults.baseUrl;
    fileNumberInput.value = storageData.lastFileNumber ?? defaults.lastFileNumber;
    suffixInput.value = storageData.suffix ?? defaults.suffix;
    paddingInput.value = storageData.padding ?? defaults.padding;
  }

  autoNavInput.checked = storageData.autoNav ?? defaults.autoNav;
  if (storageData.compact) document.body.classList.add('compact');

  /**
   * Generates the target URL based on current inputs.
   */
  function generateUrl() {
    let baseUrl = baseUrlInput.value.trim();
    const currentNumber = parseInt(fileNumberInput.value, 10) || 0;
    const suffix = suffixInput.value.trim();
    const padding = parseInt(paddingInput.value, 10) || 1;

    const paddedNumber = String(currentNumber).padStart(padding, '0');
    return `${baseUrl}${paddedNumber}${suffix}`;
  }

  function navigateToUrl() {
    const targetUrl = generateUrl();
    if (targetUrl) chrome.tabs.update({ url: targetUrl });
  }

  async function updateDisplay() {
    urlDisplay.textContent = generateUrl();
    await chrome.storage.local.set({
      baseUrl: baseUrlInput.value,
      lastFileNumber: parseInt(fileNumberInput.value, 10),
      suffix: suffixInput.value,
      padding: parseInt(paddingInput.value, 10),
      autoNav: autoNavInput.checked
    });
  }

  // Event Listeners
  [baseUrlInput, fileNumberInput, suffixInput, paddingInput, autoNavInput].forEach(el => {
    el.addEventListener('input', updateDisplay);
  });

  minToggle.addEventListener('click', async () => {
    const isCompact = document.body.classList.toggle('compact');
    await chrome.storage.local.set({ compact: isCompact });
  });

  backBtn.addEventListener('click', () => {
    let num = parseInt(fileNumberInput.value, 10) || 0;
    if (num > 0) {
      fileNumberInput.value = num - 1;
      updateDisplay();
      if (autoNavInput.checked) navigateToUrl();
    }
  });

  nextBtn.addEventListener('click', () => {
    let num = parseInt(fileNumberInput.value, 10) || 0;
    fileNumberInput.value = num + 1;
    updateDisplay();
    if (autoNavInput.checked) navigateToUrl();
  });

  openBtn.addEventListener('click', navigateToUrl);

  updateDisplay();
});
