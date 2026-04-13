# MANDATORY CONTEXT FOR GEMINI CLI

## Environment Mandates
- **Backend Environment:** You MUST always use the Conda environment named `webngoaikhoa_fpt_env`.
- **Activation:** Before running any backend command or script, ensure you run `conda activate webngoaikhoa_fpt_env`.
- **Python Path:** Always include the `backend` directory in your `PYTHONPATH`.

## Project Standards
- **Port Management:** The backend MUST run on port `3002`.
- **Database:** Ensure MySQL is running and accessible via the credentials in `backend/.env`.
- **Frontend:** Always use `@/` aliases for imports in the React project.

## Operational Rules
- Never modify the environment name in `start.sh`.
- When restarting the system, always verify that previous processes on ports 3002 and 5173 are terminated.
