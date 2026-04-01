from typing import Any, Dict
from project.projectCreator import ProjectCreator


class Server:

    def __init__(self, config: dict):
        self.config = config
        self.project_creator = ProjectCreator(config)
