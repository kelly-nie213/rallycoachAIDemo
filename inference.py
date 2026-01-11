import sys

def main():
    if len(sys.argv) < 2:
        print("Error: No input file provided")
        sys.exit(1)
    
    input_file = sys.argv[1]
    # Dummy processing
    print(f"Processing video: {input_file}")
    print("success.done")

if __name__ == "__main__":
    main()
