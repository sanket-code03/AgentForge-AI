# AgentForge AI
**Plan. Execute. Review.** React + TypeScript + Vite, Java 21 + Spring Boot, MySQL 8, BCrypt/JWT authentication, and local Ollama AI.

## Windows setup
Requirements: Java 21, Maven, Node.js, MySQL 8, and (for real AI) Ollama.

1. Start MySQL. For Docker Desktop: `docker compose up -d mysql`. Otherwise create database `agentforge` and user `agentforge` / password `agentforge_local_password`.
2. Install Ollama from https://ollama.com and run `ollama pull qwen2.5-coder:3b`, then keep Ollama running.
3. In PowerShell:
```powershell
cd AgentForgeAI\backend
$env:JWT_SECRET="replace-this-with-a-long-random-secret-at-least-32-bytes"
mvn spring-boot:run
```
4. Open a second PowerShell:
```powershell
cd AgentForgeAI\frontend
npm install
npm run dev
```
5. Open the Vite URL, usually http://localhost:5173, create an account, sign in, and submit a task.

Backend: http://localhost:8080; health: `/api/health`.

## Included
- Transparent Glassmorphism login/signup pages.
- Real backend registration/login, BCrypt password hashing, signed JWT, protected APIs.
- MySQL-persisted tasks and per-user history.
- Ollama local model call; no paid API key required for local inference.
- Midnight dashboard, Planner/Worker/Reviewer status UI, output copy/download, search link, task history, settings.

## Honest scope
This is a runnable starter, not a finished production platform. The task uses a real Ollama response, but the three-agent stages are an MVP workflow rather than three independently orchestrated autonomous agents. Web search opens a browser search and is not ingested/cited by the backend. MCP, SSE streaming, and secure sandboxed code execution are not implemented. Generated code is never executed by the server. Before public deployment, add HTTPS, rate limiting, email verification/password reset, token revocation/refresh strategy, production secrets management, and security review.
