import ctypes
import os
import fcntl
import struct

# Define the device file and ioctl command
device_file = "/dev/mpl3115a2"  # Replace with the actual device file path
MPL3115A2_READ = 0x80031601
MPL3115A2_WRITE = 0x40031601
MPL3115A2_OUT_P_MSB = 0x01
MPL3115A2_OUT_P_CSB = 0x02
MPL3115A2_OUT_P_LSB = 0x03

MPL3115A2_OUT_T_MSB = 0x04
MPL3115A2_OUT_T_LSB = 0x05




class MPL3115A2IoctlCmd(ctypes.Structure):
    _fields_ = [
        ("reg_addr", ctypes.c_uint8),
        ("data", ctypes.c_uint8),
        ("output", ctypes.c_uint8),
    ]



def mpl3115a2_read(reg_address):
    # Open the device file
    with open(device_file, 'rb') as device_fd:
        ioctl_data = MPL3115A2IoctlCmd()
        ioctl_data.reg_addr = reg_address
        result = fcntl.ioctl(device_fd, MPL3115A2_READ, ioctl_data)
        return ioctl_data.output
        # Close the device file
   



def mpl3115a2_write(reg_address,data):
    # Open the device file
    with open(device_file, 'r+') as device_fd:
        ioctl_data = MPL3115A2IoctlCmd()
        ioctl_data.reg_addr = reg_address
        ioctl_data.data = data
        result = fcntl.ioctl(device_fd, MPL3115A2_WRITE, ioctl_data)
        return result



def get_temperature():
    #First get the lower byte
    MSB = mpl3115a2_read(MPL3115A2_OUT_T_MSB)
    LSB = mpl3115a2_read(MPL3115A2_OUT_T_LSB) 
    if MSB > 127:
        result = MSB - 256 
        if LSB !=0:
            result-= (1/(LSB >> 4))
    else:
        result = MSB
        if LSB !=0:
            result+= (1/(LSB >> 4))
    return result
    #Then get the upper byte
 

def get_altitude():
    #First get the lower byte
    MSB = mpl3115a2_read(MPL3115A2_OUT_P_MSB)
    CSB = mpl3115a2_read(MPL3115A2_OUT_P_CSB)
    LSB = mpl3115a2_read(MPL3115A2_OUT_P_LSB) 
    MSB = (MSB << 8) | CSB
    if MSB > 32767:
        result = MSB - 32767 
        if LSB !=0:
            result-= (1/(LSB >> 4))
    else:
        result = MSB
        if LSB !=0:
            result+= (1/(LSB >> 4))
    return result
    #Then get the upper byte



