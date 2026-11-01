FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Збірка падає одразу, якщо Prophet не може завантажити Stan-бекенд
RUN python -c "from prophet import Prophet; Prophet(); import lightgbm; print('prophet ok')"
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
