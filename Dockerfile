# build-stage
FROM node:22-alpine AS common-build-stage

WORKDIR /app

COPY . .
COPY .env /app/.env

RUN npm install
RUN npm run build

# final-stage
FROM node:22-alpine AS final-build-stage
ENV NODE_ENV=production

WORKDIR /app

COPY --from=common-build-stage ./app/dist ./dist
COPY ["package.json", "package-lock.json", "./"]

RUN npm install

EXPOSE 3003

CMD ["npm", "start"]