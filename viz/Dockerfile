FROM node:16.14.0

RUN mkdir /data
RUN mkdir /app

RUN mkdir ~/.npm-global
RUN npm config set prefix '~/.npm-global'
RUN npm cache clean -force

RUN NPM_CONFIG_PREFIX=~/.npm-global npm install -g @angular/cli
WORKDIR /app

ENTRYPOINT [ "bash", "/app/start_dev.sh" ]