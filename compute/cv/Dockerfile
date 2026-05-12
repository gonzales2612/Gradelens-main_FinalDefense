FROM python:3.10-slim

# --- System deps for OpenCV ---
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# --- Workdir ---
WORKDIR /app

# --- Install deps first (layer caching) ---
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- Copy app ---
COPY . .

# --- Environment ---
ENV PYTHONUNBUFFERED=1

# --- Default command (API) ---
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
