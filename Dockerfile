FROM node:18

WORKDIR /app

# Install Python, Nginx, and gettext-base for envsubst
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv nginx gettext-base && \
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

# Debug: list backend/scripts to verify contents
RUN echo "Listing backend/scripts:" && \
    ls -l backend/scripts/ || echo "backend/scripts/ is empty or missing" && \
    mkdir -p /app/backend/scripts && \
    [ -f backend/scripts/holzliste_sort.py ] && cp backend/scripts/holzliste_sort.py /app/backend/scripts/ || echo "holzliste_sort.py not found in backend/scripts/" && \
    ls -l /app/backend/scripts/ || echo "Scripts directory is empty"

# Build frontend, clear default Nginx files, and copy React build files
RUN cd frontend && npm run build && \
    rm -rf /usr/share/nginx/html/* && \
    cp -r build/* /usr/share/nginx/html/ && \
    ls -l /usr/share/nginx/html/  # Debug: list files to verify copy

# Remove default Nginx configuration
RUN rm -f /etc/nginx/sites-enabled/default

# Expose ports (HTTP and backend)
EXPOSE 80
EXPOSE 3001

# Start services
CMD ["/bin/sh", "-c", "envsubst '$BACKEND_PORT' < /etc/nginx/conf.d/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;' & cd /app/backend && npm start"]
