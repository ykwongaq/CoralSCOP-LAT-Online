import time
import uuid
from typing import Dict, List

from .models.SAM3Model import SAM3Model
from PIL import Image

from .projectHandler import ProjectHandler
from .utils.logger import get_logger
from .utils.path import resolve_path

_logger = get_logger(__name__)


class Server:

    def __init__(self, config: dict):
        self.config = config
        _logger.info("Initializing Server")

        sam3 = SAM3Model(resolve_path(config["sam_model_path"]))
        self.project_handler = ProjectHandler(sam3)

    def get_zip_path(self, token: str) -> str:
        return self.project_handler.get_zip_path(token)

    def gen_token(self) -> str:
        return str(uuid.uuid4())

    def stream_create_project(
        self,
        images: List[Image.Image],
        image_filenames: List[str],
        config: Dict,
    ):
        token = self.gen_token()
        _logger.info(
            "Starting project creation (token=%s, images=%d)", token, len(images)
        )
        return self.project_handler.stream_create_project(
            token, images, image_filenames, config
        )

    def delete_project(self, token: str) -> None:
        _logger.info("Deleting project (token=%s)", token)
        self.project_handler.delete_project(token)
