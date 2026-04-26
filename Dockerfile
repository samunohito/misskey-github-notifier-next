FROM oven/bun:1.3.13-alpine
ARG UID="880"
ARG GID="880"
RUN addgroup -g "${GID}" notifier && adduser -u "${UID}" -G notifier -D notifier
USER notifier
WORKDIR /home/notifier/misskey-github-notifier-next
COPY --link ./bun.lock .
COPY --link ./package.json .
COPY --link ./tsconfig.json .
RUN bun install --frozen-lockfile
COPY --link ./src ./src
EXPOSE 8080
CMD ["bun", "src/index.ts"]
