import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export type StageSize = {
  width: number;
  height: number;
  ratio: number;
  wWidth: number;
  wHeight: number;
  pixelRatio: number;
};

export type StageTick = { elapsed: number; delta: number };

type StageOptions = {
  canvas: HTMLCanvasElement;
  size?: "parent" | { width: number; height: number };
  rendererOptions?: WebGLRendererParameters;
  cameraMaxAspect?: number;
  cameraMinAspect?: number;
};

export class ThreeStage {
  canvas: HTMLCanvasElement;
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  size: StageSize = {
    width: 0,
    height: 0,
    ratio: 1,
    wWidth: 0,
    wHeight: 0,
    pixelRatio: 1,
  };

  cameraFov: number;
  cameraMinAspect?: number;
  cameraMaxAspect?: number;
  maxPixelRatio?: number;
  minPixelRatio?: number;

  onBeforeRender: (tick: StageTick) => void = () => {};
  onAfterRender: (tick: StageTick) => void = () => {};
  onAfterResize: (size: StageSize) => void = () => {};

  isDisposed = false;

  #composer: EffectComposer | null = null;
  #clock = new THREE.Clock();
  #tick: StageTick = { elapsed: 0, delta: 0 };
  #raf = 0;
  #running = false;
  #visible = false;
  #resizeObserver?: ResizeObserver;
  #intersection?: IntersectionObserver;
  #resizeTimer = 0;
  #lastElapsed = 0;
  #sizeMode: StageOptions["size"];

  constructor(options: StageOptions) {
    this.#sizeMode = options.size ?? "parent";
    this.canvas = options.canvas;
    this.canvas.style.display = "block";
    this.canvas.style.touchAction = "none";

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
    this.cameraFov = this.camera.fov;
    this.cameraMinAspect = options.cameraMinAspect;
    this.cameraMaxAspect = options.cameraMaxAspect;

    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      powerPreference: "high-performance",
      ...options.rendererOptions,
    });
    this.renderer.debug.checkShaderErrors = import.meta.env.DEV;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.shadowMap.enabled = false;

    window.addEventListener("resize", this.#debouncedResize);
    if (this.#sizeMode === "parent" && this.canvas.parentElement) {
      this.#resizeObserver = new ResizeObserver(this.#debouncedResize);
      this.#resizeObserver.observe(this.canvas.parentElement);
    }
    this.#intersection = new IntersectionObserver(
      (entries) => {
        this.#visible = entries[0]?.isIntersecting ?? false;
        if (this.#visible) this.#start();
        else this.#stop();
      },
      { threshold: 0 },
    );
    this.#intersection.observe(this.canvas);
    document.addEventListener("visibilitychange", this.#onVisibility);

    this.resize();
    queueMicrotask(() => {
      if (!this.isDisposed) this.ensureRendering();
    });
  }

  /** Start the RAF loop when the canvas is on screen (also safe to call after scene setup). */
  ensureRendering() {
    if (this.isDisposed) return;
    this.#visible = true;
    this.#start();
  }

  get postprocessing() {
    return this.#composer;
  }

  set postprocessing(composer: EffectComposer | null) {
    this.#composer = composer;
  }

  updateWorldSize() {
    const fov = (this.camera.fov * Math.PI) / 180;
    this.size.wHeight = 2 * Math.tan(fov / 2) * this.camera.position.z;
    this.size.wWidth = this.size.wHeight * this.camera.aspect;
  }

  #debouncedResize = () => {
    window.clearTimeout(this.#resizeTimer);
    this.#resizeTimer = window.setTimeout(() => this.resize(), 100);
  };

  #onVisibility = () => {
    if (!this.#visible) return;
    if (document.hidden) this.#stop();
    else this.#start();
  };

  resize() {
    let width: number;
    let height: number;
    if (this.#sizeMode && typeof this.#sizeMode === "object") {
      width = this.#sizeMode.width;
      height = this.#sizeMode.height;
    } else if (this.#sizeMode === "parent" && this.canvas.parentElement) {
      width = this.canvas.parentElement.offsetWidth;
      height = this.canvas.parentElement.offsetHeight;
    } else {
      width = window.innerWidth;
      height = window.innerHeight;
    }

    this.size.width = width;
    this.size.height = height;
    this.size.ratio = width / height;

    this.camera.aspect = this.size.ratio;
    if (this.cameraMinAspect && this.camera.aspect < this.cameraMinAspect) {
      this.#setFovForAspect(this.cameraMinAspect);
    } else if (this.cameraMaxAspect && this.camera.aspect > this.cameraMaxAspect) {
      this.#setFovForAspect(this.cameraMaxAspect);
    } else {
      this.camera.fov = this.cameraFov;
    }
    this.camera.updateProjectionMatrix();
    this.updateWorldSize();

    this.renderer.setSize(width, height, false);
    this.#composer?.setSize(width, height);

    let dpr = window.devicePixelRatio;
    if (this.maxPixelRatio && dpr > this.maxPixelRatio) dpr = this.maxPixelRatio;
    if (this.minPixelRatio && dpr < this.minPixelRatio) dpr = this.minPixelRatio;
    this.renderer.setPixelRatio(dpr);
    this.size.pixelRatio = dpr;

    this.onAfterResize(this.size);
  }

  #setFovForAspect(targetAspect: number) {
    const halfFov = THREE.MathUtils.degToRad(this.cameraFov / 2);
    const newHalf = Math.tan(halfFov) / (this.camera.aspect / targetAspect);
    this.camera.fov = 2 * THREE.MathUtils.radToDeg(Math.atan(newHalf));
  }

  #render = () => {
    this.#tick.elapsed = this.#clock.getElapsedTime();
    const delta = this.#tick.elapsed - this.#lastElapsed;
    this.#tick.delta = delta;
    this.onBeforeRender(this.#tick);
    if (this.#composer) this.#composer.render();
    else this.renderer.render(this.scene, this.camera);
    this.onAfterRender(this.#tick);
    this.#lastElapsed = this.#tick.elapsed;
    this.#raf = requestAnimationFrame(this.#render);
  };

  #start() {
    if (this.#running || this.isDisposed) return;
    this.#running = true;
    this.#clock.start();
    this.#raf = requestAnimationFrame(this.#render);
  }

  #stop() {
    if (!this.#running) return;
    cancelAnimationFrame(this.#raf);
    this.#running = false;
    this.#clock.stop();
    this.#lastElapsed = 0;
  }

  dispose() {
    if (this.isDisposed) return;
    this.isDisposed = true;
    window.removeEventListener("resize", this.#debouncedResize);
    this.#resizeObserver?.disconnect();
    this.#intersection?.disconnect();
    document.removeEventListener("visibilitychange", this.#onVisibility);
    this.#stop();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry?.dispose();
        const mats = [mesh.material].flat();
        for (const m of mats) {
          if (m && typeof m === "object") {
            for (const v of Object.values(m)) {
              const tex = v as THREE.Texture;
              if (tex?.isTexture) tex.dispose();
            }
            (m as THREE.Material).dispose();
          }
        }
      }
    });
    this.#composer?.dispose();
    this.renderer.dispose();
  }
}

export function attachBloomPipeline(
  stage: ThreeStage,
  bloom?: { strength: number; radius: number; threshold: number },
) {
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(stage.size.width, stage.size.height),
    bloom?.strength ?? 0.1,
    bloom?.radius ?? 0,
    bloom?.threshold ?? 0,
  );
  const composer = new EffectComposer(stage.renderer);
  composer.addPass(new RenderPass(stage.scene, stage.camera));
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
  stage.postprocessing = composer;
  return bloomPass;
}
