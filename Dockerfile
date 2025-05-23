FROM node:18

WORKDIR /usr/src/app

COPY package*.json ./
COPY . .
COPY wait-for-it.sh /usr/wait-for-it.sh

RUN chmod +x /usr/wait-for-it.sh
RUN npm ci

CMD [ "npm", "run", "startd" ]