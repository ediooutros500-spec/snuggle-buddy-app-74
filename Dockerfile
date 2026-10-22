FROM node:22.23.2-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
RUN npm run build:parent

FROM node:22.23.2-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production GATEWAY_ROLE=central HOST=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.output ./.output
COPY --from=build --chown=node:node /app/scripts/start-parent.mjs ./scripts/start-parent.mjs
USER node
EXPOSE 3000
CMD ["node", "scripts/start-parent.mjs"]
