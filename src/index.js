import { Tooltip } from "https://cdn.jsdelivr.net/npm/bootstrap@5.3.5/+esm";
import imageCompareViewer from "https://cdn.jsdelivr.net/npm/image-compare-viewer@1.6.2/+esm";

function loadConfig() {
  if (localStorage.getItem("darkMode") == 1) {
    document.documentElement.setAttribute("data-bs-theme", "dark");
  }
}

function toggleDarkMode() {
  if (localStorage.getItem("darkMode") == 1) {
    localStorage.setItem("darkMode", 0);
    document.documentElement.setAttribute("data-bs-theme", "light");
  } else {
    localStorage.setItem("darkMode", 1);
    document.documentElement.setAttribute("data-bs-theme", "dark");
  }
}

function initLangSelect() {
  const langSelect = document.getElementById("lang");
  langSelect.onchange = () => {
    const lang = langSelect.options[langSelect.selectedIndex].value;
    location.href = `/lineart-converter/${lang}/`;
  };
}

function initTooltip() {
  for (const node of document.querySelectorAll('[data-bs-toggle="tooltip"]')) {
    const tooltip = new Tooltip(node);
    node.addEventListener("touchstart", () => tooltip.show());
    node.addEventListener("touchend", () => tooltip.hide());
    node.addEventListener("click", () => {
      if (!tooltip.tip) return;
      tooltip.tip.classList.add("d-none");
      tooltip.hide();
      tooltip.tip.classList.remove("d-none");
    });
  }
}

async function getOpenCVPath() {
  const simdSupport = await wasmFeatureDetect.simd();
  const threadsSupport = self.crossOriginIsolated &&
    await wasmFeatureDetect.threads();
  if (simdSupport && threadsSupport) {
    return "/lineart-converter/opencv/threaded-simd/opencv_js.js";
  } else if (simdSupport) {
    return "/lineart-converter/opencv/simd/opencv_js.js";
  } else if (threadsSupport) {
    return "/lineart-converter/opencv/threads/opencv_js.js";
  } else {
    return "/lineart-converter/opencv/wasm/opencv_js.js";
  }
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    script.src = url;
    document.body.appendChild(script);
  });
}

function getTransparentBackgroundImage(size, colors) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  context.fillStyle = colors[0];
  context.fillRect(0, 0, size / 2, size / 2);
  context.fillRect(size / 2, size / 2, size / 2, size / 2);
  context.fillStyle = colors[1];
  context.fillRect(size / 2, 0, size / 2, size / 2);
  context.fillRect(0, size / 2, size / 2, size / 2);
  const url = canvas.toDataURL("image/png");
  return `url(${url})`;
}

function setTransparentCSSVariables() {
  const lightBg = getTransparentBackgroundImage(32, ["#ddd", "#fff"]);
  const darkBg = getTransparentBackgroundImage(32, ["#333", "#212529"]);
  document.documentElement.style.setProperty(
    "--transparent-bg-light",
    lightBg,
  );
  document.documentElement.style.setProperty(
    "--transparent-bg-dark",
    darkBg,
  );
}

