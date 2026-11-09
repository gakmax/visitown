FROM node:20-alpine
WORKDIR /app
COPY server/ ./server/
COPY sdk/ ./sdk/
EXPOSE 8787
CMD ["node", "server/index.js"]
