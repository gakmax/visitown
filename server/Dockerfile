FROM node:22-alpine
WORKDIR /app
COPY server/ ./server/
COPY sdk/ ./sdk/
EXPOSE 8787
USER node
CMD ["node", "server/index.js"]
