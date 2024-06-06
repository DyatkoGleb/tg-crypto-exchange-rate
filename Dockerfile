FROM node:20.9
WORKDIR /usr/src/app

COPY . .

RUN npm install

CMD ["npm", "start"]