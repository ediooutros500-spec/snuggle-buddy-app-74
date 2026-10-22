FROM node:22.23.2-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production GATOR_HOST=0.0.0.0 GATOR_PORT=20128
COPY --chown=node:node src ./src
COPY --chown=node:node package.json ./package.json
USER node
EXPOSE 20128
CMD ["node", "src/server.mjs"]
