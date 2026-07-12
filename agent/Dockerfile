# Container image for deploying the interviewer worker to LiveKit Cloud
# (free Build plan includes agent hosting): `lk agent create` from this dir.
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET are injected by LiveKit
# Cloud automatically; GOOGLE_API_KEY comes from the agent's secrets.
CMD ["python", "interviewer.py", "start"]
