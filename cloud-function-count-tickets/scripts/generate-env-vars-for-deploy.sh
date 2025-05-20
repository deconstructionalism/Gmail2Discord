#!/bin/bash

INPUT_FILE=".env"
OUTPUT_FILE=".env.yaml"

if [ ! -f "$INPUT_FILE" ]; then
  echo "❌ Error: $INPUT_FILE not found."
  exit 1
fi

echo "# Auto-generated YAML from .env" > "$OUTPUT_FILE"

while IFS= read -r line || [[ -n "$line" ]]; do
  # Skip blank lines or comments
  [[ "$line" =~ ^[[:space:]]*$ || "$line" =~ ^[[:space:]]*# ]] && continue

  # Split only on the first '=' to preserve values with '='
  key=$(echo "$line" | cut -d '=' -f1 | xargs)
  value=$(echo "$line" | cut -d '=' -f2-)

  # Remove surrounding quotes if present
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"

  # Escape inner double quotes
  value=$(printf '%s' "$value" | sed 's/"/\\"/g')

  # Output to YAML
  echo "$key: \"$value\"" >> "$OUTPUT_FILE"
done < "$INPUT_FILE"

echo "✅ Converted $INPUT_FILE to $OUTPUT_FILE"