import sys

def read_in_chunks(file_path):
    with open(file_path, 'r') as f:
        lines = f.readlines()
        for i in range(0, len(lines), 50):
            print("".join(lines[i:i+50]))
            print(f"--- Chunk ending at line {i+50} ---")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        read_in_chunks(sys.argv[1])
