#!/bin/bash -eu

# menu.sh - TUI for listing and executing shell scripts

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Get all shell scripts except this one
scripts=()
for file in "$SCRIPT_DIR"/*.sh; do
    [[ -f "$file" && "$(basename "$file")" != "menu.sh" ]] && scripts+=("$(basename "$file")")
done

[[ ${#scripts[@]} -eq 0 ]] && { echo "No shell scripts found."; exit 1; }

selected=0
max_index=$((${#scripts[@]} - 1))

while true; do
    clear
    echo "Press j/k to navigate, Enter to execute, q to quit"
    echo "=================="
    
    for i in "${!scripts[@]}"; do
        [[ $i -eq $selected ]] && echo "> ${scripts[$i]}" || echo "  ${scripts[$i]}"
    done
    
    printf "\033[999;999H"  # Hide cursor
    
    read -rsn1 key
    
    case "$key" in
        j) [[ $selected -lt $max_index ]] && ((selected++)) ;;
        k) [[ $selected -gt 0 ]] && ((selected--)) ;;
        "") # Enter
            clear
            echo "Executing: ${scripts[$selected]}"
            echo "=========================="
            bash "$SCRIPT_DIR/${scripts[$selected]}"
            echo ""
            echo "Press any key to return to menu..."
            read -rsn1
            ;;
        q) clear; echo "Goodbye!"; exit 0 ;;
    esac
done
