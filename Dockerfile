FROM oven/bun:latest
ARG UID="880"
ARG GID="880"
RUN groupadd -g "${GID}" notifier && useradd -u "${UID}" -g notifier notifier
USER notifier
WORKDIR /home/notifier/misskey-github-notifier-next
COPY --link ./bun.lock .
COPY --link ./package.json .
COPY --link ./tsconfig.json .
RUN bun install --frozen-lockfile
COPY --link ./src ./src
EXPOSE 8080
CMD ["bun", "src/index.js"]
