# AI Job & Resume Intelligence Platform
Java 17 · Spring Boot 3 · MySQL · JWT · React (Vite) · Claude API

## Features
- Register / Login (JWT + BCrypt)
- Resume PDF upload -> text extract (PDFBox) -> AI analysis (score, skills, strengths, weaknesses, suggestions, roles)
- Jobs post / list / delete
- AI Match: resume vs job (match %, matched & missing skills, tips)

## Requirements
Java 17+, Maven, Node 18+, MySQL 8 (running), AI API key (https://console.anthropic.com)

## Backend run
```bash
cd backend
export DB_USER=root DB_PASS=your_mysql_password
export AI_API_KEY=your_api_key        # Windows PowerShell: $env:AI_API_KEY="..."
mvn spring-boot:run
```
Database `jobai` khud ban jati hai. Server: http://localhost:8080

## Frontend run
```bash
cd frontend
npm install
npm run dev
```
Browser: http://localhost:5173

## API endpoints
| Method | URL | Auth |
|---|---|---|
| POST | /api/auth/register | no |
| POST | /api/auth/login | no |
| POST | /api/resumes (multipart `file`) | yes |
| GET | /api/resumes | yes |
| DELETE | /api/resumes/{id} | yes |
| GET | /api/jobs | yes |
| POST | /api/jobs | yes |
| DELETE | /api/jobs/{id} | yes (owner) |
| POST | /api/jobs/{id}/match?resumeId= | yes |

## Structure
```
backend/src/main/java/com/jobai/
  config/ SecurityConfig   security/ JwtService, JwtFilter
  model/  User, Resume, Job   repo/ JPA repositories
  service/ AiService (Claude API)   web/ controllers + error handler
frontend/src/  pages/ Auth, Dashboard, Jobs   api.js (axios + JWT)
