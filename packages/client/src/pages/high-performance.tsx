import { useEffect, useRef, useState } from "react";

/**
 * BENCHMARK RESULTS:
 * - Lenovo laptop (tiberiu): 0.06ms +- 0.004ms
 * - Samsung S22 Ultra: 0.17ms +- 0.01ms
 */

const vertexSource = `

attribute vec2 a_position;
 
void main() {
   gl_Position = vec4(a_position.x, a_position.y, 0, 1);
}

`;

const fragmentSource = `

precision mediump float;

void main() {
  gl_FragColor = vec4(0, 0, 1, 1);
}

`;

export default function HighPerformanceCanvas() {
  const canvasRef = useRef();
  const [message, setMessage] = useState("write something");

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    const gl = canvas.getContext("webgl", {
      antialias: false,
      preserveDrawingBuffer: true,
      desynchronized: true,
      alpha: false,
    });

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(vertexShader, vertexSource);
    gl.shaderSource(fragmentShader, fragmentSource);

    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error("Failed to compile vertex shader");
      throw new Error(gl.getShaderInfoLog(vertexShader));
    }

    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error("Failed to compile fragment shader");
      throw new Error(gl.getShaderInfoLog(fragmentShader));
    }

    // Create Program
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Failed to link program");
      throw new Error(gl.getProgramInfoLog(program));
    }
    gl.validateProgram(program);
    if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
      console.error("Failed to validate program");
      throw new Error(gl.getProgramInfoLog(program));
    }

    gl.useProgram(program);

    const positionAttributeLocation = gl.getAttribLocation(program, "a_position");

    // Create a buffer.
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Turn on the attribute
    gl.enableVertexAttribArray(positionAttributeLocation);

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    const size = 2; // 2 components per iteration
    const type = gl.FLOAT; // the data is 32bit floats
    const normalize = false; // don't normalize the data
    const stride = 0; // 0 = move forward size * sizeof(type) each iteration to get the next position
    const offset = 0; // start at the beginning of the buffer
    gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);

    let pointerDown = false;
    let x0: number;
    let y0: number;
    let nx0: number;
    let ny0: number;
    let sum = 0,
      sum2 = 0,
      cnt = 0;

    const handlePointerDown = (e: PointerEvent) => {
      pointerDown = true;
      x0 = e.x;
      y0 = e.y;
      nx0 = ny0 = 0;
      gl.clear(gl.COLOR_BUFFER_BIT);
    };
    const handlePointerUp = () => {
      pointerDown = false;
    };
    const handlePointerMove = (e: PointerEvent) => {
      if (pointerDown) {
        const start = performance.now();

        const dx = e.x - x0;
        const dy = e.y - y0;
        const d = Math.sqrt(dx ** 2 + dy ** 2) || 1;
        const nx = (-dy / d) * 2;
        const ny = (dx / d) * 2;

        const data = [
          [x0 - nx0, y0 - ny0],
          [x0 + nx0, y0 + ny0],
          [e.x - nx, e.y - ny],
          [e.x + nx, e.y + ny],
        ].flatMap(([x, y]) => [-1 + (2 * x) / innerWidth, 1 - (2 * y) / innerHeight]);

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);

        const primitiveType = gl.TRIANGLE_STRIP;
        const offset = 0;
        const count = 4;
        gl.drawArrays(primitiveType, offset, count);

        [x0, y0] = [e.x, e.y];
        [nx0, ny0] = [nx, ny];

        const end = performance.now();
        const time = end - start;
        sum += time;
        sum2 += time * time;
        cnt += 1;

        setMessage(`${(sum / cnt).toPrecision(2)}ms +/- ${(sum2 / cnt - (sum / cnt) ** 2).toPrecision(2)}ms`);
      }
    };

    const updateCanvasSize = () => {
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      canvas.width = Math.round(innerWidth * devicePixelRatio);
      canvas.height = Math.round(innerHeight * devicePixelRatio);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const removeHandlers: Function[] = [];

    window.addEventListener("pointerdown", handlePointerDown);
    removeHandlers.push(() => window.removeEventListener("pointerdown", handlePointerDown));
    window.addEventListener("pointerup", handlePointerUp);
    removeHandlers.push(() => window.removeEventListener("pointerup", handlePointerUp));
    window.addEventListener("pointermove", handlePointerMove);
    removeHandlers.push(() => window.removeEventListener("pointermove", handlePointerMove));
    window.addEventListener("resize", updateCanvasSize);
    removeHandlers.push(() => window.removeEventListener("resize", updateCanvasSize));

    updateCanvasSize();

    return () => removeHandlers.forEach((f) => f());
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="touch-none inset-0 bg-black" />
      <p className="fixed inset-0 font-mono text-yellow-300 pointer-events-none">{message}</p>
    </>
  );
}
