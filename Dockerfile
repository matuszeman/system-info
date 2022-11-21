FROM node:19.1.0-alpine3.16
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm i
COPY . .
EXPOSE 3000
CMD [ "npm", "start" ]
