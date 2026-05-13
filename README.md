# CoralSCOP-LAT-Online

A full-stack application for coral image annotation and analysis with segmentation capabilities.

## Project Structure

- **backend/** - FastAPI Python backend with ML models (SAM3, object detection)
- **frontend/** - React + TypeScript frontend with Vite build system

## Prerequisites

- **Backend**: Python 3.8+ with pip
- **Frontend**: Node.js 16+ with npm

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

**Note**: The backend has heavy ML dependencies including PyTorch and SAM3. This may take several minutes to install.

### 2. Download Model Checkpoints

Download the [model checkpoints](https://hkust-vgd.nas.ust.hk:5001/sharing/UqZfBF5jF) and extract them into the `backend/checkpoints/` folder.

### 3. Configuration

Edit `backend/config.json` if needed to configure:
- Model checkpoint paths
- Server host/port settings
- Other backend configurations

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

The frontend will typically start on `http://localhost:5173` and automatically reload on file changes.

### 3. Other Commands

- **Lint**: `npm run lint` - Check code quality
- **Build**: `npm run build` - Create production build (output in `dist/`)
- **Preview**: `npm run preview` - Preview production build locally

## Quick Start

Open **two terminal windows** and run the following:

**Terminal 1 - Backend:**
```bash
cd backend
uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Then open `http://localhost:5173` in your browser. The backend API docs are available at `http://localhost:8000/docs`.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Backend fails to start | Ensure dependencies are installed: `pip install -r requirements.txt`. Check port 8000 is available. |
| Frontend fails to start | Run `npm install` in `frontend/`. Check port 5173 is available. Node.js 16+ required. |
| Checkpoints not found | Download checkpoints from the link and extract to `backend/checkpoints/` |
| Port already in use | Change port in uvicorn command: `--port 9000` (update frontend API calls accordingly) |

## Tech Stack

- **Backend**: Python, FastAPI, PyTorch, SAM3, OpenCV
- **Frontend**: React 19, TypeScript, Vite, React Router, Recharts
