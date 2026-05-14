import torch
import sys

print(f"Python        : {sys.version}")
print(f"PyTorch       : {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"CUDA built    : {torch.version.cuda}")
print(f"cuDNN         : {torch.backends.cudnn.version()}")