async function toBlob(canvas, type, quality) {
  return await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

class Panel {
  constructor(panel) {
    this.panel = panel;
  }

  show() {
    this.panel.classList.remove("d-none");
  }

  hide() {
    this.panel.classList.add("d-none");
  }

  getActualRect(canvas) {
    const canvasWidth = canvas.offsetWidth;
    const canvasHeight = canvas.offsetHeight;
    const naturalWidth = canvas.width;
    const naturalHeight = canvas.height;
    const aspectRatio = naturalWidth / naturalHeight;
    let width, height, top, left, right, bottom;
    if (canvasWidth / canvasHeight > aspectRatio) {
      width = canvasHeight * aspectRatio;
      height = canvasHeight;
      top = 0;
      left = (canvasWidth - width) / 2;
      right = left + width;
      bottom = canvasHeight;
    } else {
      width = canvasWidth;
      height = canvasWidth / aspectRatio;
      top = (canvasHeight - height) / 2;
      left = 0;
      right = canvasWidth;
      bottom = top + height;
    }
    return { width, height, top, left, right, bottom };
  }
}

class LoadPanel extends Panel {
  constructor(panel) {
    super(panel);

    for (const node of document.querySelectorAll(".image-compare")) {
      const images = node.querySelectorAll("img");
      images[0].classList.remove("w-100");
      new imageCompareViewer(node, { addCircle: true }).mount();
      images[1].classList.remove("d-none");
    }
    panel.querySelector(".selectImage").onclick = () => {
      panel.querySelector(".inputImage").click();
    };
    panel.querySelector(".inputImage").onchange = (event) => {
      this.loadInputImage(event);
    };
    const examples = panel.querySelector(".examples");
    if (examples) {
      for (const img of examples.querySelectorAll("img")) {
        img.onclick = () => {
          const url = img.src.replace("-64", "");
          this.loadImage(url);
        };
      }
    }
  }

  show() {
    super.show();
    document.body.scrollIntoView({ behavior: "instant" });
  }

  executeCamera() {
    this.hide();
    cameraPanel.show();
    cameraPanel.executeVideo();
  }

  handleImageOnloadEvent = (event) => {
    const img = event.currentTarget;
    filterPanel.setCanvas(img);
    const filter = filterPanel.currentFilter;
    filterPanel.canvas.classList.add("loading");
    setTimeout(() => {
      filter.apply();
      filterPanel.canvas.classList.remove("loading");
    }, 0);
  };

  loadImage(url) {
    this.hide();
    filterPanel.show();
    const img = new Image();
    img.onload = (event) => this.handleImageOnloadEvent(event);
    img.src = url;
  }

  loadInputImage(event) {
    const file = event.currentTarget.files[0];
    this.loadFile(file);
    event.currentTarget.value = "";
  }

  loadFile(file) {
    if (!file.type.startsWith("image/")) return;
    if (file.type === "image/svg+xml") {
      alert("SVG is not supported.");
      return;
    }
    const url = URL.createObjectURL(file);
    this.loadImage(url);
  }

  async loadClipboardImage() {
    try {
      const items = await navigator.clipboard.read();
      const item = items[0];
      for (const type of item.types) {
        if (type === "image/svg+xml") {
          alert("SVG is not supported.");
        } else if (type.startsWith("image/")) {
          const file = await item.getType(type);
          const url = URL.createObjectURL(file);
          this.loadImage(url);
          break;
        }
      }
    } catch (err) {
      console.error(err);
    }
  }
}

class FilterPanel extends LoadPanel {
  filters = {};

  constructor(panel) {
    super(panel);
    panel.querySelector(".saveClipboard").onclick = async (event) => {
      const svgs = event.currentTarget.children;
      svgs[0].classList.add("d-none");
      svgs[1].classList.remove("d-none");
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": toBlob(this.canvas) }),
      ]);
      setTimeout(() => {
        svgs[0].classList.remove("d-none");
        svgs[1].classList.add("d-none");
      }, 2000);
    };
    panel.querySelector(".loadClipboard").onclick = (event) => {
      this.loadClipboardImage(event);
    };

    this.selectedIndex = 0;
    this.canvas = panel.querySelector("canvas");
    this.canvasContext = this.canvas.getContext("2d", {
      willReadFrequently: true,
    });
    this.offscreenCanvas = document.createElement("canvas");
    this.offscreenCanvasContext = this.offscreenCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    this.canvasContainer = this.canvas.parentNode;

    panel.querySelector(".moveTop").onclick = () => this.moveLoadPanel();
    panel.querySelector(".download").onclick = () => this.download();
    panel.querySelector(".filterSelect").onchange = (event) =>
      this.filterSelect(event);
    this.addFilters(panel);
  }

  show() {
    super.show();
    this.panel.scrollIntoView({ behavior: "instant" });
  }

  moveLoadPanel() {
    this.hide();
    loadPanel.show();
  }

  download() {
    this.canvas.toBlob((blob) => {
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = "lineart.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  filterSelect(event) {
    const options = event.target.options;
    const selectedIndex = options.selectedIndex;
    const prevClass = options[this.selectedIndex].value;
    const currClass = options[selectedIndex].value;
    this.panel.querySelector(`.${prevClass}`).classList.add("d-none");
    this.panel.querySelector(`.${currClass}`).classList.remove("d-none");
    this.selectedIndex = selectedIndex;
    const filter = this.filters[currClass];
    this.currentFilter = filter;
    this.canvas.classList.add("loading");
    setTimeout(() => {
      filter.apply();
      this.canvas.classList.remove("loading");
    }, 0);
  }

  addFilters(panel) {
    this.filtering = false;
    this.addAdaptiveThresholdEvents(panel);
    this.addDilateThresholdEvents(panel);
    this.currentFilter = this.filters.adaptiveThreshold;
  }

  addInputEvents(filter) {
    for (const input of Object.values(filter.inputs)) {
      input.addEventListener("input", () => {
        this.canvas.classList.add("loading");
        setTimeout(() => {
          this.currentFilter.apply();
          this.canvas.classList.remove("loading");
        }, 0);
      });
    }
    for (const node of filter.root.querySelectorAll("button[title=reset]")) {
      node.onclick = () => {
        const rangeInput = node.previousElementSibling;
        rangeInput.value = rangeInput.dataset.value;
        rangeInput.dispatchEvent(new Event("input"));
      };
    }
  }

  addAdaptiveThresholdEvents(panel) {
    const root = panel.querySelector(".adaptiveThreshold");
    this.filters.adaptiveThreshold = {
      root,
      apply: () => {
        this.adaptiveThreshold();
      },
      inputs: {
        blockSize: root.querySelector(".blockSize"),
        C: root.querySelector(".C"),
        dilateIterations: root.querySelector(".dilateIterations"),
      },
    };
    this.addInputEvents(this.filters.adaptiveThreshold);
  }

  addDilateThresholdEvents(panel) {
    const root = panel.querySelector(".dilateThreshold");
    this.filters.dilateThreshold = {
      root,
      apply: () => {
        this.dilateThreshold();
      },
      inputs: {
        threshold: root.querySelector(".threshold"),
        dilateIterations: root.querySelector(".dilateIterations"),
      },
    };
    this.addInputEvents(this.filters.dilateThreshold);
  }

  adaptiveThreshold() {
    const inputs = this.filters.adaptiveThreshold.inputs;
    const minBlockSize = Number(inputs.blockSize.min);
    const blockSize = Number(inputs.blockSize.value);
    const C = Number(inputs.C.value);
    const iterations = Number(inputs.dilateIterations.value);
    if (blockSize === minBlockSize && iterations === 0) {
      this.canvasContext.drawImage(this.offscreenCanvas, 0, 0);
    } else {
      const src = cv.imread(this.offscreenCanvas);
      cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY);
      if (iterations !== 0) {
        const dst = new cv.Mat();
        const M = cv.Mat.ones(3, 3, cv.CV_8U);
        const anchor = new cv.Point(-1, -1);
        cv.dilate(
          src,
          dst,
          M,
          anchor,
          iterations,
          cv.BORDER_CONSTANT,
          cv.morphologyDefaultBorderValue(),
        );
        cv.absdiff(src, dst, src);
        cv.bitwise_not(src, src);
        dst.delete();
        M.delete();
      }
      if (blockSize !== minBlockSize) {
        cv.adaptiveThreshold(
          src,
          src,
          255,
          cv.ADAPTIVE_THRESH_GAUSSIAN_C,
          cv.THRESH_BINARY,
          blockSize * 2 + 1,
          C,
        );
      }
      cv.imshow(this.canvas, src);
      src.delete();
      this.transparentBackground();
    }
  }

  dilateThreshold() {
    const inputs = this.filters.dilateThreshold.inputs;
    const threshold = Number(inputs.threshold.value);
    const iterations = Number(inputs.dilateIterations.value);
    if (threshold === 255 && iterations === 0) {
      this.canvasContext.drawImage(this.offscreenCanvas, 0, 0);
    } else {
      const src = cv.imread(this.offscreenCanvas);
      cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY);
      if (iterations !== 0) {
        const dst = new cv.Mat();
        const M = cv.Mat.ones(3, 3, cv.CV_8U);
        const anchor = new cv.Point(-1, -1);
        cv.dilate(
          src,
          dst,
          M,
          anchor,
          iterations,
          cv.BORDER_CONSTANT,
          cv.morphologyDefaultBorderValue(),
        );
        cv.absdiff(src, dst, src);
        cv.bitwise_not(src, src);
        dst.delete();
        M.delete();
      }
      if (threshold !== 255) {
        cv.threshold(src, src, threshold, 255, cv.THRESH_BINARY);
      }
      cv.imshow(this.canvas, src);
      src.delete();
      this.transparentBackground();
    }
  }

  transparentBackground() {
    const { width, height } = this.canvas;
    const imageData = this.canvasContext.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] === 255) data[i + 3] = 0;
    }
    this.canvasContext.putImageData(imageData, 0, 0);
  }

  setCanvas(canvas) {
    if (canvas.tagName.toLowerCase() === "img") {
      this.canvas.width = canvas.naturalWidth;
      this.canvas.height = canvas.naturalHeight;
      this.offscreenCanvas.width = canvas.naturalWidth;
      this.offscreenCanvas.height = canvas.naturalHeight;
    } else {
      this.canvas.width = canvas.width;
      this.canvas.height = canvas.height;
      this.offscreenCanvas.width = canvas.width;
      this.offscreenCanvas.height = canvas.height;
    }
    this.canvasContext.drawImage(canvas, 0, 0);
    this.offscreenCanvasContext.drawImage(canvas, 0, 0);
  }
}

const filterPanel = new FilterPanel(document.getElementById("filterPanel"));
const loadPanel = new LoadPanel(document.getElementById("loadPanel"));
loadConfig();
initLangSelect();
initTooltip();
setTransparentCSSVariables();
document.getElementById("toggleDarkMode").onclick = toggleDarkMode;
globalThis.ondragover = (event) => {
  event.preventDefault();
};
globalThis.ondrop = (event) => {
  event.preventDefault();
  const file = event.dataTransfer.files[0];
  loadPanel.loadFile(file);
};
globalThis.addEventListener("paste", (event) => {
  const item = event.clipboardData.items[0];
  const file = item.getAsFile();
  if (!file) return;
  loadPanel.loadFile(file);
});

await loadScript(await getOpenCVPath());
cv = await cv();
