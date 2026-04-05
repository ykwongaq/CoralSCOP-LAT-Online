import asyncio
import io
import json
import os
import threading
from typing import Annotated, Optional

import numpy as np
from fastapi import (
    BackgroundTasks,
    FastAPI,
    File,
    Form,
    HTTPException,
    Response,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from PIL import Image
from server import server
from server.server import (
    DecodeMasksRequest,
    DecodeMasksResponse,
    EncodeMaskRequest,
    EncodeMaskResponse,
    PredictInstRequest,
    PredictInstResponse,
)
from server.utils.logger import get_logger

# Get the directory where this script is located
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
config_path = os.path.join(_SCRIPT_DIR, "config.json")

_logger = get_logger(__name__)

with open(config_path, "r") as f:
    config = json.load(f)

_logger.info("Loaded config from %s", config_path)

_server = server.Server(config)
app = FastAPI(title="CoralSCOP-LAT API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Streaming helpers (private to this module)
# ---------------------------------------------------------------------------


def _sse_line(payload: dict) -> str:
    """Encode a dict as a single SSE data line."""
    return f"data: {json.dumps(payload)}\n\n"


async def _drain_and_cleanup(q: asyncio.Queue) -> None:
    """
    Consume remaining queue events after the SSE generator is abandoned
    (e.g. client disconnected mid-stream). Calls delete_project if the
    worker eventually finishes successfully so no temp files are left behind.
    """
    while True:
        event = await q.get()
        if event is None:
            break
        if event.get("type") == "done":
            _server.delete_project(event["token"])
            break


async def _stream_project(
    pil_images: list[Image.Image],
    filenames: list[str],
    config_data: dict,
):
    """
    Run the sync project-creation generator in a background thread and
    re-emit its events as SSE-formatted strings.

    The sync generator is CPU-bound (ML inference), so it must not run on
    the event loop thread.  An asyncio.Queue bridges the worker → async generator.
    """
    loop = asyncio.get_running_loop()
    q: asyncio.Queue = asyncio.Queue()

    def worker() -> None:
        try:
            for event in _server.stream_create_project(
                pil_images, filenames, config_data
            ):
                asyncio.run_coroutine_threadsafe(q.put(event), loop)
        except Exception as exc:
            asyncio.run_coroutine_threadsafe(
                q.put({"type": "error", "message": str(exc)}), loop
            )
        finally:
            asyncio.run_coroutine_threadsafe(q.put(None), loop)  # sentinel

    threading.Thread(target=worker, daemon=True).start()

    ownership_transferred = False
    last_event: dict = {}

    try:
        while True:
            last_event = await q.get()
            if last_event is None:
                break

            if last_event["type"] == "error":
                yield _sse_line({"type": "error", "message": last_event["message"]})
                break

            if last_event["type"] == "done":
                ownership_transferred = True
                yield _sse_line(
                    {"type": "complete", "data": {"downloadToken": last_event["token"]}}
                )
                break

            yield _sse_line(last_event)

    finally:
        if not ownership_transferred:
            loop.create_task(_drain_and_cleanup(q))


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.post("/api/projects")
async def create_project(
    images: Annotated[list[UploadFile], File()],
    config: Annotated[str, Form()],
    model: Annotated[str | None, Form()] = None,
):
    """
    Create a new project.

    Accepts multipart/form-data:
      - images  : one or more image files
      - config  : JSON string  { min_area, min_confidence, max_overlap }
      - model   : optional model identifier (CoralSCOP | CoralTank)

    Streams SSE lines:
      data: {"type":"progress","value":25,"message":"Processing img.jpg (1/4)"}
      data: {"type":"progress","value":95,"message":"Packaging project file"}
      data: {"type":"complete","data":{"downloadToken":"<token>"}}
      data: {"type":"error","message":"<reason>"}   (on failure)
    """
    try:
        config_data: dict = json.loads(config)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="config must be valid JSON")

    pil_images: list[Image.Image] = []
    filenames: list[str] = []
    for idx, upload in enumerate(images):
        try:
            contents = await upload.read()
            image = Image.open(io.BytesIO(contents)).convert("RGB")
            pil_images.append(image)
            filenames.append(upload.filename or f"image_{idx}.jpg")
        except Exception as exc:
            raise HTTPException(
                status_code=422,
                detail=f"Failed to read image '{upload.filename}': {exc}",
            )

    config_data["model"] = model

    return StreamingResponse(
        _stream_project(pil_images, filenames, config_data),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable nginx buffering if behind a proxy
        },
    )


