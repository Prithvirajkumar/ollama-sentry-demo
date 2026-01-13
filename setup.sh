#!/bin/bash

# Ollama Ecommerce Agent Setup Script

set -e

echo "🚀 Ollama Ecommerce Agent Setup"
echo "================================"
echo ""

# Check Node.js
echo "Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d 'v' -f 2)
MAJOR_VERSION=$(echo $NODE_VERSION | cut -d '.' -f 1)
MINOR_VERSION=$(echo $NODE_VERSION | cut -d '.' -f 2)

if [ "$MAJOR_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Current: $(node --version)"
    exit 1
fi

echo "✅ Node.js $(node --version)"

# Check for Sentry ESM compatibility (Node.js 18.19.0+ or 20.6.0+)
if [ "$MAJOR_VERSION" -eq 18 ] && [ "$MINOR_VERSION" -lt 19 ]; then
    echo "⚠️  Node.js 18.19.0+ recommended for Sentry ESM support (you have $NODE_VERSION)"
    echo "   App will work but you may see warnings. To upgrade: n 18.19.0"
elif [ "$MAJOR_VERSION" -eq 20 ] && [ "$MINOR_VERSION" -lt 6 ]; then
    echo "⚠️  Node.js 20.6.0+ recommended for Sentry ESM support (you have $NODE_VERSION)"
    echo "   App will work but you may see warnings. To upgrade: n 20.6.0"
fi
echo ""

# Check Ollama
echo "Checking Ollama..."

# Check if ollama is in PATH
if ! command -v ollama &> /dev/null; then
    # Check if Ollama.app is installed on macOS
    if [ -f "/Applications/Ollama.app/Contents/Resources/ollama" ]; then
        echo "⚠️  Ollama is installed but not in PATH"
        echo "   Creating symlink..."
        
        # Try to create symlink
        if sudo ln -sf /Applications/Ollama.app/Contents/Resources/ollama /usr/local/bin/ollama 2>/dev/null; then
            echo "✅ Ollama linked to /usr/local/bin/ollama"
        else
            echo "⚠️  Could not create symlink automatically."
            echo "   Please run: sudo ln -s /Applications/Ollama.app/Contents/Resources/ollama /usr/local/bin/ollama"
            echo "   Or add this to your ~/.zshrc:"
            echo "   export PATH=\"/Applications/Ollama.app/Contents/Resources:\$PATH\""
            exit 1
        fi
    else
        echo "❌ Ollama is not installed."
        echo "   Visit: https://ollama.ai/"
        echo ""
        read -p "Would you like to open the Ollama website? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            open "https://ollama.ai/" 2>/dev/null || xdg-open "https://ollama.ai/" 2>/dev/null || echo "Please visit: https://ollama.ai/"
        fi
        exit 1
    fi
fi

# Verify ollama works
OLLAMA_VERSION=$(ollama --version 2>&1 | head -n 1 || echo "unknown")
echo "✅ Ollama $OLLAMA_VERSION"
echo ""

# Install dependencies
echo "Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Check for .env file
if [ ! -f .env ]; then
    echo "📝 Setting up environment configuration..."
    echo ""
    
    # Prompt for Sentry DSN
    read -p "Enter your Sentry DSN (or press Enter to skip for now): " SENTRY_DSN
    
    # Prompt for Ollama model
    echo ""
    echo "Available models (common choices):"
    echo "  - llama3.2 (recommended - good balance)"
    echo "  - llama3.2:1b (faster, smaller)"
    echo "  - llama3.1 (more capable, slower)"
    echo ""
    read -p "Enter Ollama model [llama3.2]: " OLLAMA_MODEL
    OLLAMA_MODEL=${OLLAMA_MODEL:-llama3.2}
    
    # Create .env file
    cat > .env << EOF
# Sentry Configuration
SENTRY_DSN=${SENTRY_DSN}

# Ollama Configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=${OLLAMA_MODEL}

# Ecommerce Store Configuration
ECOMMERCE_BASE_URL=https://application-monitoring-react-dot-sales-engineering-sf.appspot.com
ECOMMERCE_SE_PARAM=prithvi
EOF
    
    echo "✅ Created .env file"
    echo ""
else
    echo "✅ .env file already exists"
    echo ""
fi

# Check if model is available
source .env
echo "Checking if model '$OLLAMA_MODEL' is available..."
if ! ollama list | grep -q "$OLLAMA_MODEL"; then
    echo "⚠️  Model '$OLLAMA_MODEL' not found locally."
    echo ""
    read -p "Would you like to pull it now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Pulling $OLLAMA_MODEL (this may take a few minutes)..."
        ollama pull "$OLLAMA_MODEL"
        echo "✅ Model pulled successfully"
    else
        echo "⚠️  Remember to pull the model before running: ollama pull $OLLAMA_MODEL"
    fi
else
    echo "✅ Model '$OLLAMA_MODEL' is available"
fi
echo ""

# Summary
echo "================================"
echo "✅ Setup Complete!"
echo "================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Run the demo:"
echo "   npm run dev demo"
echo ""
echo "2. Or start interactive mode:"
echo "   npm run dev"
echo ""
echo "3. View monitoring data in Sentry:"
echo "   https://sentry.io/organizations/your-org/projects/"
echo ""
echo "For more information, see:"
echo "  - QUICKSTART.md (5-minute guide)"
echo "  - README.md (full documentation)"
echo ""
echo "Happy coding! 🎉"

