import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

app = FastAPI(title="CoralSCOP-LAT API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def sse_line(payload: dict) -> str:
    """Encode a dict as a single SSE data line (NDJSON format the client expects)."""
    return f"data: {json.dumps(payload)}\n\n"


async def stream_create_project(
    images: list[UploadFile],
    config: dict,
    model: str | None,
):
    """
    Dummy processing pipeline that streams progress events to the client.

    Replace the `await asyncio.sleep(...)` stubs here with real work
    (e.g. saving files, running inference, writing to a database).
    """
    total_steps = len(images) + 1  # one step per image + one finalise step

    print(f"Starting project creation with config: {config} and model: {model}")
    for idx, image in enumerate(images):

        print(f"Received image: {image.filename} ({image.content_type} bytes)")

        # --- stub: read & process the image ---
        _data = await image.read()
        await asyncio.sleep(0.3)  # simulate processing time

        progress = int((idx + 1) / total_steps * 90)  # reserve last 10 % for save
        yield sse_line({"type": "progress", "value": progress})

    # --- stub: finalise project (save to DB, run model, etc.) ---
    await asyncio.sleep(0.5)
    yield sse_line({"type": "progress", "value": 100})

    project_id = str(uuid.uuid4())
    project_name = f"Project {project_id[:8]}"
    created_at = datetime.now(timezone.utc).isoformat()

    yield sse_line(
        {
            "type": "complete",
            "data": {
                "projectId": project_id,
                "name": project_name,
                "createdAt": created_at,
            },
        }
    )


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

    Accepts multipart/form-data with:
      - images  : one or more image files
      - config  : JSON string  { min_area, min_confidence, max_overlap }
      - model   : optional model identifier string

    Streams back NDJSON lines (SSE format):
      data: {"type":"progress","value":25}
      data: {"type":"progress","value":75}
      data: {"type":"complete","data":{projectId, name, createdAt}}
    """
    try:
        config_data: dict = json.loads(config)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="config must be valid JSON")

    return StreamingResponse(
        stream_create_project(images, config_data, model),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable nginx buffering if behind a proxy
        },
    )
