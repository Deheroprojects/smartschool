FROM node:24-bookworm-slim AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY index.html tsconfig.json vite.config.ts ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM python:3.13-slim
WORKDIR /app
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend ./backend
COPY results.py sample_marks.csv ./
COPY --from=frontend /app/dist ./dist
RUN useradd --create-home classroom && mkdir /data && chown classroom:classroom /data
USER classroom
ENV CLASSROOM_DB=/data/classroom.sqlite3
EXPOSE 8000
VOLUME ["/data"]
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
