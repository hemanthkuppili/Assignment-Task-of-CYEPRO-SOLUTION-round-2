# Build stage
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Production stage
FROM node:22-slim
WORKDIR /app
COPY --from=build /app/package*.json ./
COPY --from=build /app/src ./src
RUN npm install --omit=dev

EXPOSE 3000
CMD ["npm", "start"]
