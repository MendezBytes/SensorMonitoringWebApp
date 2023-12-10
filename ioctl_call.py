import ctypes
import os
import fcntl

# Define the device file and ioctl command
device_file = "/dev/mpl3115a2"  # Replace with the actual device file path
MPL3115A2_READ = 0x80031601
MPL3115A2_WRITE = 0x40031601

# Open the device file
device_fd = os.open(device_file, os.O_RDWR)


class MPL3115A2IoctlCmd(ctypes.Structure):
    _fields_ = [
        ("reg_addr", ctypes.c_uint8),
        ("data", ctypes.c_uint8),
        ("output", ctypes.c_uint8),
    ]


ioctl_data = MPL3115A2IoctlCmd()
ioctl_data.reg_addr = 0x0C
ioctl_data.data = 0x00
ioctl_data.output = 0x00

# Call the ioctl
try:
    result = fcntl.ioctl(device_fd, MPL3115A2_READ, ioctl_data)
    print(f"ioctl succeeded. Result: 0x{ioctl_data.output:X}")
except Exception as e:
    print(f"ioctl failed: {e}")

# Close the device file
os.close(device_fd)
