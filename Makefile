.PHONY: setup setup-frontend setup-precommit

setup: setup-precommit setup-frontend
	@echo "✅ Ambiente configurado com sucesso!"

setup-precommit:
	@echo "🔧 Instalando Pre-commit..."
	pip install pre-commit
	pre-commit install --hook-type pre-commit --hook-type commit-msg

setup-frontend:
	@echo "📦 Instalando dependências do Frontend..."
	cd apps/frontend && npm install

run-local:
	@echo "🚀 Subindo ambiente local via Docker Compose..."
	docker-compose up -d