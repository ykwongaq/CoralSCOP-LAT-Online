import cv2
import numpy as np
from PIL import Image
from ultralytics import YOLO

model_path = "backend/checkpoints/YOLO11-L/best.pt"
model = YOLO(model_path)

image_path = "/home/davidwong/Downloads/coral_tank.png"
image = Image.open(image_path).convert("RGB")

result = model.predict(image, retina_masks=True)[0]
result = result.cpu().numpy()

image_np = np.array(image)
print(image_np.shape)
for mask in result.masks.data:
    print(mask.shape)
    # Visualize the mask on the image
    color = np.random.randint(0, 255, (1, 3), dtype=np.uint8)
    image_np[mask > 0.5] = color
cv2.imshow("Segmented Image", image_np)
cv2.waitKey(0)
cv2.destroyAllWindows()
