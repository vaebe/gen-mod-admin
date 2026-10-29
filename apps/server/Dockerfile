FROM oven/bun:1
WORKDIR /app/apps/server
COPY apps/server/package.json ./
RUN bun install --production
COPY apps/server/src ./src
COPY packages/contracts/src/index.ts /app/packages/contracts/src/index.ts
ENV HOST=0.0.0.0 PORT=8787 DATABASE_PATH=/data/gen-mod.sqlite
EXPOSE 8787
CMD ["bun", "run", "src/index.ts"]
