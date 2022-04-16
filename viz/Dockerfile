FROM node:16.14.0

RUN mkdir /data
RUN mkdir /app

RUN npm install -g @angular/cli
WORKDIR /app

ENTRYPOINT [ "bash", "/app/start_dev.sh" ]