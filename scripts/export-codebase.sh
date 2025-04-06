#!/bin/bash

# Create timestamp for unique filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
EXPORT_DIR="scripts/exports"
OUTPUT_FILE="$EXPORT_DIR/codebase_export_$TIMESTAMP.txt"
SRC_DIR="src"

# Create exports directory if it doesn't exist
mkdir -p "$EXPORT_DIR"

# Clear output file if it exists
> "$OUTPUT_FILE"

# Generate file tree and add to the beginning of the output file
echo -e "PROJECT DIRECTORY STRUCTURE:\n" >> "$OUTPUT_FILE"

# Try to install tree if not available
if ! command -v tree >/dev/null 2>&1; then
  echo "Tree command not found. Trying to install via Homebrew..."
  if command -v brew >/dev/null 2>&1; then
    brew install tree
  else
    echo "Homebrew not available. Using alternative method."
  fi
fi

# Check if tree command is available now
if command -v tree >/dev/null 2>&1; then
  # Use tree command to generate directory tree
  echo "Using tree command to generate directory structure..." >&2
  tree -I "node_modules|.git|scripts/exports|.next|.cursor|.DS_Store" -a --noreport >> "$OUTPUT_FILE"
else
  # Create directory tree using find and formatted output
  echo "Generating directory tree using find..." >&2
  
  # Print the root
  echo "." >> "$OUTPUT_FILE"
  
  # Find all directories first, excluding node_modules and .git
  find . -type d -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/scripts/exports/*" | sort | while read -r dir; do
    if [ "$dir" != "." ]; then
      # Count directory depth by counting slashes
      depth=$(echo "$dir" | tr -cd '/' | wc -c)
      # Create proper indentation
      indent=""
      for ((i=0; i<depth; i++)); do
        indent="$indent│   "
      done
      # Get the basename of the directory
      name=$(basename "$dir")
      # Print the directory entry
      echo "$indent├── $name/" >> "$OUTPUT_FILE"
    fi
  done
  
  # Then find all files
  find . -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/scripts/exports/*" | sort | while read -r file; do
    # Count file depth by counting slashes
    depth=$(echo "$file" | tr -cd '/' | wc -c)
    # Create proper indentation
    indent=""
    for ((i=0; i<depth; i++)); do
      indent="$indent│   "
    done
    # Get the basename of the file
    name=$(basename "$file")
    # Print the file entry
    echo "$indent├── $name" >> "$OUTPUT_FILE"
  done
fi

# Make sure .env.sample is included if it exists
if [ -f ".env.sample" ] && ! grep -q ".env.sample" "$OUTPUT_FILE"; then
  # Create a temp file with .env.sample added after the root line
  awk 'NR==3 {print "├── .env.sample"} {print}' "$OUTPUT_FILE" > "$OUTPUT_FILE.tmp"
  mv "$OUTPUT_FILE.tmp" "$OUTPUT_FILE"
fi

echo -e "\n" >> "$OUTPUT_FILE"

# If .env.sample exists, add its contents
if [ -f ".env.sample" ]; then
  echo -e "ENVIRONMENT VARIABLES SAMPLE:\n" >> "$OUTPUT_FILE"
  echo -e "```\n$(cat .env.sample)\n```\n" >> "$OUTPUT_FILE"
fi

echo -e "\n\n" >> "$OUTPUT_FILE"

# Function to process each file
process_file() {
  local file=$1
  local rel_path=${file#./}
  
  echo "Processing: $rel_path"
  
  # Add file header with path
  echo -e "\n\n==============================================================\n" >> "$OUTPUT_FILE"
  echo -e "FILE: $rel_path\n" >> "$OUTPUT_FILE"
  echo -e "==============================================================\n" >> "$OUTPUT_FILE"
  
  # Append file content
  cat "$file" >> "$OUTPUT_FILE"
}

# Process .env.sample separately if it exists
if [ -f ".env.sample" ]; then
  process_file ".env.sample"
fi

# Find all files recursively in the src directory, excluding node_modules
find "$SRC_DIR" -type f -not -path "*/node_modules/*" -not -path "*/\.*" | sort | while read -r file; do
  process_file "$file"
done

echo "Export complete. Output saved to $OUTPUT_FILE" 