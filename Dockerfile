FROM node:22-bookworm-slim AS web-build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM maven:3.9.9-eclipse-temurin-21 AS bot-build
WORKDIR /build
COPY bot/pom.xml ./pom.xml
RUN mvn -q -DskipTests dependency:go-offline
COPY bot/src ./src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:21-jre-jammy AS java-runtime

FROM node:22-bookworm-slim
ENV JAVA_HOME=/opt/java/openjdk
ENV PATH="${JAVA_HOME}/bin:${PATH}"

COPY --from=java-runtime /opt/java/openjdk /opt/java/openjdk

WORKDIR /app
COPY --from=web-build /build/package.json /build/package-lock.json ./
COPY --from=web-build /build/node_modules ./node_modules
COPY --from=web-build /build/dist ./dist
COPY --from=web-build /build/public ./public
COPY --from=web-build /build/.openai ./.openai
COPY --from=web-build /build/next.config.ts /build/vite.config.ts /build/tsconfig.json ./
COPY --from=bot-build /build/target/redline-telegram-bot-1.0.0.jar ./bot.jar
COPY docker/start-container.mjs ./start-container.mjs

RUN mkdir -p /data \
    && chown -R node:node /app /data

USER node
VOLUME ["/data"]
EXPOSE 8080

CMD ["node", "/app/start-container.mjs"]
