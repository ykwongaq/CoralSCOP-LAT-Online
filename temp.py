import cv2
import numpy as np
from PIL import Image
from ultralytics import YOLO

model_path = "backend/checkpoints/CoralTank/best.pt"
model = YOLO(model_path)

image_path = "/home/davidwong/Downloads/coral_tank.png"
image = Image.open(image_path).convert("RGB")

result = model.predict(image, retina_masks=True, classes=[0, 3])[0]
result = result.cpu().numpy()

image_np = np.array(image)
print(image_np.shape)
print(len(result.masks.data))

print(type(result.boxes.cls))
print(result.boxes.cls.shape)

class_list = result.boxes.cls.astype(int).tolist()
print(class_list)
