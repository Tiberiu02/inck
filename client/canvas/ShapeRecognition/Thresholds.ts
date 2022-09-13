export abstract class Thresholds {
  /*If the R2 score of the fitted ellipse is lower than this number
    Then detect that the drawn shape is not an ellipse*/
  static readonly MIN_ELLIPSE_R2_THRESHOLD: number = 0.98;
  //If the ratio of the axis of the ellipse (a / b) is smaller than 1.5 then approximate to circle
  static readonly ELLIPSE_TO_CIRCLE_THRESHOLD: number = 1.5;
  //All angles of the quadrialteral need to be in this range to be considered as a rectangle
  static readonly RIGHT_ANGLE_MIN_THRESHOLD_RECT: number = Math.PI / 3; // 60
  static readonly RIGHT_ANGLE_MAX_THRESHOLD_RECT: number = (2 * Math.PI) / 3; // 120
  //If all the rectangle sides have a ratio close to 1.5 then detect that it's a square
  static readonly EQUAL_SIDE_RATIO_THRESHOLD: number = 1.2;
  //If the shape is this far from the axis or more, don't align it
  static readonly ALIGNED_AXIS_THRESHOLD: number = (Math.PI / 180) * 15;
  //If a triangle has an angle in this range then detect that it's a right angle
  static readonly RIGHT_ANGLE_MIN_THRESHOLD_TRI: number = (Math.PI / 180) * 80; // 75
  static readonly RIGHT_ANGLE_MAX_THRESHOLD_TRI: number = (Math.PI / 180) * 100; // 100
}
