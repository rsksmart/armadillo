FROM node:10-alpine

RUN apk add --no-cache build-base git python

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . ./
RUN mkdir logs

ENTRYPOINT ["npm", "run"]
