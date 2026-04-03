export default function AnnotationCanvas() {
  return (
    <div style={{ position: "relative", flex: 1 }}>
      <div className="canvas-container">
        <canvas id="canvas" className="canvas" />
      </div>
    </div>
  );
}
