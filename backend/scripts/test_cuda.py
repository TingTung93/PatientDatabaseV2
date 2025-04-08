import torch
import sys

def test_cuda():
    print(f"Python version: {sys.version}")
    print(f"PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    
    if torch.cuda.is_available():
        print(f"CUDA device: {torch.cuda.get_device_name(0)}")
        print(f"CUDA device count: {torch.cuda.device_count()}")
        
        # Test CUDA tensor operations
        x = torch.rand(5, 3)
        print("\nCPU Tensor:")
        print(x)
        print(f"CPU Tensor device: {x.device}")
        
        x_cuda = x.cuda()
        print("\nCUDA Tensor:")
        print(x_cuda)
        print(f"CUDA Tensor device: {x_cuda.device}")
        
        # Test CUDA memory
        print(f"\nCUDA memory allocated: {torch.cuda.memory_allocated(0) / 1024**2:.2f} MB")
        print(f"CUDA memory cached: {torch.cuda.memory_reserved(0) / 1024**2:.2f} MB")
    else:
        print("CUDA is not available. Please check your installation.")

if __name__ == "__main__":
    test_cuda() 