# Use a slim Python base image
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5150

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5150"]
