import base64
import os
from dotenv import load_dotenv

load_dotenv()
key = os.getenv("VAPID_PUBLIC_KEY")
print(f"Key: {key}")
print(f"Length: {len(key)}")

def urlSafeBase64ToBytes(s):
    padding = '=' * (4 - (len(s) % 4))
    return base64.urlsafe_b64decode(s + padding)

try:
    b = urlSafeBase64ToBytes(key)
    print(f"Decoded length: {len(b)}")
    print(f"First byte: {b[0]}")
    if b[0] == 4:
        print("First byte is 0x04 (CORRECT)")
    else:
        print(f"First byte is {b[0]} (INCORRECT, should be 4)")
except Exception as e:
    print(f"Error: {e}")
