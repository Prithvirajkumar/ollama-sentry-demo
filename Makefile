.PHONY: help install setup dev demo build start clean test

help: ## Show this help message
	@echo "Ollama Ecommerce Agent - Available Commands"
	@echo "==========================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	npm install

setup: ## Run interactive setup script
	./setup.sh

dev: ## Start development mode (interactive chat)
	npm run dev

demo: ## Run demo mode (automated demo)
	npm run dev demo

build: ## Build TypeScript to JavaScript
	npm run build

start: ## Start production build
	npm start

clean: ## Clean build artifacts
	rm -rf dist node_modules

check-ollama: ## Check if Ollama is running
	@echo "Checking Ollama..."
	@curl -s http://localhost:11434/api/tags > /dev/null && echo "✅ Ollama is running" || echo "❌ Ollama is not running"

check-model: ## Check if model is available
	@echo "Checking for model..."
	@ollama list | grep -q "llama3.2" && echo "✅ Model llama3.2 is available" || echo "❌ Model not found. Run: ollama pull llama3.2"

pull-model: ## Pull the default model
	ollama pull llama3.2

check-env: ## Verify environment configuration
	@echo "Checking environment..."
	@test -f .env && echo "✅ .env file exists" || echo "❌ .env file not found. Run: make setup"
	@test -n "$$SENTRY_DSN" && echo "✅ SENTRY_DSN is set" || echo "⚠️  SENTRY_DSN not set (monitoring will be disabled)"

verify: check-ollama check-model check-env ## Verify full setup

lint: ## Check for TypeScript errors
	npx tsc --noEmit

example-custom: ## Run custom usage example
	npx tsx examples/custom-usage.ts custom

example-error: ## Run error handling example
	npx tsx examples/custom-usage.ts error

example-direct: ## Run direct client example
	npx tsx examples/custom-usage.ts direct

logs: ## Show Sentry events (requires jq)
	@echo "Recent Sentry events would appear here"
	@echo "Check your Sentry dashboard: https://sentry.io"

.DEFAULT_GOAL := help

