FROM node:20-alpine AS build

WORKDIR /app

# Accept build-time API URL
ARG VITE_API_URL=http://localhost:8080
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Cloud Run sets PORT environment variable, Nginx templates will replace it
# 8080 is the default if not set
ENV PORT=8080

EXPOSE $PORT

CMD ["nginx", "-g", "daemon off;"]
