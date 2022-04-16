FROM python:3.9

RUN mkdir /data
RUN mkdir /app
WORKDIR /app

RUN apt update -y && apt install -y python3-dev build-essential cmake libpoppler-cpp-dev 
# libpoppler-dev libpoppler102
COPY requirements.txt ./
RUN python3 -m pip install --upgrade pip
RUN pip3 install --no-cache-dir -r requirements.txt 

ENTRYPOINT [ "python3", "/app/serve.py" ]