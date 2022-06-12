FROM node:12
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production
COPY dist ./dist
EXPOSE 4445
CMD npm start