import numpy as np
import torch
from PIL import Image
from sam3.model.sam3_image_processor import Sam3Processor
from sam3.model_builder import build_sam3_image_model

model_path = "./checkpoints/sam3/sam3.pt"
model = build_sam3_image_model(
    checkpoint_path=model_path,
    enable_inst_interactivity=True,
)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.eval().to(device)

processor = Sam3Processor(model)

image_path = "/home/davidwong/Documents/Research/sam3/assets/images/truck.jpg"
with torch.autocast(device.type, dtype=torch.bfloat16):
    image = Image.open(image_path)
    state = processor.set_image(image)

    print(state.keys())

    input_points = np.array([[520, 375]])
    input_labels = np.array([1])

    # [1, H, W], [1], [1, H, W]]
    masks, scores, logits = model.predict_inst(
        state,
        point_coords=input_points,
        point_labels=input_labels,
        multimask_output=True,
    )

    # It is a numpy
    mask_input = logits[np.argmax(scores), :, :]

    print(type(masks), masks.shape)

    input_point = np.array([[500, 375], [1125, 625]])
    input_label = np.array([1, 0])

    mask, score, logit = model.predict_inst(
        state,
        point_coords=input_points,  # [[], [x, y]]
        point_labels=input_labels,  # [[label], [1 or 0]]
        mask_input=mask_input[None, :, :],  # [1, H, W]
        multimask_output=False,
    )

    print(mask.shape, score.shape, logit.shape)
