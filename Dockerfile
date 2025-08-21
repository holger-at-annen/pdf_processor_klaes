# Base image with Node.js for building frontend
FROM node:18 AS builder

# Install frontend dependencies
COPY frontend/package.json /app/frontend/package.json
RUN cd /app/frontend && npm install

# Copy frontend source and build
COPY frontend /app/frontend
RUN cd /app/frontend && npm run build

# Install backend dependencies
COPY backend/package.json /app/backend/package.json
RUN cd /app/backend && npm install

# Copy backend source
COPY backend /app/backend

# Production stage
FROM nginx:alpine
COPY --from=builder /app/frontend/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/backend /app/backend

# Install Node.js, Python, and pip
RUN apk add --no-cache nodejs npm python3 py3-pip

# Create and set up virtual environment
RUN python3 -m venv /app/venv

# Ensure pip is up-to-date
RUN /app/venv/bin/pip3 install --no-cache-dir --upgrade pip

# Debug: Print pip and Python versions
RUN /app/venv/bin/pip3 --version
RUN python3 --version
RUN which /app/venv/bin/pip3

# Install Python dependencies
RUN /app/venv/bin/pip3 install --no-cache-dir PyPDF2==3.0.1 pandas openpyxl
RUN /app/venv/bin/pip3 list | grep PyPDF2 || (echo "PyPDF2 installation failed" && exit 1)
RUN /app/venv/bin/pip3 list | grep pandas || (echo "pandas installation failed" && exit 1)
RUN /app/venv/bin/pip3 list | grep openpyxl || (echo "openpyxl installation failed" && exit 1)
RUN /app/venv/bin/pip3 list > /app/pip_list.txt

# Install backend dependencies
RUN cd /app/backend && npm install

# Create uploads directory
RUN mkdir -p /app/backend/uploads

# Expose ports
EXPOSE 80 3001

# Start nginx and backend
CMD ["sh", "-c", "cd /app/backend && npm start & nginx -g 'daemon off;'"]
