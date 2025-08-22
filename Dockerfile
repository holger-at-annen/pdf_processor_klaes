FROM node:18

WORKDIR /app

RUN apt-get update && apt-get install -y python3 python3-pip python3-venv nginx gettext-base && \
    python3 -m venv /app/venv && \
    /app/venv/bin/pip install PyPDF2 pandas openpyxl

COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

RUN cd backend && npm install
RUN cd frontend && npm install

COPY backend ./backend
COPY frontend ./frontend

COPY nginx.conf.template /etc/nginx/conf.d/nginx.conf.template

# Debug: Verify backend/scripts/ contents and copy to /app/backend/scripts/
RUN echo "Listing build context root:" && ls -l . && \
    echo "Listing backend/:" && ls -l backend/ && \
    echo "Listing backend/scripts/:" && ls -l backend/scripts/ || echo "backend/scripts/ is empty or missing" && \
    mkdir -p /app/backend/scripts && \
    [ -f backend/scripts/holzliste_sort.py ] && cp backend/scripts/holzliste_sort.py /app/backend/scripts/ || echo "holzliste_sort.py not found in backend/scripts/" && \
    echo "Listing /app/backend/scripts/:" && ls -l /app/backend/scripts/ || echo "Scripts directory is empty"

RUN cd frontend && npm run build && \
    rm -rf /usr/share/nginx/html/* && \
    cp -r build/* /usr/share/nginx/html/ && \
    ls -l /usr/share/nginx/html/

RUN rm -f /etc/nginx/sites-enabled/default

EXPOSE 80
EXPOSE 3001

CMD ["/bin/sh", "-c", "envsubst '$BACKEND_PORT' < /etc/nginx/conf.d/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;' & cd /app/backend && npm start"]
