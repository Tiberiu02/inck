import { CanvasManager } from "../CanvasManager";
import { Display } from "../DeviceProps";
import {
  DeserializeGraphic,
  Graphic,
  GraphicTypes,
  PersistentGraphic,
  SerializedGraphic,
  SerializeGraphic,
  Serializers,
  TranslateGraphic,
  TranslatePersistentGraphic,
} from "../Drawing/Graphic";
import { VectorGraphic } from "../Drawing/VectorGraphic";
import { Stroke } from "../Drawing/Stroke";
import { StrokeBuilder } from "../Drawing/StrokeBuilder";
import { PolyLine, UniteRectangles } from "../Math/Geometry";
import { RGB, StrokePoint, Vector3D } from "../types";
import { View } from "../View/View";
import { ActionStack } from "./ActionsStack";
import { SerializedTool, Tool } from "./Tool";
import { BUFFER_SIZE, NUM_LAYERS } from "../Rendering/BaseCanvasManager";
import { RenderLoop } from "../Rendering/RenderLoop";
import { PointerTracker } from "../UI/PointerTracker";
import { NetworkConnection } from "../Network/NetworkConnection";
import { V2, Vector2D } from "../Math/V2";
import { StrokeVectorizer } from "../Drawing/StrokeVectorizer";

const LASSO_ZINDEX = 1;

const LASSO_WIDTH = 0.05; // in
const LASSO_COLOR: RGB = [0.4, 0.6, 1];
const LASSO_COLOR_COLLAB: RGB = [0.4, 0.8, 0.8];

const SHADOW_SIZE = 0.2; // in
const SHADOW_COLOR: RGB = [0.7, 0.9, 1];
const SHADOW_COLOR_COLLAB: RGB = [0.7, 1, 0.9];

export interface SerializedSelection extends SerializedTool {
  readonly selecting: boolean;
  readonly points: StrokePoint[];
  readonly selected: SerializedGraphic[];
  readonly toTranslateBy: Vector2D;
}

export class Selection implements Tool {
  private canvasManager: CanvasManager;
  private actionStack: ActionStack;
  private network: NetworkConnection;
  private lasso: DottedStrokeBuilder;

  private selecting: boolean;
  private points: StrokePoint[];
  private selected: PersistentGraphic[];
  private active: Graphic[];
  private ui: HTMLDivElement;
  private toTranslateBy: Vector2D;

  constructor(canvasManager: CanvasManager, actionStack?: ActionStack, network?: NetworkConnection) {
    this.canvasManager = canvasManager;
    this.actionStack = actionStack;
    this.network = network;
    this.selected = [];
    this.active = [];
    this.points = [];
    this.ui = this.createUI();

    this.toTranslateBy = new Vector2D(0, 0);
  }

  update(x: number, y: number, pressure: number, timestamp: number): void {
    if (pressure) {
      const width = View.getCanvasCoords(Display.DPI() * LASSO_WIDTH, 0, true)[0];
      const color = this.actionStack ? LASSO_COLOR : LASSO_COLOR_COLLAB;

      if (!this.selecting) {
        this.release();

        this.lasso = new DottedStrokeBuilder(color, width);
        this.selecting = true;
        this.points = [];
      }

      this.lasso.push({ x, y, pressure, timestamp });
      this.points.push({ x, y, pressure, timestamp });

      const connector = new StrokeVectorizer(color, width / 3);
      connector.push(this.points[0]);
      connector.push({ x, y, pressure, timestamp });

      this.active = this.lasso.getStrokes().concat([connector.getGraphic(LASSO_ZINDEX)]);
    } else {
      if (this.selecting) {
        this.selecting = false;

        if (this.actionStack) {
          const polygon = new PolyLine(this.points.map(p => new Vector3D(p.x, p.y, 0)));
          this.selected = this.canvasManager.getAll().filter(d => d.geometry.overlapsPoly(polygon));
          this.selected.forEach(d => this.canvasManager.remove(d.id));
          this.network.updateTool(this);
        }

        this.computeShadows();
      }
    }
  }

  private computeShadows() {
    const shadowColor = this.actionStack ? SHADOW_COLOR : SHADOW_COLOR_COLLAB;
    const shadows: Graphic[] = this.selected.map(d => GetShadow(d, shadowColor));
    this.active = OptimizeDrawables(shadows.concat(this.selected.map(s => s.graphic)));
  }