@app.get("/api/projects/download/{token}")
async def download_project(token: str, background_tasks: BackgroundTasks):
    """
    One-time download of the .coral file produced by a completed project creation.
    The temporary file is deleted after the response is sent.
    """
    zip_path = _server.get_zip_path(token)
    if not os.path.exists(zip_path):
        raise HTTPException(
            status_code=404, detail="Project not found or already downloaded"
        )

    background_tasks.add_task(_server.delete_project, token)
    return FileResponse(
        path=zip_path,
        filename=os.path.basename(zip_path),
        media_type="application/octet-stream",
    )


@app.delete("/api/projects/delete/{token}", status_code=204)
async def cancel_project(token: str):
    """
    Discard a pending .coral file without downloading it.
    Cleans up the temporary files immediately.
    """
    zip_path = _server.get_zip_path(token)
    if not os.path.exists(zip_path):
        raise HTTPException(
            status_code=404, detail="Project not found or already downloaded"
        )

    _server.delete_project(token)


# ---------------------------------------------------------------------------
# Mask encode / decode endpoints
# ---------------------------------------------------------------------------


@app.post("/api/masks/decode", response_model=DecodeMasksResponse)
async def decode_masks(request: DecodeMasksRequest):
    """
    Decode one or more COCO compressed RLE masks into flat row-major pixel arrays.

    Each element of the response `masks` list is a base64-encoded byte string
    where every byte is 0 (background) or 1 (foreground), in row-major (C) order:
    index = row * width + col.

    Accepts:
        {"masks": [{"size": [height, width], "counts": "<RLE string>"}, ...]}

    Returns:
        {"masks": ["<base64>", ...]}
    """
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _server.decode_masks, request)


@app.post("/api/masks/encode", response_model=EncodeMaskResponse)
async def encode_mask(request: EncodeMaskRequest):
    """
    Encode a flat row-major pixel array into a COCO compressed RLE mask.

    Accepts:
        {
            "mask":   "<base64>",   // flat row-major bytes (0 or 1 per pixel)
            "height": <int>,
            "width":  <int>
        }

    Returns:
        {"segmentation": {"size": [height, width], "counts": "<RLE string>"}}
    """
    return _server.encode_mask(request)


# ---------------------------------------------------------------------------
# SAM interactive inference endpoints
# ---------------------------------------------------------------------------


@app.post("/api/sam/sessions")
async def create_sam_session():
    """
    Create a new SAM embedding session.

    Returns:
        {"session_id": "<uuid>"}

    The returned session_id must be passed to subsequent embedding uploads
    and to POST /api/sam/predict.  Sessions are evicted automatically after
    3 hours of inactivity, or immediately via DELETE /api/sam/sessions/{session_id}.
    """
    session_id = _server.create_embedding_session()
    return {"session_id": session_id}


@app.post("/api/sam/sessions/{session_id}/embeddings/{stem}", status_code=204)
async def upload_embedding(session_id: str, stem: str, file: UploadFile = File(...)):
    """
    Upload a single .pt embedding file into an existing session.

    Path parameters:
      - session_id : UUID returned by POST /api/sam/sessions
      - stem       : image filename without extension (e.g. "DSC_0001")

    Body: multipart/form-data with a single field ``file`` containing the
    raw .pt bytes produced by ``torch.save(state)``.
    """
    data = await file.read()
    _server.save_embedding(session_id, stem, data)
    return Response(status_code=204)


@app.delete("/api/sam/sessions/{session_id}", status_code=204)
async def delete_sam_session(session_id: str):
    """
    Delete a SAM session and all its stored embeddings immediately.
    Safe to call even if the session has already been evicted.
    """
    _server.delete_embedding_session(session_id)
    return Response(status_code=204)


@app.post("/api/sam/predict", response_model=PredictInstResponse)
async def predict_inst(request: PredictInstRequest):
    """
    Run SAM interactive instance segmentation.

    Accepts JSON body:
      - session_id   : UUID returned by POST /api/sam/sessions
      - stem         : image filename stem (must have been uploaded via
                       POST /api/sam/sessions/{session_id}/embeddings/{stem})
      - input_points : array of [x, y] pairs, e.g. [[100,200],[300,400]]
      - input_labels : array of ints (1=foreground, 0=background per point)
      - mask_input   : optional base64-encoded .npy bytes [1, 256, 256] float32
                       (pass best_mask_logit from the previous response)

    Returns:
        {
            "masks":          [{"size": [H, W], "counts": "<RLE>"}, ...],
            "best_mask_logit": "<base64 .npy bytes [1, 256, 256] float32>"
        }
    """
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _server.predict_inst, request)
