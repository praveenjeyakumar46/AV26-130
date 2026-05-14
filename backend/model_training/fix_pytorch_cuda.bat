@echo off
:: fix_pytorch_cuda.bat
:: Reinstalls PyTorch with CUDA 12.4 support for RTX 4060 + Driver CUDA 13.2

echo ============================================================
echo   PyTorch CUDA Fix — RTX 4060 Laptop
echo ============================================================

set PYTHONUTF8=1
chcp 65001 > nul

echo [step 1] Uninstalling CPU-only PyTorch...
pip uninstall torch torchvision torchaudio -y

echo.
echo [step 2] Installing PyTorch 2.x with CUDA 12.4...
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124

echo.
echo [step 3] Verifying...
python check_cuda.py

echo.
echo [done] If CUDA available = True above, you are ready to train!
pause
