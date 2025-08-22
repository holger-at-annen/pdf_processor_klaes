FROM node:18

WORKDIR /app

# Install Python and dependencies, including gettext-base for envsubst
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv gettext-base && \
    python3 -m venv /app/venv && \
    /app/venv/bin/pip install PyPDF2 pandas openpyxl

# Copy backend and frontend package files
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install backend and frontend dependencies
RUN cd backend && npm install
RUN cd frontend && npm install

# Copy application code
COPY backend ./backend
COPY frontend ./frontend

# Copy nginx configuration template
COPY nginx.conf.template /etc/nginx/conf.d/nginx.conf.template

# Build frontend
RUN cd frontend && npm run build

# Expose ports (dynamic via environment variables)
EXPOSE 80
EXPOSE 3001

# Start script to substitute environment variables and run services
CMD ["/bin/sh", "-c", "envsubst '$BACKEND_PORT' < /etc/nginx/conf.d/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;' & cd /app/backend && npm start"]
