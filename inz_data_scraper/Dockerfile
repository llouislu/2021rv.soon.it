FROM python:3.9

RUN mkdir /data
RUN mkdir /app
WORKDIR /app

COPY requirements.txt ./
RUN python3 -m pip install --upgrade pip
RUN pip3 install --no-cache-dir -r requirements.txt 

ENTRYPOINT [ "python3", "/app/serve.py" ]