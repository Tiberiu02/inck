import { CanvasManager } from "../../CanvasManager";
import { Display } from "../../DeviceProps";
import {
  DeserializeGraphic,
  Graphic,
  GraphicTypes,
  PersistentGraphic,
  RotateGraphic,
  RotatePersistentGraphic,
  ScaleGraphic,
  ScalePersistentGraphic,
  SerializedGraphic,
  SerializeGraphic,
  Serializers,
  TranslateGraphic,
  TranslatePersistentGraphic,
} from "../../Drawing/Graphic";
import { VectorGraphic } from "../../Drawing/VectorGraphic";
import { PolyLine, UniteRectangles } from "../../Math/Geometry";
import { RGB, StrokePoint, Vector3D } from "../../types";
import { View } from "../../View/View";
import { RenderLoop } from "../../Rendering/RenderLoop";
import { V2, Vector2D } from "../../Math/V2";
import { StrokeVectorizer } from "../../Drawing/StrokeVectorizer";
import { StrokeBuilder } from "../../Drawing/StrokeBuilder";
import { Stroke } from "../../Drawing/Stroke";
import { DottedStrokeBuilder } from "./DottedStrokeBuilder";
import { OptimizeDrawables } from "../../Rendering/OptimizeDrawables";
import { m4 } from "../../Math/M4";
import { syncBuiltinESMExports } from "module";

const LASSO_ZINDEX = 1;

export const LASSO_COLOR: RGB = [0.4, 0.6, 1];
export const LASSO_WIDTH = 0.05; // in
export const LASSO_CONNECTOR_COLOR: RGB = [0.5, 0.75, 1];

export const SHADOW_COLOR: RGB = [0.7, 0.9, 1];
export const SHADOW_SIZE = 0.2; // in

export class SelectionBase {
  protected canvasManager: CanvasManager;
  protected selecting: boolean;
  protected selected: PersistentGraphic[];
  protected points: StrokePoint[];

  protected toTranslateBy: Vector2D;
  protected toRotateBy: number;
  protected toScaleBy: number;
  protected selectionCenter: Vector2D;

  protected lassoColor: RGB;
  protected lassoConnectorColor: RGB;
  protected shadowColor: RGB;

  private active: Graphic[];
  private lasso: DottedStrokeBuilder;

  constructor(canvasManager: CanvasManager) {
    this.canvasManager = canvasManager;

    this.selected = [];
    this.active = [];
    this.points = [];

    this.toTranslateBy = new Vector2D(0, 0);
    this.toRotateBy = 0;
    this.toScaleBy = 1;
    this.selectionCenter = new Vector2D(0, 0);

    this.lassoColor = LASSO_COLOR;
    this.lassoConnectorColor = LASSO_CONNECTOR_COLOR;
    this.shadowColor = SHADOW_COLOR;
  }

  updateLasso(x: number, y: number, pressure: number, timestamp: number) {
    console.log("updating lasso");
    const width = View.getCanvasCoords(Display.DPI * LASSO_WIDTH, 0, true)[0];

    if (!this.selecting) {
      this.clearSelection();

      this.lasso = new DottedStrokeBuilder(this.lassoColor, width, LASSO_ZINDEX);
      this.selecting = true;
      this.points = [];
    }

    this.lasso.push({ x, y, pressure, timestamp });
    this.points.push({ x, y, pressure, timestamp });

    const connector = new StrokeVectorizer(this.lassoConnectorColor, width / 3);
    connector.push(this.points[0]);
    connector.push({ x, y, pressure, timestamp });

    this.active = this.lasso.getStrokes().concat([connector.getGraphic(LASSO_ZINDEX)]);
    RenderLoop.scheduleRender();
  }

  releaseLasso() {
    // Clear lasso
    this.selecting = false;
    this.active = [];

    // Compute selection
    const polygon = new PolyLine(this.points.map(p => new Vector3D(p.x, p.y, 0)));
    this.selected = this.canvasManager.getAll().filter(d => d.geometry.overlapsPoly(polygon));

    if (this.selected.length) {
      this.computeSelectionCenter();
      this.computeShadows();
    }

    RenderLoop.scheduleRender();
  }

  clearSelection() {
    this.selected = [];
    this.active = [];
    RenderLoop.scheduleRender();
  }

  setTranslation({ x, y }: Vector2D) {
    this.toTranslateBy = new Vector2D(x, y);
    RenderLoop.scheduleRender();
  }

  applyTranslation() {
    const { x, y } = this.toTranslateBy;
    this.selected = this.selected.map(d => TranslatePersistentGraphic(d, x, y));
    this.active = this.active.map(d => TranslateGraphic(d, x, y));
    this.selectionCenter = V2.add(this.selectionCenter, { x, y });
    this.toTranslateBy = new Vector2D(0, 0);
  }

  setRotation(angle: number) {
    this.toRotateBy = angle;
    RenderLoop.scheduleRender();
  }

  applyRotation() {
    this.selected = this.selected.map(d => RotatePersistentGraphic(d, this.toRotateBy, this.selectionCenter));
    this.active = this.active.map(d => RotateGraphic(d, this.toRotateBy, this.selectionCenter));
    this.toRotateBy = 0;
    this.computeSelectionCenter();
    RenderLoop.scheduleRender();
  }

  setScaling(factor: number) {
    this.toScaleBy = factor;
    RenderLoop.scheduleRender();
  }

  applyScaling() {
    this.selected = this.selected.map(d => ScalePersistentGraphic(d, this.toScaleBy, this.selectionCenter));
    this.active = this.active.map(d => ScaleGraphic(d, this.toScaleBy, this.selectionCenter));
    this.toScaleBy = 1;
    RenderLoop.scheduleRender();
  }

  loadSelection(selected: SerializedGraphic[]) {
    this.selected = selected.map(DeserializeGraphic);
    this.computeSelectionCenter();
    this.computeShadows();
  }

  render() {
    const uniforms = !this.selecting && this.GetUniforms();

    this.active.forEach(s =>
      this.canvasManager.addForNextRender(
        s.type == GraphicTypes.VECTOR ? ({ ...s, glUniforms: uniforms } as VectorGraphic) : s
      )
    );
  }

  protected computeShadows() {
    const shadows: Graphic[] = this.selected.map(d => GetShadow(d, this.shadowColor));
    this.active = OptimizeDrawables(shadows.concat(this.selected.map(s => s.graphic)));
  }

  protected computeSelectionCenter() {
    const bBox = this.selected.map(s => s.geometry.boundingBox).reduce(UniteRectangles);
    this.selectionCenter = new Vector2D((bBox.xMin + bBox.xMax) / 2, (bBox.yMin + bBox.yMax) / 2);
  }

  private GetUniforms() {
    const { x: cx, y: cy } = this.selectionCenter;
    const { x, y } = this.toTranslateBy;

    const m = [
      m4.translation(-cx, -cy, 0),
      m4.zRotation(this.toRotateBy),
      m4.scaling(this.toScaleBy, this.toScaleBy, 1),
      m4.translation(cx, cy, 0),
      m4.translation(x, y, 0),
      View.getTransformMatrix(),
    ];

    return {
      u_Matrix: m.reduce((a, b) => m4.multiply(b, a)),
    };
  }
}

function GetShadow(drawable: PersistentGraphic, shadowColor: RGB): VectorGraphic {
  console.log(drawable);
  if (drawable.serializer == Serializers.STROKE) {
    const s = drawable as Stroke;
    const shadowWidth = View.getCanvasCoords(Display.DPI * SHADOW_SIZE, 0, true)[0];
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