  private createUI(): HTMLDivElement {
    const div = document.createElement("div");
    div.style.position = "fixed";
    div.style.display = "none";
    div.style.outline = `0.05in solid rgba(${LASSO_COLOR.map(c => c * 256)}, 0.8)`;
    div.style.borderRadius = "0.02in";
    div.style.cursor = "move";

    // Moving selection
    let pointer: Vector2D;
    let pointerId: number;
    div.addEventListener("pointerdown", e => {
      pointer = new Vector2D(e.x, e.y);
      pointerId = e.pointerId;
      PointerTracker.pause();
    });
    window.addEventListener("pointermove", e => {
      if (pointer && e.pointerId == pointerId) {
        const newPointer = new Vector2D(e.x, e.y);
        this.translateSelection(V2.sub(newPointer, pointer));
        pointer = newPointer;
      }
    });
    window.addEventListener("pointerup", e => {
      if (pointer && e.pointerId == pointerId) {
        pointer = null;
        this.applyTranslation();
        PointerTracker.unpause();
      }
    });
    document.body.appendChild(div);

    const menu = document.createElement("div");
    menu.style.display = "flex";
    menu.style.flexDirection = "row";
    menu.style.backgroundColor = "rgba(255, 255, 255, 1)";
    menu.style.position = "absolute";
    menu.style.overflow = "hidden";
    menu.style.bottom = "0px";
    menu.style.left = "50%";
    menu.style.transform = "translate(-50%, 50%)";
    menu.style.borderRadius = "9999em";
    menu.style.filter = "drop-shadow(0 2px 13px rgb(0 0 0 / 0.1)) drop-shadow(0 1px 5px rgb(0 0 0 / 0.25))";
    div.appendChild(menu);

    const createBtn = (first: boolean, last: boolean, cb: Function) => {
      const btn = document.createElement("div");
      btn.style.padding = `0.5em ${last ? "1em" : "0.7em"} 0.5em ${first ? "1em" : "0.7em"}`;
      btn.style.cursor = "pointer";
      if (!first) {
        btn.style.borderLeft = "1px solid #aaa";
      }
      menu.appendChild(btn);

      let pressed = false;
      btn.addEventListener("pointerdown", e => {
        e.stopPropagation();
        btn.style.backgroundColor = "rgba(240, 240, 240, 1)";
        pressed = true;
      });
      btn.addEventListener("pointerout", e => {
        btn.style.backgroundColor = "";
        pressed = false;
      });
      btn.addEventListener("pointerup", e => {
        btn.style.backgroundColor = "";
        if (pressed) {
          cb();
          pressed = false;
        }
      });
      return btn;
    };

    const deleteBtn = createBtn(true, false, () => this.deleteSelection());
    deleteBtn.innerHTML = "🗑️&nbsp;Delete";

    const deselectBtn = createBtn(false, true, () => this.release());
    deselectBtn.innerHTML = "❌&nbsp;Deselect";

    return div;
  }

  render(): void {
    this.active.forEach(s =>
      this.canvasManager.addForNextRender(
        s.type == GraphicTypes.VECTOR ? ({ ...s, glUniforms: this.GetUniforms() } as VectorGraphic) : s
      )
    );

    if (this.actionStack) {
      if (this.selected.length) {
        const { x, y } = this.toTranslateBy;
        const box = this.selected.map(d => d.geometry.boundingBox).reduce(UniteRectangles);
        const [x1, y1] = View.getScreenCoords(box.xMin + x, box.yMin + y);
        const [x2, y2] = View.getScreenCoords(box.xMax + x, box.yMax + y);
        const w = SHADOW_SIZE * Display.DPI() * 2;

        this.ui.style.left = `${x1 - w}px`;
        this.ui.style.top = `${y1 - w}px`;
        this.ui.style.width = `${x2 - x1 + 2 * w}px`;
        this.ui.style.height = `${y2 - y1 + 2 * w}px`;
        this.ui.style.display = "";
      } else {
        this.ui.style.display = "none";
      }
    }
  }

  private GetUniforms() {
    return {
      u_AspectRatio: Display.AspectRatio(),
      u_Left: View.getLeft() - this.toTranslateBy.x,
      u_Top: View.getTop() - this.toTranslateBy.y,
      u_Zoom: View.getZoom(),
    };
  }

  release(): void {
    if (this.actionStack) {
      this.network.updateTool(this);
      this.selected.forEach(d => this.canvasManager.add(d));
    }
    this.selected = [];
    this.active = [];
    this.ui.style.display = "none";
    RenderLoop.scheduleRender();
  }

  deleteSelection(): void {
    this.selected = [];
    this.active = [];
    this.network.updateTool(this);
    RenderLoop.scheduleRender();
  }

  translateSelection({ x, y }: Vector2D) {
    [x, y] = View.getCanvasCoords(x, y, true);
    this.toTranslateBy = V2.add(this.toTranslateBy, new Vector2D(x, y));
    RenderLoop.scheduleRender();
  }

