import sys
import argparse
import json
from aeroparse.parsers import parse_notam

def main():
    parser = argparse.ArgumentParser(
        description="AeroParse CLI: Instantly parse arcane NOTAMs into structured canonical JSON."
    )
    parser.add_argument(
        "notam_text", 
        nargs="?", 
        help="Raw NOTAM string. If omitted, reads from STDIN."
    )
    parser.add_argument(
        "--file", "-f", 
        help="Path to a text file containing a raw NOTAM."
    )
    parser.add_argument(
        "--pretty", "-p", 
        action="store_true", 
        help="Pretty print the output JSON."
    )
    
    args = parser.parse_args()
    
    raw_text = ""
    if args.file:
        try:
            with open(args.file, "r") as f:
                raw_text = f.read()
        except Exception as e:
            print(f"Error reading file: {e}", file=sys.stderr)
            sys.exit(1)
    elif args.notam_text:
        raw_text = args.notam_text
    else:
        # Read from STDIN
        if not sys.stdin.isatty():
            raw_text = sys.stdin.read()
        else:
            parser.print_help()
            sys.exit(0)
            
    if not raw_text.strip():
        print("Error: No input text provided.", file=sys.stderr)
        sys.exit(1)
        
    try:
        parsed = parse_notam(raw_text)
        # Convert Pydantic object to dictionary
        result = parsed.model_dump()
        
        indent = 4 if args.pretty else None
        print(json.dumps(result, indent=indent))
    except Exception as e:
        print(f"Failed to parse NOTAM: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
