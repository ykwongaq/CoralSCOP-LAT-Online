import tkinter as tk
from tkinter import filedialog
from PIL import Image, ImageTk


class ImageHoverViewer:
    def __init__(self, root, image_path=None):
        self.root = root
        self.root.title("Image Pixel Coordinate Viewer")

        # Top frame for controls
        top_frame = tk.Frame(root)
        top_frame.pack(fill=tk.X, padx=5, pady=5)

        self.open_btn = tk.Button(top_frame, text="Open Image", command=self.open_image)
        self.open_btn.pack(side=tk.LEFT)

        self.info_label = tk.Label(
            top_frame, text="Hover over the image...", font=("Arial", 12)
        )
        self.info_label.pack(side=tk.LEFT, padx=15)

        # Canvas to display the image
        self.canvas = tk.Canvas(root, bg="gray", cursor="crosshair")
        self.canvas.pack(fill=tk.BOTH, expand=True)

        # Bind mouse events
        self.canvas.bind("<Motion>", self.on_mouse_move)
        self.canvas.bind("<Leave>", self.on_mouse_leave)
        self.canvas.bind("<Button-1>", self.on_click)

        self.pil_image = None
        self.tk_image = None

        if image_path:
            self.load_image(image_path)

        self.classes = [
            "B1",
            "B2",
            "B3",
            "B4",
            "B5",
            "B6",
            "E1",
            "E2",
            "E3",
            "E4",
            "E5",
            "E6",
            "D1",
            "D2",
            "D3",
            "D4",
            "D5",
            "D6",
            "E1",
            "E2",
            "E3",
            "E4",
            "E5",
            "E6",
        ]
        self.counter = 0

    def open_image(self):
        path = filedialog.askopenfilename(
            filetypes=[("Image Files", "*.png *.jpg *.jpeg *.bmp *.gif *.tiff")]
        )
        if path:
            self.load_image(path)

    def load_image(self, path):
        self.pil_image = Image.open(path).convert("RGB")
        self.tk_image = ImageTk.PhotoImage(self.pil_image)

        # Resize canvas to image size
        self.canvas.config(width=self.pil_image.width, height=self.pil_image.height)
        self.canvas.delete("all")
        self.canvas.create_image(0, 0, anchor=tk.NW, image=self.tk_image)
        self.info_label.config(
            text=f"Loaded: {self.pil_image.width} x {self.pil_image.height}"
        )

    def on_mouse_move(self, event):
        if self.pil_image is None:
            return
        x, y = event.x, event.y
        if 0 <= x < self.pil_image.width and 0 <= y < self.pil_image.height:
            r, g, b = self.pil_image.getpixel((x, y))
            self.info_label.config(text=f"X: {x}, Y: {y}  |  RGB: ({r}, {g}, {b})")

    def on_mouse_leave(self, event):
        if self.pil_image is not None:
            self.info_label.config(text="Move your mouse over the image...")

    def on_click(self, event):
        if self.pil_image is None:
            return
        x, y = event.x, event.y
        if 0 <= x < self.pil_image.width and 0 <= y < self.pil_image.height:
            r, g, b = self.pil_image.getpixel((x, y))
            current_class = self.classes[self.counter % len(self.classes)]
            print(f"Class {current_class} at ({x}, {y}))")
            self.counter += 1


if __name__ == "__main__":
    root = tk.Tk()
    # Optionally pass an image path directly: ImageHoverViewer(root, "my_image.png")
    app = ImageHoverViewer(root)
    root.mainloop()
