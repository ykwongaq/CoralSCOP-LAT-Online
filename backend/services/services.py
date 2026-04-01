import json


class Services:

    def __init__(self):
        pass

    def see_line(self, payload: dict) -> str:
        """
        Format a dictionary as a Server-Sent Event (SSE) line.

        The payload is JSON-encoded and prefixed with "data: " as per SSE format.
        """
        json_payload = json.dumps(payload)
        return f"data: {json_payload}\n\n"
