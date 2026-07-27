FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline
COPY src src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:21-jre-jammy
RUN groupadd --system redline \
    && useradd --system --gid redline --home-dir /app redline \
    && mkdir -p /app /data \
    && chown -R redline:redline /app /data
WORKDIR /app
COPY --from=build --chown=redline:redline \
  /build/target/redline-telegram-bot-1.0.0.jar /app/app.jar
USER redline
VOLUME ["/data"]
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
