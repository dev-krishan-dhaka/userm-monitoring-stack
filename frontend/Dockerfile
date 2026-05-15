FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install


ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL:-http://localhost:5000}

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