  applyTranslation() {
    const { x, y } = this.toTranslateBy;
    this.selected = this.selected.map(d => TranslatePersistentGraphic(d, x, y));
    this.active = this.active.map(d => TranslateGraphic(d, x, y));
    this.toTranslateBy = new Vector2D(0, 0);
  }

  serialize(): SerializedSelection {
    return {
      deserializer: Serializers.SELECTION,
      selecting: this.selecting,
      selected: this.selected.map(SerializeGraphic),
      points: this.points,
      toTranslateBy: { x: this.toTranslateBy.x, y: this.toTranslateBy.y },
    };
  }

  static deserialize(data: SerializedSelection, canvasManager: CanvasManager, actionStack?: ActionStack): Selection {
    const s = new Selection(canvasManager, actionStack);
    s.selecting = data.selecting;
    s.selected = data.selected.map(DeserializeGraphic);
    if (data.selecting) {
      for (const p of data.points) {
        s.update(p.x, p.y, p.pressure, p.timestamp);
      }
    } else {
      s.computeShadows();
    }
    return s;
  }
}

const DOT_LEN = 1;
const BREAK_LEN = 2;
const SP_DIST = 0.1;

class DottedStrokeBuilder {
  private color: RGB;
  private width: number;
  private strokes: Graphic[];
  private currentStroke: StrokeVectorizer;
  private lastPoint: StrokePoint;
  private lastKeyPoint: StrokePoint;
  private isDotting: boolean;
  private timestamp: number;

  constructor(color: RGB, width: number) {
    this.color = color;
    this.width = width;
    this.strokes = [];
  }

  push(p: StrokePoint): void {
    if (!this.lastPoint) {
      this.timestamp = p.timestamp;
      this.lastPoint = this.lastKeyPoint = p;
      this.isDotting = true;
      this.currentStroke = new StrokeVectorizer(this.color, this.width);
      this.currentStroke.push(p);
      return;
    }

    while (V2.dist(p, this.lastPoint) > SP_DIST * this.width) {
      this.push({
        x: (p.x + this.lastPoint.x) / 2,
        y: (p.y + this.lastPoint.y) / 2,
        timestamp: (p.timestamp + this.lastPoint.timestamp) / 2,
        pressure: (p.pressure + this.lastPoint.pressure) / 2,
      });
    }

    if (this.isDotting) {
      if (V2.dist(p, this.lastKeyPoint) <= DOT_LEN * this.width) {
        //this.currentStroke.push(p);
      } else {
        this.currentStroke.push({ ...this.lastPoint, timestamp: this.lastPoint.timestamp + 10 });

        this.strokes = OptimizeDrawables(this.strokes.concat([this.currentStroke.getGraphic(LASSO_ZINDEX)]));
        this.lastKeyPoint = this.lastPoint;
        this.isDotting = false;
      }
    } else {
      if (V2.dist(p, this.lastKeyPoint) > BREAK_LEN * this.width) {
        this.currentStroke = new StrokeVectorizer(this.color, this.width);
        this.currentStroke.push(p);
        this.lastKeyPoint = p;
        this.isDotting = true;
      }
    }

    this.lastPoint = p;
  }

  getStrokes(): Graphic[] {
    return this.strokes.concat(this.isDotting ? [this.currentStroke.getGraphic(LASSO_ZINDEX)] : []);
  }
}

function GetShadow(drawable: PersistentGraphic, shadowColor: RGB): VectorGraphic {
  console.log(drawable);
  if (drawable.serializer == Serializers.STROKE) {
    const s = drawable as Stroke;
    const shadowWidth = View.getCanvasCoords(Display.DPI() * SHADOW_SIZE, 0, true)[0];
    const builder = new StrokeBuilder(
      s.timestamp,
      s.zIndex,
      shadowColor,
      s.width + shadowWidth / (1 + s.zIndex),
      s.points
    );
    return builder.getGraphic();
  }
  return null;
}

function OptimizeDrawables(drawables: Graphic[]): Graphic[] {
  const vectors: VectorGraphic[] = drawables.filter(d => d.type == GraphicTypes.VECTOR) as VectorGraphic[];
  const nonVectors = drawables.filter(d => d.type != GraphicTypes.VECTOR);

  const optimized = [];
  for (let layer = 0; layer < NUM_LAYERS; layer++) {
    const v = vectors.filter(g => g.zIndex == layer);
    if (v.length) {
      let compounded = v[0];
      for (let i = 1; i < v.length; i++) {
        if (compounded.vector.length + v[i].vector.length < BUFFER_SIZE)
          compounded = {
            ...compounded,
            vector: compounded.vector.concat(v[i].vector),
          };
        else {
          optimized.push(compounded);
          compounded = v[i];
        }
      }
      optimized.push(compounded);
    }
  }

  return optimized.concat(nonVectors);
}
