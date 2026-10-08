import * as THREE from "three";
import type { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { createPointerTracker } from "./pointer-tracker";
import { ShapeGrid, type GridSceneConfig } from "./shape-grid";
import { ThreeStage, attachBloomPipeline } from "./three-stage";

export type FramerGridOptions = GridSceneConfig & {
  bloom?: { strength: number; radius: number; threshold: number };
};

export type FramerGridHandle = {
  three: ThreeStage;
  grid: ShapeGrid;
  bloomPass: UnrealBloomPass;
  dispose: () => void;
};

export function createFramerGrid(canvas: HTMLCanvasElement, options: FramerGridOptions = {}): FramerGridHandle {
  const { bloom, ...gridConfig } = options;

  const stage = new ThreeStage({
    canvas,
    size: "parent",
    rendererOptions: {
      antialias: true,
      stencil: false,
      depth: true,
      alpha: false,
    },
    cameraMaxAspect: 1,
  });
  stage.camera.position.z = 100;
  stage.updateWorldSize();
  stage.scene.add(new THREE.AmbientLight(0xffffff, 0.08));

  const bloomPass = attachBloomPipeline(stage, bloom);

  const grid = new ShapeGrid(stage, gridConfig);
  stage.scene.add(grid);
  grid.resize();
  grid.update({ delta: 0 });
  stage.ensureRendering();

  const pointer = createPointerTracker({ domElement: canvas });
  stage.onBeforeRender = (tick) => {
    const halfW = stage.size.wWidth * 0.5;
    const halfH = stage.size.wHeight * 0.5;
    grid.pointerPosition.x = pointer.nPosition.x * halfW;
    grid.pointerPosition.y = pointer.nPosition.y * halfH;
    grid.update(tick);
  };
  stage.onAfterResize = () => {
    grid.resize();
  };

  return {
    three: stage,
    grid,
    bloomPass,
    dispose() {
      pointer.dispose();
      stage.scene.remove(grid);
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      stage.dispose();
    },
  };
}
