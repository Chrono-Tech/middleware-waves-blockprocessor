FROM node:8-slim
ENV NETWORK_TYPE DEFAULT_NETWORK_TYPE
ENV NPM_CONFIG_LOGLEVEL warn
RUN apt update && \
    apt install -y python make g++ git build-essential && \
    npm install -g pm2@2.7.1 chronobank-middleware && \
    mkdir /app
WORKDIR /app
RUN mkdir src
RUN cd src && \
    dmt && \
    middleware-waves-blockprocessor && \
    middleware-waves-balanceprocessor
EXPOSE 8080
CMD pm2-docker start /mnt/config/${NETWORK_TYPE}/ecosystem.config.js